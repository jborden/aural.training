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
