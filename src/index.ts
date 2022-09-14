import { freelizer } from 'freelizer';

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

export function logListener(e: any) {
  let {frequency, note, noteFrequency, deviation, octave} = e.detail;
  let audioEventLogElem = document.querySelector("#audio-event-log");
  audioEventLogElem.innerHTML = `<p>frequency = ${frequency.toFixed(2)} note = ${note} octave=${octave}<p>`;

}

addEventListener('audioSignal',logListener);
