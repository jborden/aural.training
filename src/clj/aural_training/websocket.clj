(ns aural-training.websocket
  (:require [aleph.http :as http]
            [clojure.edn :as edn]
            [manifold.bus :as bus]
            [manifold.deferred :as d]
            [manifold.stream :as s]
            [ring.middleware.anti-forgery :refer [*anti-forgery-token*]]
            ;; [aural-training..account :as account]
            ;; [aural-training.business.events :as business-events]
            ;; [aural-training.events.bus :refer [event-bus event-topic publish-event]]
            [aural-training.util :as util]
            ))

;; based upon: https://aleph.io/examples/literate.html#aleph.examples.websocket

(defn connect
  "This allows the events to be read from the bus by the websocket. Only events which have an account-id are allowed to be viewed by the websocket"
  [conn account-id]
  (s/connect
     (->> {:foo "bar"}
      #_(s/filter (partial business-events/account-can-view-event? account-id))
      (s/map #(str %)))
     conn)
  #_(s/on-closed conn #(.close bus-subscription))
  #_(let [bus-subscription (bus/subscribe event-bus event-topic)]
    (s/connect
     (->> bus-subscription
          (s/filter (partial business-events/account-can-view-event? account-id))
          (s/map #(str %)))
     conn)
    (s/on-closed conn #(.close bus-subscription))
    ))

(defn consume
  "This allows the messages to be sent to the bus. The account-id key is associated with the event automatically. "
  [conn account-id]
  (s/consume
   #_publish-event
   #(println %)
   (->> conn
        (s/map #(try (-> (edn/read-string %)
                         (assoc :account-id account-id))
                     (catch Exception e
                       (println (util/log-message (util/current-function-name)
                                                  (str () ": event '" % "' has error message " (.getMessage e)))))))
        (s/buffer 100))))

(def non-websocket-request
  {:status 400
   :headers {"content-type" "application/text"}
   :body "Expected a websocket request."})


(defn websocket-handler [req]
  (let [account-id "foo"]
    (d/let-flow [conn (d/catch
                          (http/websocket-connection req)
                          ;; this should be an error handler
                          (fn [_] nil))]
                (if-not conn
                  ;; this wasn't a valid websocket handshake
                  non-websocket-request
                  ;; otherwise, subscribe to the event bus
                  (do
                    (connect conn account-id)
                    (consume conn account-id)))))
  #_(if-let [account-id (:id (account/read {:token (-> req
                                                       :cookies
                                                       (get "token")
                                                       :value)}))]
    ;; we have an account id associated with a token
    ;; further check that the anti-forgery-token is correct
    (if-not (= *anti-forgery-token*
               (-> req :query-params (get "x-csrf-token")))
      {:status 403
       :headers {}
       :body "Not Authorized"}
      (d/let-flow [conn (d/catch
                            (http/websocket-connection req)
                            ;; this should be an error handler
                            (fn [_] nil))]
                  (if-not conn
                    ;; this wasn't a valid websocket handshake
                    non-websocket-request
                    ;; otherwise, subscribe to the event bus
                    (do
                      (connect conn account-id)
                      (consume conn account-id)))))
    ;; we don't have an account-id
    (do
      (util/log-message (util/current-function-name) "Not authorized - No account token")
      {:status 403
       :header {}
       :body "Not Authorized - No Account Token"})))
