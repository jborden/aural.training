import {startAudio, stopAudio, logListener} from "./audioMonitor"
import { drawGuitar } from "./guitar/view"
import { guitarController, notePluckListener, step} from "./guitar/controller"
import { createFretBoard, standardTuning} from "./guitar/model"
import { range } from "lodash-es";
import { guessNotes } from "./guitar-note-trainer/controller"

// required to be exported
exports = {startAudio, stopAudio}
// listener for the bottom
addEventListener('audioSignal',logListener);
addEventListener('audioSignal',notePluckListener);
// add guitar
// drop-D tuning
const dropDTuning = [{note: "E", octave: 4},
		     {note: "B", octave: 3},
		     {note: "G", octave: 3},
		     {note: "D", octave: 3},
		     {note: "A", octave: 2},
		     {note: "D", octave: 2}]
// https://en.wikipedia.org/wiki/Seven-string_guitar#Tuning
const standard7String = [{note: "E", octave: 4},
			 {note: "B", octave: 3},
			 {note: "G", octave: 3},
			 {note: "D", octave: 3},
			 {note: "A", octave: 2},
			 {note: "E", octave: 2},
			 {note: "B", octave:1}]
const fretBoard = createFretBoard(standardTuning, 12);
const guessNotesFretsRange = range(0,5);
const guessNotesStringRange = range(0,7);
drawGuitar(document.querySelector("#guitar"),fretBoard);
guitarController();
guessNotes(document.querySelector("#guitar-note-trainer"),fretBoard,guessNotesFretsRange,guessNotesStringRange);
window.requestAnimationFrame(step);
