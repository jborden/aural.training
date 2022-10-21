(ns aural-training.config
    (:require [environ.core :refer [env]]))

(def not-modified 304)
(def forbidden 403)
(def ok 200)
(def internal-server-error 500)
(def bad-request 400)

(defn get-property-or-env
  [property-name]
  (or (System/getProperty property-name)
      (System/getenv property-name)))

(defn dev-env? []
  (boolean (= (:environment env) "dev")))

(when (dev-env?)
  (System/setProperty "HTTP_PORT" (env :http-port))
  (System/setProperty "DB_HOST" (env :db-host))
  (System/setProperty "DB_PORT" (env :db-port))
  (System/setProperty "DB_NAME" (env :db-name))
  (System/setProperty "DB_USER" (env :db-user))
  (System/setProperty "DB_PASSWORD" (env :db-password))
  (System/setProperty "HOSTNAME" (env :hostname)))

(def http-port (read-string (or (get-property-or-env "HTTP_PORT") "3000")))
(def protocol (if (= (:environment env) "dev") "http" "https"))
(def hostname (or (get-property-or-env "HOSTNAME") "aural-training.com"))
(def web-address (if (= hostname "localhost")
                   (str "http://" hostname ":" http-port)
                   (str "https://aural-training.com")))

;; Database
(def db-host (get-property-or-env "DB_HOST"))
(def db-port (get-property-or-env "DB_PORT"))
(def db-name (get-property-or-env "DB_NAME"))
(def db-user (get-property-or-env "DB_USER"))
(def db-password (get-property-or-env "DB_PASSWORD"))
