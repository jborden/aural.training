import { freelizer } from 'freelizer';
import { sample,isNull, isEqual} from "lodash-es"
import { noteName, Note } from './guitar/model'
import { publishEvent } from './events/main'
import * as Tone from 'Tone';

export interface AudioMonitorEventDetail {
  frequency: number,
  note: string,
  noteFrequency: number,
  deviation: number,
  octave: number
}

let start: Function, stop: Function, subscribe: Function;
let monitoring = false;
export { monitoring };

export async function startAudio() {
  try {
    if (typeof start == "undefined") {
      ({start, stop, subscribe} = await freelizer());
    }
    start();
    Tone.start();
    monitoring = true;
    publishEvent("audioMonitor/start");
    subscribe((e:any) => { publishEvent("audioSignal",e) });
  } catch (error){
    console.log("There was an error trying to start the audio");
    console.log(error);
  }
}

export async function stopAudio() {
  try {
    console.log(stop);
    stop()
  } catch (error){
    console.log("There was an error trying to stop the audio");
    console.log(error);
  }
}

export let currentNoteFirstSeenTimeStamp:number = 0;
export let currentNoteName:string = null;

// This is a helper listener that lets us know how long
// we've seen the current note. There is an initial
// deviation from the pitch when the string is first plucked.
// This allows other functions to have time tolerances for
// note lifetimes.
function currentNoteFirstSeenListener(e: any): void {
  // if the current note name has changed,
  // reset the currentNoteFirstSeenTimeStamp to e.timeStamp
  if (currentNoteName != noteName(e.detail)) {
    let timeSeen = e.timeStamp - currentNoteFirstSeenTimeStamp;
    publishEvent("audioMonitor/currentNoteFirstSeenListener",{currentNoteName: currentNoteName,
							      timeSeen: timeSeen})
    currentNoteFirstSeenTimeStamp = e.timeStamp;
  }
  currentNoteName = noteName(e.detail);
}

addEventListener('audioMonitor/currentNoteFirstSeenListener', (e:any ) =>
  { let { timeSeen, currentNoteName } = e.detail;
    if (timeSeen > 300 && currentNoteName)
    { console.log(`currentNoteName: ${currentNoteName} timeSeen: ${timeSeen}`)}
  })

//addEventListener('audioSignal', currentNoteFirstSeenListener);

let currentNoteNameWithDeviationTolerance:string = null;

function currentNoteFirstSeenListenerWithTolerance(deviationTolerance: number): Function {
  let monitorFunction = function(e: any) {
    let { deviation } = e.detail;
    deviation = Math.abs(deviation);
    //console.log(`deviation: ${deviation}, currentNoteNameWithDeviationTolerance: ${currentNoteNameWithDeviationTolerance}`);
    if ( deviation > deviationTolerance && currentNoteNameWithDeviationTolerance) {
      publishEvent("audioMonitor/currentNoteFirstSeenListenerWithTolerance",{noteName: currentNoteNameWithDeviationTolerance});
    }
    currentNoteNameWithDeviationTolerance = noteName(e.detail);
  }
  return(monitorFunction);
}

addEventListener('audioSignal', (e) => {(currentNoteFirstSeenListenerWithTolerance(3))(e)});

addEventListener('audioMonitor/currentNoteFirstSeenListenerWithTolerance', (e:any ) =>
  { if (currentNoteNameWithDeviationTolerance)
    {// console.log(`currentNoteNameWithDeviationTolerance: ${currentNoteNameWithDeviationTolerance}`)
  }})

export function logListener(e: any) {
  let {frequency, note, noteFrequency, deviation, octave} = e.detail;
  let audioEventLogElem = document.querySelector("#audio-event-log");
  if (frequency) {
    audioEventLogElem.innerHTML = `<p>frequency = ${frequency.toFixed(2)} note = ${note} octave=${octave} deviation=${deviation}<p>`;
  }
}

let deviationTolerance = 1;
let timeSeenMin = 100;
let lastNotePlayed:Note = null;
let noteShown = false;
function notePlayedListener(e: any): void {
	// the last time this note was seen
	let timeSeen: number = e.timeStamp - currentNoteFirstSeenTimeStamp;
	// the deviation of the frequency from the note
	let deviation = Math.abs(e.detail.deviation);
	// when the current note name is not null, we are within our tolerances and a guess hasn't been made
	let { note, octave } = e.detail;
	let signalNoteName = {
		note: note,
		octave: octave
	};

	if ((timeSeen > timeSeenMin) && (deviation < deviationTolerance)) {
	  let { note, octave } = e.detail;
	  let signalNoteName = {
	    note: note,
	    octave: octave
	  };
	  console.log("criteria met")
	  if (!noteShown) {
	    console.log("signalNoteName: ", signalNoteName);
	  }
	  noteShown = true;
	} else {
	  console.log("criteria not met")
	  noteShown = false;
	  lastNotePlayed = signalNoteName;
	}
}


addEventListener('audioSignal',notePlayedListener)

export class audioMonitorToggleButton {
  listening = false;
  parentDiv: HTMLElement = null;

  constructor(parentDiv: HTMLElement) {
    this.listening = false;
    this.parentDiv = parentDiv;
    this.audioMonitorToggleButtonRender()
  };

  audioMonitorToggleButtonRender() {
    let message = this.listening ? "Stop" : "Start";
    let element = document.createElement('button');
    element.innerHTML = message;
    element.addEventListener('click',() => {this.audioMonitorToggleButton()})
    this.parentDiv.innerHTML = '';
    this.parentDiv.append(element);
  };

  audioMonitorToggleButton() {
    if (this.listening) {
      stopAudio()
    } else {
      startAudio()
    }
    this.listening = !this.listening;
    this.audioMonitorToggleButtonRender();
  };
}

// export function laggingNoteMonitor(timeSeenMin: number, deviationTolerance: number) {

//     let audioEventListener = function(e: any): void {
//     let timeSeen: number = e.timeStamp - currentNoteFirstSeenTimeStamp;
//     let deviation = Math.abs(e.detail.deviation);
//     if (currentNoteName && timeSeen > timeSeenMin && (deviation < deviationTolerance) && currentNoteName != ) {
//       publishEvent("audioMonitor/laggingNoteMonitor", {currentNoteName: currentNoteName,
// 						       timeSeenMin: timeSeenMin})
//     }
//   }
// }
