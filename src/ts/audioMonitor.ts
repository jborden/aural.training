import { freelizer } from 'freelizer';
import { noteName } from './guitar/model';
import { publishEvent } from './events/main';
import * as Tone from 'tone';

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
    let message = this.listening ? "Stop Mic Monitoring" : "Start Mic Monitoring";
    let element = document.createElement('button');
    element.innerHTML = message;
    element.classList.add('button-54');
    element.setAttribute("role","button");
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
