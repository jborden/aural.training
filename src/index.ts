import {startAudio, stopAudio, logListener} from "./audioMonitor"
import { drawGuitar } from "./guitar/view"
import { guitarController, notePluckListener, step} from "./guitar/controller"
import { createFretBoard, standardTuning} from "./guitar/model"

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
//guitarSvg(document.querySelector("#guitar"),7,12,standard7String);
drawGuitar(document.querySelector("#guitar"),6,12);
guitarController();
console.log(createFretBoard(standardTuning,12))
window.requestAnimationFrame(step);
