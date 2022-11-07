import { mapValues,isEmpty } from "lodash-es";
import { publishEvent } from '../events/main';
import { noteName } from "../guitar/model"

const noteMonitorMap = new Map();

const unitIntervalCutoff = 0.90;

export function noteMonitorPing(e: any): void {
  const { timeStamp, detail } = e;
  const note = noteName(detail);
  const thisNoteMonitorObj = noteMonitorMap.get(note);
  // console.log("[noteMonitorPing] detail:", detail)
  // console.log("[noteMonitorPing] noteMonitorMap.get: ", thisNoteMonitorObj)

  if (thisNoteMonitorObj) {
    let { lastSeenTimestamp, unitInterval } = thisNoteMonitorObj;
    if (unitInterval > unitIntervalCutoff) {
      noteMonitorMap.set(note, {unitInterval: 1,
				note: note,
				lastSeenTimestamp: lastSeenTimestamp})
    } else if (unitInterval <= unitIntervalCutoff) {
      noteMonitorMap.set(note, {unitInterval: 1,
			       note: note,
			       lastSeenTimestamp: timeStamp})
    }
  } else {
    noteMonitorMap.set(note, {unitInterval: 1,
			      note: note,
			      lastSeenTimestamp: timeStamp})
  }
}

let start:DOMHighResTimeStamp, previousTimeStamp:DOMHighResTimeStamp;

function noteMonitorMapTick(deltaT: DOMHighResTimeStamp) {
  const chi = 0.01 // Χ, after Χρόνος aka chronos
  if (!isEmpty(noteMonitorMap)) {
    // decrement all unitIntervals
    noteMonitorMap.forEach((v, key, map) => {
      console.log("v", v)
      let { unitInterval, note, lastSeenTimestamp } = v;
      if (unitInterval > 0) {
	unitInterval -= deltaT * chi;
	unitInterval = unitInterval < 0 ? 0 : unitInterval;
      }
      if (note === "E4") {
	console.log("[noteMonitorMap]: ",{unitInterval: unitInterval,
					  note: note,
					  lastSeenTimestamp: lastSeenTimestamp})
      }
      map.set(key, {unitInterval: unitInterval,
		    note: note,
		    lastSeenTimestamp: lastSeenTimestamp})
    })
    // publish noteSeen events
    mapValues(noteMonitorMap,
	      (v: any) => {
		let { unitInterval, note, lastSeenTimestamp } = v;
		
		// if any unitIntervals are below the cutoff, it means the note
		// hasn't been seen in awhile. Therefore, send an event showing
		// that the note WAS seen and for what duration
		if (unitInterval < unitIntervalCutoff) {
		  publishEvent("note-monitor-events/noteSeen",
		  {
		    note: note,
		    timeSeen: Date.now() - lastSeenTimestamp
		  })
		}
		return(v);
	      })
  }
}

addEventListener("note-monitor-events/noteSeen",
		 (e:any ) => { console.log("[note-monitor-events/noteSeen]", e.detail)})

export function stepNoteMonitorEvents(timestamp: DOMHighResTimeStamp): void {
  if (start === undefined)  {
    start = timestamp;
  }
  if (previousTimeStamp !== timestamp) {
    noteMonitorMapTick(timestamp - previousTimeStamp)
  }
  
  previousTimeStamp = timestamp;
  window.requestAnimationFrame(stepNoteMonitorEvents);
}




