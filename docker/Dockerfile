# https://medium.com/@mprokopov/deployment-of-clojure-app-to-production-with-docker-9dbffeac6ef5
FROM openjdk:19-jdk-alpine3.16
RUN mkdir -p /app /app/resources
WORKDIR /app
COPY target/aural-training-server.jar .
ADD resources /app/resources
COPY scripts/run-server-jar scripts/run-server-jar
ENTRYPOINT ["scripts/run-server-jar"]
CMD ["aural-training-server.jar"]
EXPOSE 8080
