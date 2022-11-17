import { drawVoiceGraph } from './view'

export function voiceGraph(parentDiv: HTMLElement) {
  function render(freq?:number):void {
    parentDiv.innerHTML = null;
    drawVoiceGraph(parentDiv,300,300,freq,98.3,400)
  }

  function signalListener(e: any):void {
    const freq = e.detail.frequency;
    render(freq);
  }
  addEventListener('audioSignal',signalListener);

  render();
}
