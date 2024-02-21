//import {startAudio, stopAudio, audioMonitorToggleButton} from "./audioMonitor"
import { Tabs } from "./tabs/index"
import { drawGuitar } from "./guitar/view"
import { step} from "./guitar/controller"
import { createFretBoard, standardTuning} from "./guitar/model"
import { range } from "lodash-es";
import { GuessNotes } from "./guitar-note-trainer/controller";
//import { newGuitarNoteTrainerEvent, showEvents } from "./dexie/db"
import { voiceGraph } from "./voice/controller"
import { IntervalTrainer } from "./guitar-interval-trainer/controller"
//import { freqNote, noteFreq,freqNoteRange } from "./music/western/model"
import { listenForEvent } from "./events/main"
import { AudioMonitorToggleButton, monitoring } from "./tuner";
import { PopOver } from "./popover";
import { PopoverManager } from "./popover-manager";
import { SliderControl } from "./slider-control";

export const soundMonitorTextEnable = "Enable Mic"
export const soundMonitorTextDisable = "Disable Mic"
//exports = {startAudio, stopAudio, freqNote, noteFreq,freqNoteRange}

window.requestAnimationFrame(step);
let toggleButton = new AudioMonitorToggleButton(document.querySelector("#audio-monitor-toggle-button"));
addEventListener('keyup',(event) => { if ( event.key === " ") { toggleButton.audioMonitorToggleButton()}})
// drop-D tuning
// const dropDTuning = [{note: "E", octave: 4},
// 		     {note: "B", octave: 3},
// 		     {note: "G", octave: 3},
// 		     {note: "D", octave: 3},
// 		     {note: "A", octave: 2},
// 		     {note: "D", octave: 2}]
// // https://en.wikipedia.org/wiki/Seven-string_guitar#Tuning
// const standard7String = [{note: "E", octave: 4},
// 			 {note: "B", octave: 3},
// 			 {note: "G", octave: 3},
// 			 {note: "D", octave: 3},
// 			 {note: "A", octave: 2},
// 			 {note: "E", octave: 2},
// 			 {note: "B", octave:1}]

const data = [
  {title: 'Guitar Note Trainer',
   id: "guitar-note-trainer-tab",
   content: () => {
     // root div
     const noteTrainerRoot = document.createElement('div');
     // noteTrainer
     const guitarNoteTrainerDiv = document.createElement('div');
     guitarNoteTrainerDiv.id = 'guitar-note-trainer';
     const fretsRange = range(0,1);
     const fretBoard = createFretBoard(standardTuning, 12);
     new GuessNotes(guitarNoteTrainerDiv, fretBoard, monitoring, fretsRange,range(0,5));
     noteTrainerRoot.appendChild(guitarNoteTrainerDiv);
     // fretboard view
     const fretBoardDiv = document.createElement('div');
     drawGuitar(fretBoardDiv,fretBoard);
     noteTrainerRoot.appendChild(fretBoardDiv);
     return noteTrainerRoot;
  }},
  {title: 'Guitar Interval Trainer',
   id: "guitar-interval-trainer-tab",
   content: () => {
     // root div
     const guitarIntervalTrainer = document.createElement('div');
     // interval trainer
     const intervalTrainerDiv = document.createElement('div');
     intervalTrainerDiv.id = 'guitar-interval-trainer';
     new IntervalTrainer(intervalTrainerDiv,["m2","M2"], monitoring)
     guitarIntervalTrainer.append(intervalTrainerDiv);
     // fretboardiv
     const fretBoard = createFretBoard(standardTuning, 12);
     const fretBoardDiv = document.createElement('div');
     drawGuitar(fretBoardDiv,fretBoard);
     guitarIntervalTrainer.appendChild(fretBoardDiv);
     return guitarIntervalTrainer;
  }},
  {title: 'Voice Trainer',
   id: "voice-trainer-tab",
   content: () => {
     const voiceTrainerDiv = document.createElement('voice');
     voiceTrainerDiv.id = 'voice-trainer';
     voiceGraph(voiceTrainerDiv);
     return voiceTrainerDiv;
  }}
  // ... more tabs data
]

// tabs
const container = document.getElementById('tabs-container') as HTMLElement;
new Tabs(data, container, 1);

// popover
const popoverContainer = document.getElementById('popover-container') as HTMLElement;
new PopOver(popoverContainer);
const popoverManager = new PopoverManager(popoverContainer);

// note display
const noteDisplay = document.createElement('div');
noteDisplay.classList.add("text");
noteDisplay.id = "note-display";
popoverManager.getPopoverActive().append(noteDisplay);

const previousNoteDisplay = document.createElement('div');
previousNoteDisplay.classList.add("text");
previousNoteDisplay.id = "previous-note-display";
popoverManager.getPopoverActive().append(previousNoteDisplay);


// Sliders

// Create the smoothing count threshold slider
new SliderControl(
  popoverManager.getPopoverActive(),
  'Smoothing Count Threshold',
  toggleButton.tuner.smoothingCountThreshold,
  1,
  100,
  (value: number) => toggleButton.tuner.smoothingCountThreshold = value
);

new SliderControl(
  popoverManager.getPopoverActive(),
  'Smoothing Threshold',
  toggleButton.tuner.smoothingThreshold,
  1,
  100,
  (value: number) => toggleButton.tuner.smoothingThreshold = value
);

new SliderControl(
  popoverManager.getPopoverActive(),
  'Root Mean Square Cutoff',
  toggleButton.tuner.rootMeanSquareCutoff,
  0.01,
  1,
  (value: number) => toggleButton.tuner.rootMeanSquareCutoff = value,
  0.01
);


new SliderControl(
  popoverManager.getPopoverActive(),
  'Auto Correlate Threshold',
  toggleButton.tuner.autoCorrelateThreshold,
  0.001,
  0.100,
  (value: number) => toggleButton.tuner.autoCorrelateThreshold = value,
  0.001 // this seems to be too small for SlideControl
);


const eventsToMonitor = ["tuner/note-heard"];

eventsToMonitor.forEach((eventName) => {
  listenForEvent(eventName, (detail: any) => `${detail.note}${detail.octave}`);
});

