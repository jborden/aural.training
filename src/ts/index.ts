import {startAudio, stopAudio, logListener, audioMonitorToggleButton} from "./audioMonitor"
import {createTabs } from "./tabs/index"
import { drawGuitar } from "./guitar/view"
import { guitarController, notePluckListener, step} from "./guitar/controller"
import { createFretBoard, standardTuning} from "./guitar/model"
import { range } from "lodash-es";
import { guessNotes } from "./guitar-note-trainer/controller"
import { newGuitarNoteTrainerEvent, showEvents } from "./dexie/db"
import { voiceGraph } from "./voice/controller"
import { guessIntervals } from "./guitar-interval-trainer/controller"
import { noteMonitorPing, stepNoteMonitorEvents } from "./note-monitor-events"
import { freqNote, noteFreq,freqNoteRange } from "./music/western/model"
import { listenForEvent } from "./events/main"

// required to be exported
exports = {startAudio, stopAudio, freqNote, noteFreq,freqNoteRange}
// listener for the bottom
addEventListener('audioSignal',logListener);
addEventListener('audioSignal',notePluckListener);
// listener for the note-monitor-events
addEventListener("audioMonitor/filterAudioSignal", noteMonitorPing);
// init step function
window.requestAnimationFrame(step);
window.requestAnimationFrame(stepNoteMonitorEvents);
let toggleButton = new audioMonitorToggleButton(document.querySelector("#audio-monitor-toggle-button"));
addEventListener('keyup',(event) => { if ( event.key === " ") { toggleButton.audioMonitorToggleButton()}})
/**************************************************
*
* guitar
*
**************************************************/
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
// const fretBoard = createFretBoard(standardTuning, 12);
// const guessNotesFretsRange = range(0,2);
// //console.log(guessNotesFretsRange)
// const guessNotesStringRange = range(0,7);
// drawGuitar(document.querySelector("#guitar"),fretBoard);
// guitarController();
/********************END GUITAR********************/

/**************************************************
*
* events
*
**************************************************/
//showEvents()

/********************END EVENTS*******************/

/**************************************************
*
* voice
*
**************************************************/

/********************END VOICE********************/
const data = [
  {title: 'Guitar Note Trainer',
   id: "guitar-note-trainer-tab",
   content: () => {
    // root div
    const noteTrainerRoot = document.createElement('div');
    // noteTrainer
    const guitarNoteTrainerDiv = document.createElement('div');
    guitarNoteTrainerDiv.id = 'guitar-note-trainer';
    const fretsRange = range(0,2);
    const fretBoard = createFretBoard(standardTuning, 12);
    guessNotes(guitarNoteTrainerDiv,fretBoard,fretsRange,range(0,5));
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
    guessIntervals(intervalTrainerDiv,["m2","M2"]);
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


const container = document.getElementById('tabs-container') as HTMLElement;
createTabs(data, container);

// debug


const eventsToMonitor = ["guitar-note-trainer/guess-note"];

eventsToMonitor.forEach((eventName) => {
  console.log(`I am trying for ${eventName}`);
  listenForEvent(eventName);
});
