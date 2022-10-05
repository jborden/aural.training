import { tones } from "../music/western/model"

interface StringTuning {
  note: string
  octave: number
  string: number
}

type InstrumentTuning = StringTuning[];

export const standardTuning = [{ note: "E", octave: 4, string: 1},
			       { note: "B", octave: 3, string: 2},
			       { note: "G", octave: 3, string: 3},
			       { note: "D", octave: 3, string: 4},
			       { note: "A", octave: 2, string: 5},
			       { note: "E", octave: 2, string: 6}];

interface Note {
  note: string
  string: number
  octave: number
  fret: number
}

type FretBoard = Note[];

function createNote(stringTuning: StringTuning, fret: number) {
  let note:Note = {note: stringTuning.note,
		   octave: stringTuning.octave,
		   string: stringTuning.string,
		   fret: fret}
  return note
}

function createStringNotes(stringTuning: StringTuning, frets: number) {
  let firstNote = createNote(stringTuning,0);
  let stringNotes = [];
  let currentOctave = stringTuning.octave;
  stringNotes.push(firstNote);
  for (let i = 1; i < frets + 1; i++) {
    let tone = tones[(i + tones.indexOf(stringTuning.note)) % 12];
    if (tone == "C")  currentOctave++
    stringNotes.push(createNote({note: tone,
				 octave: currentOctave,
				 string: stringTuning.string},
				i))};
  return stringNotes;
}

export function createFretBoard(tuning: InstrumentTuning, frets: number): FretBoard {
  let currentFretboard = []
  for (let stringTuning of tuning) {
    currentFretboard.push(createStringNotes(stringTuning, frets));
  }
  return(currentFretboard.flat());
}
