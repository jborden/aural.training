(ns aural-training.dev
    (:require aural-training.db
              aural-training.server))

(defn dev-init! []
  (aural-training.server/start-server!)
  ;; db conn is disabled by default
  #_(aural-training.db/init-db-conn!))
