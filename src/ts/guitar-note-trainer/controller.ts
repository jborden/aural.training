import { selectNotes } from "./model"
import { FretBoard,GuitarNote,noteName } from "../guitar/model"
import { renderCurrentNote, renderIsGuessCorrect } from "./view"
import { sample } from "lodash-es"
import { GuessNoteEvent } from "../events/types"
import { publishEvent } from "../events/main"
import { isElementActiveById } from "../tabs/index"
import { NoteObserved } from "../tuner"

export class GuessNotes {
  private subFretBoard: FretBoard;
  private guessIsCorrect: boolean | null;
  private currentNote: GuitarNote | null;
  private currentNoteTimeAsked: Date | null;
  private parentDiv: HTMLElement;

  constructor(parentDiv: HTMLElement, fretBoard: FretBoard, frets?: number[], strings?: number[]) {
    this.subFretBoard = selectNotes(fretBoard, frets, strings);
    this.guessIsCorrect = null;
    this.parentDiv = parentDiv;
    this.setCurrentNote();
    this.render();
    this.anonymousListener = this.anonymousListener.bind(this);
    addEventListener('tuner/note-heard',this.anonymousListener);
  }

  private setCurrentNote(): void {
    this.currentNote = sample(this.subFretBoard);
    this.currentNoteTimeAsked = new Date();
  }

  private createGuessNoteEventDetail(noteAsked: GuitarNote, noteGiven: GuitarNote): GuessNoteEvent {
  return({noteAsked: noteAsked,
	  noteGiven: noteGiven,
	  timestamp: Date.now(),
	  uuid: crypto.randomUUID(),
	  correctGuess: (noteAsked === noteGiven),
	  type: "guitar-note-trainer/guess-note"})
  }
  
  private guessNotesAudioSignalListener(noteHeard: NoteObserved): void {
    // check to see if the tab is active
    if (isElementActiveById("guitar-note-trainer-tab")) {
      //const note: GuitarNote = {note: noteObserved.note, octave: noteObserved.octave};
      
      if (noteName(noteHeard) === noteName(this.currentNote) && (noteHeard.timestamp > this.currentNoteTimeAsked)) {
	this.guessIsCorrect = true;
	publishEvent("guitar-note-trainer/guess-note",
		     this.createGuessNoteEventDetail(this.currentNote, noteHeard))
      } else {
	this.guessIsCorrect = false;
	publishEvent("guitar-note-trainer/guess-note",
		     this.createGuessNoteEventDetail(this.currentNote, noteHeard))
      }
      this.setCurrentNote();
      this.render();
    }
  }

  private render(): void {
    let selectedNoteHTML = renderCurrentNote(this.currentNote);
    let guessHTML = renderIsGuessCorrect(this.guessIsCorrect);
    this.parentDiv.innerHTML = `<div class='text'>${selectedNoteHTML} ${guessHTML}</div>`;
  }

  // create a listener for note events
  // const noteMonitor = new NoteMonitor();
  // noteMonitor.startListening();

  private anonymousListener(e: any): void {
    const { detail }: { detail: NoteObserved } = e;
    if (detail) {
      this.guessNotesAudioSignalListener(detail);
    }
  }

}
