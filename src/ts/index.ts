import {startAudio, stopAudio, logListener, audioMonitorToggleButton} from "./audioMonitor"
import { drawGuitar } from "./guitar/view"
import { guitarController, notePluckListener, step} from "./guitar/controller"
import { createFretBoard, standardTuning} from "./guitar/model"
import { range } from "lodash-es";
import { guessNotes } from "./guitar-note-trainer/controller"
import { newGuitarNoteTrainerEvent, showEvents } from "./dexie/db"
import { voiceGraph } from "./voice/controller"
import { guessIntervals } from "./guitar-interval-trainer/controller"
import { noteMonitorPing, stepNoteMonitorEvents } from "./note-monitor-events"
import { freqNote, noteFreq } from "./music/western/model"

// required to be exported
exports = {startAudio, stopAudio, freqNote, noteFreq}
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
// //guessNotes(document.querySelector("#guitar-note-trainer"),fretBoard,guessNotesFretsRange,guessNotesStringRange);
// guessIntervals(document.querySelector("#guitar-interval-trainer"),["m2","M2"])
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
voiceGraph(document.querySelector("#voice"))

/********************END VOICE********************/
