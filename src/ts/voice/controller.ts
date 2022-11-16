import { drawVoiceGraph } from './view'

export function voiceGraph(parentDiv: HTMLElement) {
  function render():void {
    drawVoiceGraph(parentDiv)
  }
  render();
}
