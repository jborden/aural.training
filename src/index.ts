import {startAudio, stopAudio, logListener} from "./audioMonitor"
import { guitarSvg } from "./guitar"

// required to be exported
exports = {startAudio, stopAudio}
// listener for the bottom
addEventListener('audioSignal',logListener);
// add guitar
guitarSvg(document.querySelector("#guitar"))