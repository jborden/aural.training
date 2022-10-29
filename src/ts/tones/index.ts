import * as Tone from 'tone';
import { Interval, tones } from "../music/western/model"

export function playInterval(interval: Interval) {
  const firstTone = tones[0] + "4";
  const secondTone = tones[interval.semitones] + "4" ;
  console.log("interval: ", interval);
  console.log("firstTone: ", firstTone);
  console.log("secondTone: ", secondTone);

  const sampler = new Tone.Sampler({
    urls: {
      "C4": "C4.mp3",
      "D#4": "Ds4.mp3",
      "F#4": "Fs4.mp3",
      "A4": "A4.mp3",
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
  }).toDestination();
    Tone.loaded().then(() => {
      const now = Tone.now()
      console.log("[insideLoaded]: firstTone: ", firstTone)
      console.log("[insideLoaded]: secondTone: ", secondTone)
      sampler.triggerAttackRelease(firstTone, "8n", now);
      sampler.triggerAttackRelease(secondTone, "8n", now + 0.25);
  })
}
