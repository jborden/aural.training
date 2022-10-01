import {startAudio, stopAudio, logListener} from "./audioMonitor"
import { guitarSvg } from "./guitar"
import { guitarController } from "./guitarController"

// required to be exported
exports = {startAudio, stopAudio}
// listener for the bottom
addEventListener('audioSignal',logListener);
// add guitar
// drop-D tuning
const dropDTuning = [{note: "E", octave: 4},
		     {note: "B", octave: 3},
		     {note: "G", octave: 3},
		     {note: "D", octave: 3},
		     {note: "A", octave: 2},
		     {note: "E", octave: 2}]
// https://en.wikipedia.org/wiki/Seven-string_guitar#Tuning
const standard7String = [{note: "E", octave: 4},
			 {note: "B", octave: 3},
			 {note: "G", octave: 3},
			 {note: "D", octave: 3},
			 {note: "A", octave: 2},
			 {note: "E", octave: 2},
			 {note: "B", octave:1}]
//guitarSvg(document.querySelector("#guitar"),7,12,standard7String);
guitarSvg(document.querySelector("#guitar"),6,12);
//guitarController();
