import * as Tone from 'tone';
import { Interval, tones } from "../music/western/model"

const sampler = new Tone.Sampler({
	urls: {
		"C4": "C4.mp3",
		"D#4": "Ds4.mp3",
		"F#4": "Fs4.mp3",
		"A4": "A4.mp3",
	},
	baseUrl: "audio/salamander/",
}).toDestination();

const baseOctave = 3;

export function playInterval(interval: Interval, offset:number = 0) {
  const firstTone = tones[0] + baseOctave;
  const secondTone = tones[interval.semitones % 12] + (Math.floor(interval.semitones / 12) + 4) ;
  // console.log("interval: ", interval);
  // console.log("firstTone: ", firstTone);
  // console.log("secondTone: ", secondTone);
  Tone.loaded().then(() => {
    const now = Tone.now()
    // console.log("[insideLoaded]: firstTone: ", firstTone)
    // console.log("[insideLoaded]: secondTone: ", secondTone)
    sampler.triggerAttackRelease(firstTone, "8n", now + offset);
    sampler.triggerAttackRelease(secondTone, "8n", now + 0.25 + offset);
  })
}

export function playIntervalSequence(intervals: Interval[]) {
  const firstTone = tones[0] + baseOctave;
  const pause = 0.50;
  let intervalSequence:number[] = [];
  let cumulative = 0;
  intervals.map((v) => {
    cumulative += v.semitones;
    intervalSequence.push(cumulative);
    return cumulative;
  })
  Tone.loaded().then(() => {
    const now = Tone.now();
    console.log("firstTone: ", firstTone)
    sampler.triggerAttackRelease(firstTone, "8n", now);
    intervalSequence.map((v,i) => {
      console.log("note: ",String(tones[v % 12]) + String(Math.floor(v / 12) + baseOctave))
      sampler.triggerAttackRelease(String(tones[v % 12]) + String(Math.floor(v / 12) + baseOctave), "8n", now + (pause * (i + 1)))
    })
  })
}
