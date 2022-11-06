import { mapValues,isEmpty } from "lodash-es";
import { publishEvent } from '../events/main';
import { noteName } from "../guitar/model"

const noteMonitorMap = new Map();

const unitIntervalCutoff = 0.90;

export function noteMonitorPing(e: any): void {
  const { timestamp, detail } = e;
  const note = noteName(detail);
  console.log("[noteMonitorPing] :", detail)
  console.log("[noteMonitorPing] : ", noteMonitorMap.get(note))
  
  if (noteMonitorMap.get(note)) {
    const { unitInterval, lastSeenTimestamp } = noteMonitorMap.get(note);
		// in the case that the cutoff has been exceeded,
		// the note has been seen recently enough to maintain
		// the last seen timestamp
		if (unitInterval > unitIntervalCutoff) {
			noteMonitorMap.set(note, {
				note: note,
				unitInterval: 1,
				lastSeenTimestamp: lastSeenTimestamp
			})
		}
		// otherwise, the note has not been seen recently enough
		// let's give it a new timestamp
		else {
			noteMonitorMap.set(note, {
				note: note,
				unitInterval: 1,
				lastSeenTimestamp: timestamp
			})
		}
	}
}

let start:DOMHighResTimeStamp, previousTimeStamp:DOMHighResTimeStamp;

function noteMonitorMapTick(deltaT: DOMHighResTimeStamp) {
  const chi = 0.01 // Χ, after Χρόνος aka chronos

  if (!isEmpty(noteMonitorMap)) {
    // decrement all unitIntervals
    mapValues(noteMonitorMap,
	      (v: any) => {
		let { unitInterval, note, lastSeenTimestamp } = v;
		if (unitInterval > 0) {
		  unitInterval -= deltaT * chi;
		  unitInterval = unitInterval < 0 ? 0 : unitInterval;
		}
		return({unitInterval: unitInterval,
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
		 (e:any ) => { console.log(e.detail)})

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




