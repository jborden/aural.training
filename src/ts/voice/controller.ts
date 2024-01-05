import { drawVoiceGraph } from './view'
import { noteFreq } from "../music/western/model"
import { isElementActiveById } from "../tabs/index"

export function voiceGraph(parentDiv: HTMLElement) {
  function render(freq?:number):void {
    if (isElementActiveById("voice-trainer-tab")) {
      parentDiv.innerHTML = null;
      drawVoiceGraph(parentDiv,300,300,freq,
		     noteFreq({note: "G", octave:2}),
		     noteFreq({note: "G", octave:4}))
    }
  }

  function signalListener(e: any):void {
    const freq = e.detail.frequency;
    render(freq);
  }
  addEventListener('audioSignal',signalListener);

  render();
}
