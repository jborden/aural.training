import { isEmpty } from "lodash-es";
import { publishEvent } from '../events/main';
import { noteName } from "../guitar/model"

const noteMonitorMap = new Map();

const unitIntervalCutoff = 0.01;

export function noteMonitorPing(e: any): void {
  const { detail } = e;
  const note = noteName(detail);
  const thisNoteMonitorObj = noteMonitorMap.get(note);

  if (thisNoteMonitorObj) {
    let { lastSeenTimeStamp, unitInterval } = thisNoteMonitorObj;
    if (unitInterval > unitIntervalCutoff) {
      noteMonitorMap.set(note, {unitInterval: 1,
				note: detail,
				lastSeenTimeStamp: lastSeenTimeStamp,
			        fired: false})
    } else if (unitInterval <= unitIntervalCutoff) {
      noteMonitorMap.set(note, {unitInterval: 1,
				note: detail,
				lastSeenTimeStamp: Date.now(),
				fired: false})
    }
  } else {
    noteMonitorMap.set(note, {unitInterval: 1,
			      note: detail,
			      lastSeenTimeStamp: Date.now(),
			      fired: false})
  }
}

let start:DOMHighResTimeStamp, previousTimeStamp:DOMHighResTimeStamp;

function noteMonitorMapTick(deltaT: DOMHighResTimeStamp) {
  const chi = 0.01 // Χ, after Χρόνος aka chronos
  if (!isEmpty(noteMonitorMap)) {
    // decrement all unitIntervals
    noteMonitorMap.forEach((v, key, map) => {
      let { unitInterval, note, lastSeenTimeStamp,fired } = v;
      if (unitInterval > 0) {
	unitInterval -= deltaT * chi;
	unitInterval = unitInterval < 0 ? 0 : unitInterval;
      }
      map.set(key, {unitInterval: unitInterval,
		    note: note,
		    lastSeenTimeStamp: lastSeenTimeStamp,
		    fired: fired})
    })
    // publish noteSeen events
    noteMonitorMap.forEach((v,key,map) =>
      {
	let { unitInterval, note, lastSeenTimeStamp, fired} = v;
	
	// if any unitIntervals are below the cutoff, it means the note
	// hasn't been seen in awhile. Therefore, send an event showing
	// that the note WAS seen and for what duration
	if ((unitInterval < unitIntervalCutoff) && !fired) {
	  // publish the event
	  publishEvent("note-monitor-events/noteSeen",
		       {note: note,
			timeSeen: Date.now() - lastSeenTimeStamp,
		       })
	  map.set(key, {unitInterval: unitInterval,
			note: note,
			fired: true})
	}
      }
      )
  }
}

addEventListener("note-monitor-events/noteSeen",
		 (e:any) => { const { timeSeen } = e.detail;
			      if (timeSeen > 300) {
				console.log("[note-monitor-events/noteSeenTimeSeenMin]", e.detail)
				publishEvent("note-monitor-event/noteSeenTimeSeenMin",
					    e.detail)}
			    })

addEventListener("note-monitor-events/noteSeen",
		 (e:any) => { const { timeSeen } = e.detail;
			       if (timeSeen > 300) {
				 console.log("[note-monitor-events/noteSeen]", e.detail)
			       }})

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




