(ns aural-training.server
    (:require [aural-training.config :as config]
              [aural-training.handler :refer [app]]
              [aleph.http :as http]))

(defonce server (atom nil))

(defn stop-server! []
  (when-not (nil? @server)
    ;; graceful shutdown: wait 100ms for existing requests to be finished
    ;; :timeout is optional, when no timeout, stop immediately
    (.close @server)
    (reset! server nil)))

(defn start-server!
  ([]
   (stop-server!)
   (start-server! config/http-port))
  ([port]
   (stop-server!)
   (reset! server (http/start-server app {:port port}))))
