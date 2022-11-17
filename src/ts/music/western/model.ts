type Tones = string[];

export const tones:Tones = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

const A4 = 440
const pitchReference = A4;

export function noteFreq(note: string, octave: number){
  // f = 2^(n/12)*440
  // https://pages.mtu.edu/~suits/NoteFreqCalcs.html
  // https://codepen.io/enxaneta/post/frequencies-of-musical-notes
  const nDeltaNote =  tones.indexOf(note) - tones.indexOf("A");
  const nDeltaOctave = (octave - 4) * 12;
  const n = nDeltaNote + nDeltaOctave;
  return Math.pow(2,n/12)*pitchReference;
}
// clearly wrong
export function freqNote(freq: number) {
  const n = Math.round((12 * Math.log2(freq / pitchReference)))
  const note = tones[n % 12];
  const octave = n < 0 ? Math.ceil(n / 12) + 4 : Math.floor(n / 12) + 4;
  //const octave = Math.log2(freq / pitchReference);
  //return(String(note) + String(octave))
  return({n: n, note: note, octave: octave})
}

export interface Interval {
  name: string,
  semitones: number,
  augmentedOrDiminished: string,
  abbreviation: string
}

export const WesternIntervals:Interval[] = [
  {name: 'Unison', abbreviation: "P1", semitones: 0, augmentedOrDiminished: "Diminished second"},
  {name: 'Minor Second', abbreviation: "m2", semitones: 1, augmentedOrDiminished: "Augmented unison"},
  {name: 'Major Second', abbreviation: "M2", semitones: 2, augmentedOrDiminished: "Diminished third"},
  {name: 'Minor Third', abbreviation: "m3", semitones: 3, augmentedOrDiminished: "Augmented second"},
  {name: 'Major Third', abbreviation: "M3", semitones: 4, augmentedOrDiminished: "Diminished fourth"},
  {name: 'Perfect Fourth', abbreviation: "P4", semitones: 5, augmentedOrDiminished: "Augmented third"},
  // we're ignoring this one for now :)
  //{name: '', abbreviation: "d5", semitones: 6, augmentedOrDiminished: "Diminished fifth"},
  {name: 'Perfect Fifth', abbreviation: "P5", semitones: 7, augmentedOrDiminished: "Diminished sixth"},
  {name: 'Minor Sixth', abbreviation: "m6", semitones: 8, augmentedOrDiminished: "Augmented fifth"},
  {name: 'Major Sixth', abbreviation: "M6", semitones: 9, augmentedOrDiminished: "Diminished seventh"},
  {name: 'Minor Seventh', abbreviation: "m7", semitones: 10, augmentedOrDiminished: "Augmented sixth"},
  {name: 'Major Seventh', abbreviation: "M7", semitones: 11, augmentedOrDiminished: "Diminished octave"},
  {name: 'Perfect Octave', abbreviation: "P8", semitones: 12, augmentedOrDiminished: "Augmented seventh"}]
