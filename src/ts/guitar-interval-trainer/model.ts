import { WesternIntervals,Interval } from "../music/western/model"
import { includes } from "lodash-es"

// get a subselection of notes from a range of frets
export function selectIntervals(intervals: string []):Interval[] {
  const filteredIntervals = WesternIntervals.filter((interval) => {return(includes(intervals,interval.abbreviation)) });
  return filteredIntervals;
}
