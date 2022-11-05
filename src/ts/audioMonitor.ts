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

function filterAudioSignal(e: any): void {
  let { deviation, frequency  } = e.detail;
  
  if ( Math.abs(deviation) < (frequency * 0.005)) {
    //console.log("[filterAudioSignal]: ", e.detail)
    publishEvent('audioMonitor/filterAudioSignal',e.detail)
  } // also publish null events
  else if (!e.detail) {
    publishEvent('audioMonitor/filterAudioSignal', e.detail)
  }
}

addEventListener('audioSignal',filterAudioSignal);


//addEventListener('audioMonitor/filterAudioSignal', (e:any) => { console.log("audioSignalFiltered",e.detail)} )
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

addEventListener('audioMonitor/filterAudioSignal', currentNoteFirstSeenListener);
addEventListener('audioMonitor/currentNoteFirstSeenListener',(e:any) =>
  {
    if(e.detail.timeSeen > 300)
    {console.log(e.detail) }});

export function logListener(e: any) {
  let {frequency, note, noteFrequency, deviation, octave} = e.detail;
  let audioEventLogElem = document.querySelector("#audio-event-log");
  if (frequency) {
    audioEventLogElem.innerHTML = `<p>frequency = ${frequency.toFixed(2)} note = ${note} octave=${octave} deviation=${deviation}<p>`;
  }
}

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
