// https://guitardialogues.wordpress.com/
// https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies

type Tones = string[];

export const tones:Tones = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

const A4 = 440
const C0 = 16.35
const A4midiReference = 69;
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

// inspired by freelizer/getDataFromFrequency
// the key insight involves using the midi reference
// number to determine the note
export function freqNote(freq: number) {
  const n = Math.round((12 * Math.log2(freq / pitchReference)));
  const nearestNoteFreq = pitchReference * (2 ** (1 / 12)) ** n;
  const note = tones[(n + A4midiReference) % 12];
  const octave = Math.floor(Math.log2(freq / C0));
  return({deviation: freq - nearestNoteFreq,
	  n,
	  note,
	  octave})
}

// https://math.stackexchange.com/a/930254
export function semitonesBetweenFreqs(freq1: number, freq2: number) {
  // we are using freq2 over freq1 because we want positive values
  return(Math.round(12 * Math.log2(freq2 /  freq1)));
}

// return the notes between two freq ranges, inclusive of freq1 and freq2
export function freqNoteRange(freq1: number, freq2: number) {
  if (freq2 <= freq1) {
    throw("Error: freq2 parameter must be greater than freq1 in noteBetweenFreqs")
  }
  let notesRange = [];
  const semitoneDistance = semitonesBetweenFreqs(freq1,freq2);
  const note1 = freqNote(freq1).note;
  let currentOctave = freqNote(freq1).octave;
  const note2 = freqNote(freq2).note;
  const octave2 = freqNote(freq2).octave;

  notesRange.push({note: note1,
		   octave: currentOctave});

  for (let i = 1; i < semitoneDistance ; i++){
    let note = tones[(i + tones.indexOf(note1)) % 12];
    if (note == "C") currentOctave++;
    notesRange.push({note,
		     octave: currentOctave});
  }

  notesRange.push({note: note2,
		   octave: octave2});
  return(notesRange);
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
