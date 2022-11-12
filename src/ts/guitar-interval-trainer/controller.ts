import { Interval, WesternIntervals } from "../music/western/model"
import { renderCurrentInterval, renderIsGuessCorrect, renderReplayButton } from "./view"
import { sample,isNull, isEqual} from "lodash-es"
import { currentNoteName, currentNoteFirstSeenTimeStamp } from "../audioMonitor"
import { selectIntervals } from "./model"
import { intervalDistance, Note } from "../guitar/model"
import { monitoring } from "../audioMonitor"
import { playInterval, playIntervalSequence } from "../tones"
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

export function guessIntervals(parentDiv: HTMLElement, intervals: string[],numberIntervals: number = 1) {
  let requestedIntervals:Interval[] = [];
  let notesPlayed: Note[] = [];
  let guessIsCorrect: boolean = null;

  const selectedIntervals = selectIntervals(intervals);

  function setIntervals():void {
    // requestedIntervals = [];
    // for(let i = 0; i < numberIntervals ; i++) {
    //   requestedIntervals.push(sample(selectedIntervals));
    // }
    requestedIntervals = [WesternIntervals[11],
			  WesternIntervals[11],
			  //WesternIntervals[1],
			  //WesternIntervals[11]
			 ]
  }

  function initializeState():void {
    setIntervals();
    guessIsCorrect = null;
  }

  function playSelectedInterval():void {
    if (monitoring){
      playIntervalSequence(requestedIntervals);
      // requestedIntervals.map((interval,i) =>
      // 	{
      // 	  playInterval(interval, (i * 0.5));
      // 	})
    }
  }

  function newInterval():void {
    initializeState();
    render();
    playSelectedInterval();
  }

  // function guessIntervalsAudioSignalListener(e: any): void {
    
  //   notesPlayed.push(e.detail.note);
   
  //   if (notesPlayed.length ===  (numberIntervals + 1)) {
  //     // check to see if the guess is correct
  //     if (intervalDistance(notesPlayed[0],notesPlayed[1]) ===
  // 	requestedIntervals[0].semitones) {
  // 	guessIsCorrect = true
  //     } else {
  // 	guessIsCorrect = false
  //     }
  //     // because we're done with this set, set the intervals
  //     setIntervals();
  //     playSelectedInterval();
  //     // .. and reset the notesPlayed array
  //     notesPlayed = [];
  //   }

  //   render();
  // }

  function render(): void {
    let selectedIntervalDiv = renderCurrentInterval(requestedIntervals);
    let guessHTML = renderIsGuessCorrect(guessIsCorrect);
    parentDiv.innerHTML = `<div>${selectedIntervalDiv} ${guessHTML}</div>`;
    parentDiv.append(renderReplayButton(playSelectedInterval))
  }

  //addEventListener('note-monitor-event/noteSeenTimeSeenMin', guessIntervalsAudioSignalListener);
  addEventListener("audioMonitor/start",newInterval);
}
