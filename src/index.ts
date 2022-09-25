import {startAudio, stopAudio, logListener} from "./audioMonitor"

export { startAudio, stopAudio };

// listener for the bottom
addEventListener('audioSignal',logListener);
