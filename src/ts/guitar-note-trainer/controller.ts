import { selectNotes } from "./model"
import { FretBoard,GuitarNote,noteName } from "../guitar/model"
import { renderCurrentNote, renderIsGuessCorrect } from "./view"
import { sample } from "lodash-es"
import { GuessNoteEvent } from "../events/types"
import { publishEvent } from "../events/main"

let currentNote: GuitarNote = null;
let guessIsCorrect: boolean = null;

function createGuessNoteEventDetail(noteAsked: GuitarNote, noteGiven: GuitarNote): GuessNoteEvent {
  return({noteAsked: noteAsked,
	  noteGiven: noteGiven,
	  timestamp: Date.now(),
	  uuid: crypto.randomUUID(),
	  correctGuess: (noteAsked === noteGiven),
	  type: "guitar-note-trainer/guess-note"})
}

export function guessNotes(parentDiv: HTMLElement, fretBoard: FretBoard, frets?: number[], strings?: number[]) {
  const subFretBoard: FretBoard = selectNotes(fretBoard, frets, strings);
  currentNote = sample(subFretBoard);
  render();

  function guessNotesAudioSignalListener(e: any): void {
    const { note } = e.detail;
    if (noteName(note) === noteName(currentNote)) {
	guessIsCorrect = true;
	publishEvent("guitar-note-trainer/guess-note",
		     createGuessNoteEventDetail(currentNote, note))
      } else {
	guessIsCorrect = false;
	publishEvent("guitar-note-trainer/guess-note",
		     createGuessNoteEventDetail(currentNote, note))
      }
    currentNote = sample(subFretBoard);
    render();
  }

  function render(): void {
    let selectedNoteHTML = renderCurrentNote(currentNote);
    let guessHTML = renderIsGuessCorrect(guessIsCorrect);
    parentDiv.innerHTML = `<div>${selectedNoteHTML} ${guessHTML}</div>`;
  }

  addEventListener('note-monitor-event/noteSeenTimeSeenMin', guessNotesAudioSignalListener);
}
