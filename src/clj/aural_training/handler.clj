(ns aural-training.handler
  (:require [aural-training.websocket :as websocket]
            [compojure.core :refer [GET POST PUT DELETE context defroutes]]
            [compojure.route :as route]
            [ring.middleware.defaults :refer [wrap-defaults api-defaults]]
            [ring.middleware.json :refer [wrap-json-body wrap-json-response]]
            [ring.util.response :refer [redirect]]))

(defonce body-atom (atom {}))

(defroutes app-routes
  (GET "/" [] (redirect "/index.html"))
  (context "/user" []
           (POST "/" {body :body}
                 (let [new-user body
                       id       (gensym)]
                   {:body (assoc new-user :id id)}))
           (POST "/dexie-sync" {body :body}
                 (reset! body-atom body))
           (GET "/:id" [id] {:body {:id id}})
           (PUT "/:id" {body         :body
                        {:keys [id]} :params}
                (let [modified-user body]
                  {:body (assoc modified-user :id id)}))
           (DELETE "/:id" [id]
                   {:body {:message (str "user_id: " id " deleted")}}))
  (GET "/ws" [] websocket/websocket-handler)
  (route/resources "/")
  (route/not-found "Not Found"))

(def app
  (-> app-routes
      (wrap-defaults api-defaults)
      (wrap-json-body)
      (wrap-json-response {:keywords? true})))
