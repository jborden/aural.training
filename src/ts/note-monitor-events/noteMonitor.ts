import { isEmpty } from "lodash-es";
import { publishEvent } from '../events/main';
import { noteName } from "../guitar/model"

type NoteMonitorObj = { lastSeen: DOMHighResTimeStamp,
			unitInterval: number,
			fired: boolean,
			note: string};
export class NoteMonitor {
  eventName: string;
  maxDeviation: number;
  unitIntervalCutoff: number;
  noteMonitorMap:Map<string,NoteMonitorObj> = new Map();
  start:DOMHighResTimeStamp;
  previousTimeStamp:DOMHighResTimeStamp;
  /**
   * Create a note monitor
   *
   * @param {string} eventName? - the name of the event that will be fired
   *                              when conditions are met
   * @param {string} pingEventName? - the name of the event that reset the
   *                                  unitInterval to 1 for that note
   * @param {number}  maxDeviation? - the maximum deviation of the signal from the note it represents
   *                                  as expressed in percentage of the freq of that note
   * @param {number} unitIntervalCutoff? - lowest value for unitInterval
   */
  constructor(eventName:string =  "noteMonitor/noteSeen",
	      pingEventName:string = "audioMonitor/filterAudioSignal",
	      maxDeviation:number = 1,
	      unitIntervalCutoff:number = 0.01) {
    this.eventName = eventName;
    this.maxDeviation = maxDeviation;
    this.unitIntervalCutoff = unitIntervalCutoff;
    // for typescript errors
    this.start = Date.now();
    this.previousTimeStamp = Date.now();
    // listen for ping events
    addEventListener(pingEventName,this.noteMonitorPing);
    // listen for timemin events
    // eventListenerRef = addEventListener(eventName,
    // 				       (e:any) => { const { timeSeen } = e.detail;
    // 						    if (timeSeen > 300) {
    // 						      console.log("`[$eventName/noteSeenTimeSeenMin]`", e.detail)
    // 						      publishEvent("$eventName/noteSeenTimeSeenMin",
    // 								   e.detail)}
    // 						  })
    // start the monitor
    window.requestAnimationFrame(this.stepNoteMonitorEvents);
  }

  /**
   * Monitors an audio event and updates the noteMonitorMap
   * @param {any} e
   *
   */
  noteMonitorPing(e: any): void {
    const { detail } = e;
    const note = noteName(detail) || "";
    const noteMonitorObj = this.noteMonitorMap.get(note);

    if (noteMonitorObj) {
      let { lastSeen, unitInterval } = noteMonitorObj;
      if (unitInterval > this.unitIntervalCutoff) {
	this.noteMonitorMap.set(note, {
	  unitInterval: 1,
	  note: detail,
	  lastSeen: lastSeen,
	  fired: false
	})
      } else if (unitInterval <= this.unitIntervalCutoff) {
	this.noteMonitorMap.set(note, {
	  unitInterval: 1,
	  note: detail,
	  lastSeen: Date.now(),
	  fired: false
	})
      }
    } else {
      this.noteMonitorMap.set(note, {
	unitInterval: 1,
	note: detail,
	lastSeen: Date.now(),
	fired: false})}
  }

  /**
   * Constantly decrements the unitIntervals
   * and publishes noteSeen events
   *
   * @param {DOMHighResTimeStamp} deltaT
   */
  noteMonitorMapTick(deltaT: DOMHighResTimeStamp) {
    const chi = 0.01 // Χ, after Χρόνος aka chronos
    if (!isEmpty(this.noteMonitorMap)) {
      // decrement all unitIntervals
      this.noteMonitorMap.forEach((v, key, map) => {
	let { unitInterval, note, lastSeen,fired } = v;
	if (unitInterval > 0) {
	  unitInterval -= deltaT * chi;
	  unitInterval = unitInterval < 0 ? 0 : unitInterval;
	}
	map.set(key, {unitInterval: unitInterval,
		      note: note,
		      lastSeen: lastSeen,
		      fired: fired})})

      // publish noteSeen events
      this.noteMonitorMap.forEach((v,key,map) =>
	{
	  let { unitInterval, note, lastSeen, fired} = v;
	  // if any unitIntervals are below the cutoff, it means the note
	  // hasn't been seen in awhile. Therefore, send an event showing
	  // that the note WAS seen and for what duration
	  if ((unitInterval < this.unitIntervalCutoff) && !fired) {
	    // publish the event
	    publishEvent("note-monitor-events/noteSeen",
			 {note: note,
			  timeSeen: Date.now() - lastSeen,
			 })
	    map.set(key, {unitInterval: unitInterval,
			  note: note,
			  fired: true,
			  lastSeen: lastSeen})}})}
  }

  /**
   * Recursive function called by requestAnimationFrame
   * to constantly call noteMonitorMapTick
   *
   * @param {DOMHighResTimeStamp} timestamp
   */
  stepNoteMonitorEvents(timestamp: DOMHighResTimeStamp): void {
    if (this.start === undefined)  {
      this.start = timestamp;
    }
    if (this.previousTimeStamp !== timestamp) {
      this.noteMonitorMapTick(timestamp - this.previousTimeStamp)
    }

    this.previousTimeStamp = timestamp;
    window.requestAnimationFrame(this.stepNoteMonitorEvents);
  }
}
