//import {startAudio, stopAudio, audioMonitorToggleButton} from "./audioMonitor"
import {createTabs } from "./tabs/index"
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
import { AudioMonitorToggleButton, monitoring } from "./tuner"
import { PopOver } from "./popover"

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
createTabs(data, container, 1);


//popup
const popoverContainer = document.getElementById('popover-container') as HTMLElement;
new PopOver(popoverContainer);
const content = document.createElement('div');
content.innerHTML = `<h2>Hello world!</h2>`;
const content2 = document.createElement('h2');
content2.textContent = "hello foo!";
popoverContainer.appendChild(content);
popoverContainer.appendChild(content2);

// debug

const eventsToMonitor = ["tuner/note-heard"];

eventsToMonitor.forEach((eventName) => {
  listenForEvent(eventName, (detail: any) => `${detail.note}${detail.octave}`);
});

