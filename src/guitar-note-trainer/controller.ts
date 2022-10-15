import { selectNotes } from "./model"
import { FretBoard,Note,noteName } from "../guitar/model"
import { renderCurrentNote, renderIsGuessCorrect } from "./view"
import { sample,isNull} from "lodash-es"
import { currentNoteName, currentNoteFirstSeenTimeStamp } from "../audioMonitor"

let currentNote: Note = null;
let guessIsCorrect: boolean = null;

interface GuessNoteEvent {
  noteAsked: string,
  noteGiven: string,
  timestamp: number,
  uuid: string,
  type: string
}

function createGuessNoteEventDetail(noteAsked: string, noteGiven: string): GuessNoteEvent {

  return({noteAsked: noteAsked,
	  noteGiven: noteGiven,
	  timestamp: Date.now(),
	  uuid: crypto.randomUUID(),
	  type: "guitar-note-trainer/guess-note"})
}



export function guessNotes(parentDiv: HTMLElement, fretBoard: FretBoard, frets?: number[], strings?: number[]) {
  let timeSeenMin = 100;
  let deviationTolerance = 1;
  const subFretBoard: FretBoard = selectNotes(fretBoard, frets, strings);
  currentNote = sample(subFretBoard);
  render();

  function guessNotesAudioSignalListener(e: any): void {
    // the last time this note was seen
    let timeSeen: number = e.timeStamp - currentNoteFirstSeenTimeStamp;
    // the deviation of the frequency from the note
    let deviation = Math.abs(e.detail.deviation);
    // when the current note name is not null, we are within our tolerances and a guess hasn't been made
    if (currentNoteName && (timeSeen > timeSeenMin) && isNull(guessIsCorrect) && (deviation < deviationTolerance))
    {
      const signalNoteName = noteName(e.detail);
      if (signalNoteName === noteName(currentNote)) {
	guessIsCorrect = true;
	
      } else {
	guessIsCorrect = false;
      }
      render();
    }
    // essentially, we are using muted strings to trigger the next
    // note request selection
    else if (!currentNoteName && (timeSeen > 300) && !isNull(guessIsCorrect)) {
      currentNote = sample(subFretBoard);
      guessIsCorrect = null;
      render();
    }
  }

  function render(): void {
    let selectedNoteHTML = renderCurrentNote(currentNote);
    let guessHTML = renderIsGuessCorrect(guessIsCorrect);
    parentDiv.innerHTML = `<div>${selectedNoteHTML} ${guessHTML}</div>`;
  }

  addEventListener('audioSignal', guessNotesAudioSignalListener);
}
