(ns aural-training.time
  (:require [clj-time.coerce :as c]
            [clj-time.core :as time]
            [clj-time.format :as f]
            [clj-time.local :as l]
            [clj-time.periodic :as p :refer [periodic-seq]]))

;; For future reference:
;; https://rosettacode.org/wiki/Find_the_last_Sunday_of_each_month#Clojure

(defn first-day-of-month [year month]
  (time/date-time year month 1))

(defn last-day-of-month [year month]
  (time/plus (->> (periodic-seq (time/date-time year 1 1) (time/days 1))
                  (take-while #(= (time/year %) year))
                  (filter #(= (time/month %) month))
                  last)
             (time/hours 23) (time/minutes 59) (time/seconds 59)))

(defn first-day-of-year [year]
  (time/date-time year))

(defn joda-time->sql-time [date-time]
  (c/to-sql-time date-time))

(defn sql-time->joda-time
  "Create a joda (ISO 8601 UTC) timestamp"
  [date-time]
  (c/from-sql-time date-time))

(defn now []
  (l/local-now))

(defn now-log []
  (f/unparse (f/formatters :date-hour-minute-second-ms) (now)))

;; https://github.com/clojure-cookbook/clojure-cookbook/blob/master/01_primitive-data/1-31_date-ranges.asciidoc
(defn time-range
  "Return a lazy sequence of DateTimes from start to end, incremented
  by 'step' units of time."
  [start end step]
  (let [inf-range (p/periodic-seq start step)            ; (1)
        below-end? (fn [t] (time/within? (time/interval start end) ; (2)
                                         t))]
    (take-while below-end? inf-range)))                            ; (3)

(defn random-time
  "Produce a random time between the start and end date with step.
  ex:
  (random-time (time/minus (l/local-now) (time/months 5))
               (l/local-now)
               (time/hours 1))"
  [start end step]
  (rand-nth (time-range start end step)))

(defn parse [s]
  (f/parse s))

(defn parse-day-month-year [s]
  (f/parse (f/formatter "MM/dd/YYYY") s))

(defn date-time->years
  "Return the amount of time since date-time"
  [date-time]
  (time/in-years (time/interval date-time (now))))

(defn exp
  "Create a UNIX epoch expiration s seconds in the future"
  [s]
  (time/plus (now) (time/seconds s)))
