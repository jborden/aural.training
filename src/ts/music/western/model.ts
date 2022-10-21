type Tones = string[];

export const tones:Tones = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

export function noteFreq(note: string, octave: number){
  // f = 2^(n/12)*440
  // https://pages.mtu.edu/~suits/NoteFreqCalcs.html
  // https://codepen.io/enxaneta/post/frequencies-of-musical-notes
  const Afreq = 440.0
  let nDeltaNote =  tones.indexOf(note) - tones.indexOf("A");
  let nDeltaOctave = (octave - 4) * 12;
  let n = nDeltaNote + nDeltaOctave;
  return Math.pow(2,n/12)*Afreq;
}
