import { Interval } from "../music/western/model"
import { renderCurrentInterval, renderIsGuessCorrect, renderReplayButton } from "./view"
import { sample,isNull, isEqual} from "lodash-es"
import { currentNoteName, currentNoteFirstSeenTimeStamp } from "../audioMonitor"
import { selectIntervals } from "./model"
import { intervalDistance, Note } from "../guitar/model"
import { monitoring } from "../audioMonitor"
import { playInterval } from "../tones"
import { GuessNoteEvent } from "../events/types"
import { publishEvent } from "../events/main"

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
  let selectedInterval:Interval = null;
  let guessIsCorrect: boolean = null;
  let lastNotePlayed: Note = null;
  const selectedIntervals = selectIntervals(intervals);

  function setInterval():void {
    selectedInterval = sample(selectedIntervals);
  }

  function initializeState():void {
    setInterval();
    guessIsCorrect = null;
    lastNotePlayed = null;
  }

  function playSelectedInterval():void {
    if (monitoring){
      playInterval(selectedInterval);
    }
  }

  function newInterval():void {
    initializeState();
    render();
    playSelectedInterval();
  }

  function guessIntervalsAudioSignalListener(e: any): void {
    // the last time this note was seen
    let timeSeen: number = e.timeStamp - currentNoteFirstSeenTimeStamp;
    // the deviation of the frequency from the note
    let deviation = Math.abs(e.detail.deviation);
    // when the current note name is not null, we are within our tolerances and a guess hasn't been made
    if (selectedInterval && (timeSeen > timeSeenMin) && isNull(guessIsCorrect) && (deviation < deviationTolerance))
    {
      let { note, octave } = e.detail;
      let  signalNoteName = {note: note,
			     octave: octave};
      // there isn't a previous note
      if (isNull(lastNotePlayed)) {
	lastNotePlayed = signalNoteName;
      }
      // This can't handle unison interval
      else if (!isNull(lastNotePlayed) && !isEqual(lastNotePlayed,signalNoteName)) {
	guessIsCorrect = selectedInterval.semitones === intervalDistance(lastNotePlayed, signalNoteName)
	lastNotePlayed = null;
	// publishEvent("guitar-note-trainer/guess-note",
	// 	     createGuessNoteEventDetail(currentNote, e.detail))
      }
      render();
    }
    //essentially, we are using muted strings to trigger the next
    //note request selection
    else if (!currentNoteName && (timeSeen > 300) && !isNull(guessIsCorrect)) {
      newInterval();
      render();
    }

  }

  function render(): void {
    let selectedIntervalDiv = renderCurrentInterval(selectedInterval);
    let guessHTML = renderIsGuessCorrect(guessIsCorrect);
    parentDiv.innerHTML = `<div>${selectedIntervalDiv} ${guessHTML}</div>`;
    parentDiv.append(renderReplayButton(playSelectedInterval))
  }

  addEventListener('audioSignal', guessIntervalsAudioSignalListener);
  addEventListener("audioMonitor/start",newInterval);
}
