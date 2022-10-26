import { Interval } from "../music/western/model"
import { renderCurrentInterval, renderIsGuessCorrect } from "./view"
import { sample,isNull} from "lodash-es"
import { currentNoteName, currentNoteFirstSeenTimeStamp } from "../audioMonitor"
import { selectIntervals } from "./model"
import { GuessNoteEvent } from "../events/types"
import { publishEvent } from "../events/main"

let selectedInterval:Interval  = null;
let guessIsCorrect: boolean = null;

// function createGuessNoteEventDetail(noteAsked: Note, noteGiven: Note): GuessNoteEvent {

//   return({noteAsked: noteAsked,
// 	  noteGiven: noteGiven,
// 	  timestamp: Date.now(),
// 	  uuid: crypto.randomUUID(),
// 	  correctGuess: (noteAsked === noteGiven),
// 	  type: "guitar-note-trainer/guess-note"})
// }

export function guessIntervals(parentDiv: HTMLElement, intervals: string[]) {
  let timeSeenMin = 100;
  let deviationTolerance = 1;
  //const subFretBoard: FretBoard = selectNotes(fretBoard, frets, strings);
  const selectedIntervals = selectIntervals(intervals);
  selectedInterval = sample(selectedIntervals);
  render();

  function guessIntervalsAudioSignalListener(e: any): void {
    // the last time this note was seen
    let timeSeen: number = e.timeStamp - currentNoteFirstSeenTimeStamp;
    // the deviation of the frequency from the note
    let deviation = Math.abs(e.detail.deviation);
    // when the current note name is not null, we are within our tolerances and a guess hasn't been made
    // if (currentNoteName && (timeSeen > timeSeenMin) && isNull(guessIsCorrect) && (deviation < deviationTolerance))
    // {
    //   const signalNoteName = noteName(e.detail);
    //   if (signalNoteName === noteName(currentNote)) {
    // 	guessIsCorrect = true;
    // 	// publishEvent("guitar-note-trainer/guess-note",
    // 	// 	     createGuessNoteEventDetail(currentNote, e.detail))
    //   } else {
    // 	guessIsCorrect = false;
    // 	// publishEvent("guitar-note-trainer/guess-note",
    // 	// 	     createGuessNoteEventDetail(currentNote, e.detail))
    //   }
    //   render();
    // }
    // // essentially, we are using muted strings to trigger the next
    // // note request selection
    // else if (!currentNoteName && (timeSeen > 300) && !isNull(guessIsCorrect)) {
    //   currentNote = sample(subFretBoard);
    //   guessIsCorrect = null;
    //   render();
    // }
    render();
  }

  function render(): void {
    let selectedIntervalDiv = renderCurrentInterval(selectedInterval);
    let guessHTML = renderIsGuessCorrect(guessIsCorrect);
    parentDiv.innerHTML = `<div>${selectedIntervalDiv} ${guessHTML}</div>`;
  }

  addEventListener('audioSignal', guessIntervalsAudioSignalListener);
}
