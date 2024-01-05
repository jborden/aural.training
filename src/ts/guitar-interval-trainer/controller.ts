import { Interval, WesternIntervals } from "../music/western/model"
import { renderCurrentInterval, renderIsGuessCorrect, renderReplayButton } from "./view"
import { sample,isNull, isEqual} from "lodash-es"
import { currentNoteName, currentNoteFirstSeenTimeStamp } from "../audioMonitor"
import { selectIntervals } from "./model"
import { intervalDistance, noteSequenceIntervals, GuitarNote } from "../guitar/model"
import { monitoring } from "../audioMonitor"
import { playInterval, playIntervalSequence } from "../tones"
import { GuessNoteEvent } from "../events/types"
import { publishEvent } from "../events/main"
import { isElementActiveById } from "../tabs/index"
// function createGuessNoteEventDetail(noteAsked: GuitarNote, noteGiven: GuitarNote): GuessNoteEvent {

//   return({noteAsked: noteAsked,
// 	  noteGiven: noteGiven,
// 	  timestamp: Date.now(),
// 	  uuid: crypto.randomUUID(),
// 	  correctGuess: (noteAsked === noteGiven),
// 	  type: "guitar-note-trainer/guess-note"})
// }

export function guessIntervals(parentDiv: HTMLElement, intervals: string[],numberIntervals: number = 1) {
  let requestedIntervals:Interval[] = [];
  let notesPlayed: GuitarNote[] = [];
  let guessIsCorrect: boolean = null;

  const selectedIntervals = selectIntervals(intervals);

  function setIntervals():void {
    requestedIntervals = [];
    for(let i = 0; i < numberIntervals ; i++) {
      requestedIntervals.push(sample(selectedIntervals));
    }
    // requestedIntervals = [WesternIntervals[1],
    // 			  WesternIntervals[2],
    // 			  WesternIntervals[1],
    // 			  WesternIntervals[1]
    // 			 ]
  }

  function initializeState():void {
    setIntervals();
    guessIsCorrect = null;
  }

  function playSelectedInterval():void {
    if (monitoring){
      playIntervalSequence(requestedIntervals);
    }
  }

  function newInterval():void {
    initializeState();
    render();
    playSelectedInterval();
  }

  function guessIntervalsAudioSignalListener(e: any): void {

    if (isElementActiveById("guitar-interval-trainer-tab")) {
    
      notesPlayed.push(e.detail.note);
   
      if (notesPlayed.length ===  (requestedIntervals.length + 1)) {
	// check to see if the guess is correct
	if (isEqual(requestedIntervals.map((v) => { return v.semitones} ),
		    noteSequenceIntervals(notesPlayed))) {
	  guessIsCorrect = true
	} else
	{
	  guessIsCorrect = false
	}
	// because we're done with this set, set the intervals
	setIntervals();
	playSelectedInterval();
	// .. and reset the notesPlayed array
	notesPlayed = [];
      }
      render();
    }
  }

  function render(): void {
    let selectedIntervalDiv = renderCurrentInterval(requestedIntervals);
    let guessHTML = renderIsGuessCorrect(guessIsCorrect);
    parentDiv.innerHTML = `<div class='text'>${selectedIntervalDiv} ${guessHTML}</div>`;
    parentDiv.append(renderReplayButton(playSelectedInterval))
  }

  addEventListener('note-monitor-event/noteSeenTimeSeenMin', guessIntervalsAudioSignalListener);
  addEventListener("audioMonitor/start",newInterval);
  if (monitoring) {
    newInterval();
  }
}
