import { Interval, WesternIntervals } from "../music/western/model";
import { renderCurrentInterval, renderIsGuessCorrect, renderReplayButton } from "./view";
import { sample, isEqual } from "lodash-es";
import { selectIntervals } from "./model";
import { intervalDistance, noteSequenceIntervals, GuitarNote } from "../guitar/model";
import { playInterval, playIntervalSequence } from "../tones";
import { GuessNoteEvent } from "../events/types";
import { publishEvent } from "../events/main";
import { isElementActiveById } from "../tabs/index";

export class IntervalTrainer {
  private parentDiv: HTMLElement;
  private requestedIntervals: Interval[];
  private numberIntervals: number;
  private notesPlayed: GuitarNote[];
  private guessIsCorrect: boolean | null;
  private selectedIntervals: Interval[];
  private addEventListenerCallback: (e: any) => void;
  private monitoring: boolean;
  
  constructor(parentDiv: HTMLElement, intervals:string[], monitoring: boolean, numberIntervals = 1) {
    this.parentDiv = parentDiv;
    this.numberIntervals = numberIntervals;
    this.requestedIntervals = [WesternIntervals[1],WesternIntervals[2]];
    this.notesPlayed = [];
    this.guessIsCorrect = null;
    this.monitoring = monitoring;
    this.selectedIntervals = selectIntervals(intervals);

    this.addEventListenerCallback = this.guessIntervalsAudioSignalListener.bind(this);
    addEventListener('tuner/note-heard', this.guessIntervalsAudioSignalListener.bind(this));
    addEventListener("audioMonitor/start", this.newInterval.bind(this));

    // This is just a quick hack because we took out audioMonitor.ts
    // Properly, we should have a way to cleanup objects when a tab is
    // clicked on
    // this.monitoring = false;
    // if (this.monitoring) {
    //   this.newInterval();
    // }
  }

  setIntervals() {
    this.requestedIntervals = [];
    for (let i = 0; i < this.numberIntervals; i++) {
      this.requestedIntervals.push(sample(this.selectedIntervals));
    }
  }

  initializeState() {
    this.setIntervals();
    this.guessIsCorrect = null;
  }

  playSelectedInterval() {
    if (this.monitoring) {
      playIntervalSequence(this.requestedIntervals);
    }
  }

  newInterval() {
    this.initializeState();
    this.render();
    this.playSelectedInterval();
  }

  guessIntervalsAudioSignalListener(e: any) {
    if (isElementActiveById("guitar-interval-trainer-tab")) {
      this.notesPlayed.push(e.detail.note);

      if (this.notesPlayed.length === (this.requestedIntervals.length + 1)) {
        // Check to see if the guess is correct
        if (isEqual(this.requestedIntervals.map((v) => v.semitones), noteSequenceIntervals(this.notesPlayed))) {
          this.guessIsCorrect = true;
        } else {
          this.guessIsCorrect = false;
        }

        // Because we're done with this set, set the intervals
        this.setIntervals();
        this.playSelectedInterval();

        // Reset the notesPlayed array
        this.notesPlayed = [];
      }

      this.render();
    }
  }

  render() {
    const selectedIntervalDiv = renderCurrentInterval(this.requestedIntervals);
    const guessHTML = renderIsGuessCorrect(this.guessIsCorrect);
    this.parentDiv.innerHTML = `<div class='text'>${selectedIntervalDiv} ${guessHTML}</div>`;
    this.parentDiv.append(renderReplayButton(this.playSelectedInterval.bind(this)));
  }

  destroy() {
    removeEventListener('note-monitor-event/noteSeenTimeSeenMin', this.addEventListenerCallback);
  }
}

export default IntervalTrainer;
