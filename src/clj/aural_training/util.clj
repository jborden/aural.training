(ns aural-training.util
  (:require [camel-snake-kebab.core :as csk]
            [camel-snake-kebab.extras :as cske]
            [clojure.java.io :as io]
            [clojure.main :refer [demunge]]
            [clojure.string :as str]
            [clojure.walk :as walk]
            [medley.core :as medley]
            [aural-training.time :as time]))

(defn deep-find
  "In an arbitrarily nested coll, return the all items which satisfy pred"
  [pred coll]
  (let [result (atom nil)]
    (walk/postwalk (fn [x] (if (pred x) (swap! result conj x) x)) coll)
    @result))

;; see http://stackoverflow.com/questions/14412132/best-approach-for-generating-api-key
;; see https://docs.oracle.com/javase/6/docs/api/java/util/UUID.html#randomUUID()
(defn uuid [] (str/replace (str (java.util.UUID/randomUUID)) #"-" ""))

(defn in?
  "Tests if `coll` contains an element equal to `x`. With one argument `coll`,
  returns the function #(in? coll %). Delegates to `contains?` for
  efficiency if `coll` is a set."
  ([coll x] (if (set? coll)
              (contains? coll x)
              (some #(= x %) coll)))
  ([coll] #(in? coll %)))

(defn string->kw
  "Convert a string `kw` into a proper clojure `keyword`"
  [k]
  (-> k
      str/lower-case
      (str/replace #"\s" "-")
      keyword))

(defmacro current-function-name
  "Returns a string, the name of the current Clojure function."
  []
  `(-> (Throwable.) .getStackTrace first .getClassName demunge))

(defn log-message [current-fn message]
  (println "[" (str (time/now-log) "] " current-fn ": " message)))

(defn slurp-bytes
  "Slurp the bytes from a slurpable thing."
  [x]
  (with-open [out (java.io.ByteArrayOutputStream.)
              in (io/input-stream x)]
    (io/copy in out)
    (.toByteArray out)))

(defn phone-number->formatted-number [s]
  (try
    (let [number (-> (str/replace (or s "") #"[-()\s\+]" ""))
          number (if (= (subs number 0 1) "1")
                   (subs number 1)
                   number)]
      (cond (not (re-matches #"\d+" number))
            nil
            (not= (count number) 10)
            nil
            ;; default
            :else
            (str "(" (subs number 0 3) ") " (subs number 3 6) "-" (subs number 6 10))))
    (catch Exception _e
      nil)))

(defn map->vec
  "Convert a map to a vector form table def representation"
  [m]
  (map (fn [[k v]] [k v]) m))

(defn keywordify [k]
  (csk/->kebab-case (-> k symbol str
                        (str/replace #"\?" "")
                        (str/replace #"\(" "")
                        (str/replace #"\)" "")
                        (str/replace #"\/" "-")
                        keyword)))

(defn sql-keywordify
  "Given a map, transform the keys into proper sql field names"
  [m]
  (->> m
       (medley/map-keys keywordify)
       (cske/transform-keys csk/->snake_case_keyword)))

(defn file->byte-array
  "Convert a file into a byte-array"
  [^java.io.File file]
  (let [ary (byte-array (.length file))]
    (with-open [istream (java.io.FileInputStream. file)]
      (.read istream ary))
    ary))

;;https://stackoverflow.com/questions/66517365/md5-hash-for-big-files-in-clojure
;; (util/file-hash "MD5" (clojure.java.io/input-stream ""))
#_(defn file-hash
    "Calculate a sources hash using algorithm. Option sink can be given if the contents will need to be used somewhere else. :close? does not close the source"
    [algo source & {:keys [sink close?] :or {sink   (OutputStream/nullOutputStream)
                                             close? true}}]
    (let [digest (MessageDigest/getInstance algo)]
      (with-open [digest-stream (DigestInputStream. source digest)
                  output-stream sink]
        (let [_   (io/copy digest-stream output-stream)
              key (format "%032x" (BigInteger. 1 (.digest digest)))]
          (when close?
            (.close source))
          key))))

(defn bearer-token
  [request]
  (let [auth (-> request :headers (get "authorization"))]
    (->> auth (re-find #"^Bearer (.*)$")
         second)))

(defn str->uuid [str]
  (try (java.util.UUID/fromString str)
       (catch Exception _
         nil)))
