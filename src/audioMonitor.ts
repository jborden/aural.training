import { freelizer } from 'freelizer';
import { noteName } from './guitar/model'

let start: Function, stop: Function, subscribe: Function;

function publishEvents(e: any) {
  const event = new CustomEvent("audioSignal",{detail: e});
  dispatchEvent(event);
}

export async function startAudio() {
  try {
    if (typeof start == "undefined") {
      ({start, stop, subscribe} = await freelizer());
    }
    start();
    subscribe(publishEvents);
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
function currentNoteFirstSeenListener( e: any): void {
  // if the current note name has changed,
  // reset the currentNoteFirstSeenTimeStamp to e.timeStamp
  if (currentNoteName != noteName(e.detail)) {
    currentNoteFirstSeenTimeStamp = e.timeStamp;
  }
  currentNoteName = noteName(e.detail);
}

addEventListener('audioSignal', currentNoteFirstSeenListener);

export function logListener(e: any) {
  let {frequency, note, noteFrequency, deviation, octave} = e.detail;
  let audioEventLogElem = document.querySelector("#audio-event-log");
  if (frequency) {
    audioEventLogElem.innerHTML = `<p>frequency = ${frequency.toFixed(2)} note = ${note} octave=${octave}<p>`;
  }
}
