(ns aural-training.main
  (:gen-class)
  (:require [aural-training.config :refer [http-port]]
            [aural-training.server :refer [start-server!]]))

(defn -main []
  (start-server!)
  (println "Server Running on port:" http-port))
