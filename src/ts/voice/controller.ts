import { drawVoiceGraph } from './view'
import { noteFreq } from "../music/western/model"

export function voiceGraph(parentDiv: HTMLElement) {
  function render(freq?:number):void {
    parentDiv.innerHTML = null;
    drawVoiceGraph(parentDiv,300,300,freq,
		   noteFreq("G",2),
		   noteFreq("G",4))
  }

  function signalListener(e: any):void {
    const freq = e.detail.frequency;
    render(freq);
  }
  addEventListener('audioSignal',signalListener);

  render();
}
