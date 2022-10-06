import { tones } from "../music/western/model"
import { max,map,flow } from "lodash-es"
interface StringTuning {
  note: string
  octave: number
  string: number
}

export type InstrumentTuning = StringTuning[];

export const standardTuning:InstrumentTuning = [{ note: "E", octave: 4, string: 1},
						{ note: "B", octave: 3, string: 2},
						{ note: "G", octave: 3, string: 3},
						{ note: "D", octave: 3, string: 4},
						{ note: "A", octave: 2, string: 5},
						{ note: "E", octave: 2, string: 6}];

export interface Note {
  note: string
  string: number
  octave: number
  fret: number
}

export type FretBoard = Note[];

export function fretCount(fretBoard: FretBoard): number {
  return(flow(x => map(x,"fret"),
	      max)(fretBoard));
}

export function stringCount(fretBoard: FretBoard) {
  return(new Set(fretBoard.map( note => note.string)).size);
}

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
