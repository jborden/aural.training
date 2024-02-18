import { Interval, WesternIntervals } from "../music/western/model";
import { renderCurrentInterval, renderIsGuessCorrect, renderReplayButton } from "./view";
import { sample, isEqual } from "lodash-es";
import { selectIntervals } from "./model";
import { intervalDistance, noteSequenceIntervals, GuitarNote } from "../guitar/model";
import { playInterval, playIntervalSequence } from "../tones";
import { GuessNoteEvent } from "../events/types";
import { publishEvent } from "../events/main";
import { isElementActiveById } from "../tabs/index";
import { soundMonitorTextEnable } from "../index"
import { popoverOpen } from "../popover"

export class IntervalTrainer {
  private parentDiv: HTMLElement;
  private requestedIntervals: Interval[];
  private numberIntervals: number;
  private notesPlayed: GuitarNote[];
  private guessIsCorrect: boolean | null;
  private selectedIntervals: Interval[];
  private addEventListenerCallback: (e: any) => void;
  private monitoring: {value: boolean};
  private popoverOpen: boolean;
  
  constructor(parentDiv: HTMLElement, intervals:string[], monitoring: {value: boolean}, numberIntervals = 1) {
    this.parentDiv = parentDiv;
    this.numberIntervals = numberIntervals;
    this.notesPlayed = [];
    this.guessIsCorrect = null;
    this.monitoring = monitoring;
    this.selectedIntervals = selectIntervals(intervals);
    this.popoverOpen = popoverOpen;
    this.addEventListenerCallback = this.guessIntervalsAudioSignalListener.bind(this);
    this.popoverOpenListener = this.popoverOpenListener.bind(this);

    addEventListener('tuner/note-heard', this.guessIntervalsAudioSignalListener.bind(this));
    addEventListener("tuner/monitoring", this.monitoringListener.bind(this));
    addEventListener("popover/open", this.popoverOpenListener);

    this.initializeState();
    this.render();
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
    if (this.monitoring.value) {
      playIntervalSequence(this.requestedIntervals);
    }
  }

  newInterval() {
    this.initializeState();
    this.render();
    this.playSelectedInterval();
  }

  guessIntervalsAudioSignalListener(e: any) {
    if (isElementActiveById("guitar-interval-trainer-tab") && this.monitoring.value && !this.popoverOpen) {
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

  private monitoringListener(event: CustomEvent) {
    const { monitoring } = event.detail;
    if (isElementActiveById("guitar-interval-trainer-tab") && monitoring) {
      this.newInterval();
    } else {
      this.render();
    }
  }
  private generateCirclesHTML() {
    const requestedCount = this.requestedIntervals.length + 1;
    const playedCount = this.notesPlayed.length;
    // const emptyNote = `<span class="note">&#9833;</span>`; // Unicode for MUSIC FLAT SIGN
    // const filledNote = `<span class="note">&#9833;</span>`; // Unicode for MUSIC NATURAL SIGN
    const emptyNote = `<span class="quarter note"></span>`;
    const filledNote = `<span class="quarter note filled"></span>`;
    // const emptyNote = `<span class="circle"></span>`;
    // const filledNote = `<span class="circle filled"></span>`;
    //let circlesHTML = '';
    let notesHTML = '';

    // Filling circles based on notes played
    for (let i = 0; i < requestedCount; i++) {
      if (i < playedCount) {
	notesHTML += filledNote;
        //circlesHTML += filledCircle;
      } else {
	notesHTML += emptyNote;
        //circlesHTML += emptyCircle;
        }
    }

    //return circlesHTML;
    return notesHTML;
  }

  private render() {
    if (this.monitoring.value) {
      const selectedIntervalDiv = renderCurrentInterval(this.requestedIntervals);
      const guessHTML = renderIsGuessCorrect(this.guessIsCorrect);
      const circlesHTML = this.generateCirclesHTML();
      if (this.popoverOpen) {
	this.parentDiv.innerHTML = `<div class='text'>Tuner Adjustment, Paused</div>`;
      } else {
	this.parentDiv.innerHTML = `<div class='text'>${selectedIntervalDiv} ${guessHTML} ${circlesHTML}</div>`;
      }
      this.parentDiv.append(renderReplayButton(this.playSelectedInterval.bind(this)));
    } else {
      this.parentDiv.innerHTML = `<div class='text'>Please click '${soundMonitorTextEnable}' Button</div>`;
    }
  }

  private popoverOpenListener(event: CustomEvent): void {
    const { open } = event.detail;
    this.popoverOpen = open;
    this.render();
  }

  destroy() {
    removeEventListener('tuner/note-heard', this.addEventListenerCallback);
    removeEventListener("tuner/monitoring", this.monitoringListener);
    removeEventListener("popover/open", this.popoverOpenListener);
  }
}

export default IntervalTrainer;
