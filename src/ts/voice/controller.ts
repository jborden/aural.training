import { drawVoiceGraph } from './view'

export function voiceGraph(parentDiv: HTMLElement) {
  function render(freq?:number):void {
    parentDiv.innerHTML = null;
    drawVoiceGraph(parentDiv,300,300,freq,//97.99,415.3)
		   261.63,1046.5)
  }

  function signalListener(e: any):void {
    const freq = e.detail.frequency;
    render(freq);
  }
  addEventListener('audioSignal',signalListener);

  render();
}
