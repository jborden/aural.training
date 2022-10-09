import { Note } from "./guitar/model"

export function currentNote(note: Note) {
  return(`<div id=guitar-note-trainer-current-note>${note.note}${note.octave}</div>`);
}
