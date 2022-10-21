(ns aural-training.db
    (:require [clj-time.coerce :as c]
              [clojure.data.json :as json]
              [clojure.java.jdbc :as jdbc]
              [clojure.string :as string]
              [hikari-cp.core :refer [close-datasource make-datasource]]
              [honeysql-postgres.format :refer [override-default-clause-priority]]
              [honeysql.core :as sql]
              [medley.core :refer [map-vals]]
              [postgre-types.json :refer [add-jsonb-type]]
              [aural-training.config :as config])
    (:import org.postgresql.jdbc.PgArray))

;; needed so that returning clauses work from other namespaces
(override-default-clause-priority)

(defonce ^:dynamic *conn* nil)
(defonce ^:dynamic *transaction-query-cache* nil)

(def default-config {:adapter           "postgresql"
                     :minimum-idle      4
                     :maximum-pool-size 10
                     :username          config/db-user
                     :password          config/db-password
                     :database-name     config/db-name
                     :server-name       config/db-host
                     :port-number       config/db-port})


;; (close-datasource @default-conn)
;; reopen:
;; (set-db-conn! default-config)
(defonce default-conn (atom nil))

(defn set-db-conn!
  [spec]
  (when-not (nil? @default-conn)
    (close-datasource @default-conn))
  (reset! default-conn
          (make-datasource spec)))

(defn init-db-conn!
  []
  (set-db-conn! default-config))

(defn set-db-name!
  [db-name]
  (set-db-conn! (assoc default-config :database-name db-name)))

(defn set-db-port!
  [port]
  (set-db-conn! (assoc default-config :port-number (str port))))

;; Add JDBC conversion methods for Postgres jsonb type
(add-jsonb-type
 (fn [x]
   (json/write-str x :key-fn #(-> % (string/replace "-" "_") keyword)))
 (fn [x]
   (json/read-str x :key-fn #(-> % (string/replace "_" "-") keyword))))

(defn to-sql-array
  "Convert a Clojure sequence to a PostgreSQL array object.
  `psql-col-type` is the SQL type of the array elements."
  [psql-col-type elts]
  (jdbc/with-db-transaction [conn {:datasource @default-conn}]
    (.createArrayOf (:connection conn) psql-col-type (into-array elts))))

(defn vector->psql-array [v]
  (let [el            (first v)
        types         (mapv type v)
        putative-type (first types)
        all-same?     (every? #(= % putative-type) types)
        psql-col-type (cond (= putative-type java.lang.String)
                            "text"
                            (int? el)
                            "integer"
                            :else (throw (Exception. (str "Error inserting value " v " as PSQL array. Type of array element is unknown. See protocol extension of jdbc/ISQLValue for clojure.lang.PersistentVector"))))]
    (if all-same?
      (to-sql-array psql-col-type v)
      (throw (Exception. (str "Error inserting value " v " as PSQL array. Type of array elements are inconsistent. All types must be the same when inserting arrays. See protocol extension of jdbc/ISQLValue for clojure.lang.PersistentVector"))))))

;;; Add org.joda.time.DateTime
(extend-protocol jdbc/ISQLValue
  org.joda.time.DateTime
  (sql-value [v]
    (c/to-sql-time v))
  java.util.Date
  (sql-value [v]
    (c/to-sql-time v)))

(extend-protocol jdbc/IResultSetReadColumn
  PgArray
  (result-set-read-column [pgobj _metadata _index]
    (into [] (.getArray pgobj)))
  java.sql.Timestamp
  (result-set-read-column [pgobj _metadata _index]
    (partial c/from-sql-time)))

(defn sql-cast [x sql-type]
  (sql/call :cast x sql-type))

(defn map->jsonb [x]
  ;; don't convert to jsonb if `x` is a honeysql function call
  (if (and (map? x)
           (= (set (keys x))
              (set [:name :args])))
    x
    (sql-cast (clojure.data.json/write-str x) :jsonb)))

;; http://tech.toryanderson.com/posts/honeysql-postgres-json/
(defn pg->
  "Postgres json -> operator"
  [parent fieldkey]
  (sql/raw (str (name parent) "->'" (name fieldkey) "'")))

;; http://tech.toryanderson.com/posts/honeysql-postgres-json/
(defn pg->>
  "Postgres json ->> operator"
  [parent fieldkey]
  (sql/raw (str (name parent) "->>'" (name fieldkey) "'")))

;;ex: (-> (select :hash) (from :entity) (where [:<> (db/pg->> :meta :pmid) nil]) db/honeysql-query)
(defn prepare-honeysql-map
  "Converts map values to jsonb strings as needed."
  [m]
  (let [mapvals-to-psql-type
        (partial map-vals
                 #(cond (map? %)
                        (map->jsonb %)

                        (vector? %)
                        (vector->psql-array %)

                        :else %))]
    (cond-> m
      (contains? m :set)
      (update :set mapvals-to-psql-type)
      (contains? m :values)
      (update :values (partial mapv mapvals-to-psql-type)))))

(defn sql-identifier-to-clj
  "Convert an SQL keyword or string identifier to Clojure format by
  replacing all '_' with '-', returning a string."
  [identifier]
  (-> identifier name string/lower-case (string/replace "_" "-")))

(defn- query
  [query & [conn]]
  (jdbc/with-db-connection [conn (or conn {:datasource @default-conn})]
    ;;query
    (jdbc/query (or *conn* conn) query
                {:identifiers sql-identifier-to-clj})))

(defn honeysql->sql [honeysql]
  (-> honeysql
      (prepare-honeysql-map)
      (sql/format)))

(defn honeysql-query
  [honeysql-query & [conn]]
  (-> honeysql-query
      honeysql->sql
      (query conn)))

(defn execute!
  [query & [conn]]
  (jdbc/with-db-connection [conn (or conn {:datasource @default-conn})]
    (jdbc/execute! (or *conn* conn) query
                   {:identifiers sql-identifier-to-clj})))

(defn honeysql-execute!
  [honeysql-query & [conn]]
  (-> honeysql-query prepare-honeysql-map (sql/format :quoting :ansi) (execute! conn)))

(defn sql-now
  "Query current time from database."
  []
  (jdbc/with-db-connection [conn {:datasource @default-conn}]
    (-> (jdbc/query conn "SELECT LOCALTIMESTAMP AS TIMESTAMP")
        first :timestamp)))

(defn raw-query
  "Run a raw sql query for when there is no HoneySQL implementation of a SQL feature"
  [raw-sql & [conn]]
  (jdbc/with-db-connection [conn (or conn {:datasource @default-conn})]
    (jdbc/query conn
                raw-sql
                {:identifiers sql-identifier-to-clj
                 :result-set-fn vec})))

(defn from-sql-array
  "Convert a PostgreSQL array object into a Clojure vector"
  [sql-array]
  (.getArray sql-array))

(defn any-column-with-value
  "A where equality check statement for honeysql. Return all results where value is in array column"
  [column value]
  [:= value (sql/call :any column)])
