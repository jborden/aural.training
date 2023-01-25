import { drawVoiceGraph } from './view'
import { noteFreq } from "../music/western/model"

export function voiceGraph(parentDiv: HTMLElement) {
  function render(freq:number = noteFreq({note: "G", octave:2})):void {
    parentDiv.innerHTML = '';
    drawVoiceGraph(parentDiv,300,300,freq,
		   noteFreq({note: "G", octave:2}),
		   noteFreq({note: "G", octave:4}))
  }

  function signalListener(e: any):void {
    const freq = e.detail.frequency;
    render(freq);
  }
  addEventListener('audioSignal',signalListener);

  render();
}
