import { SVG, Svg } from '@svgdotjs/svg.js'

function drawBox(svg: Svg,height: number,boxWidth:number,boxPadding:number) {
  //bottom
  svg.line(0+boxPadding,height-boxPadding,boxWidth,height-boxPadding)
    .stroke({color: 'grey', width: 3, linecap: 'round'});
  // left
  svg.line(0+boxPadding,0+boxPadding,0+boxPadding,height-boxPadding)
    .stroke({color: 'grey', width: 3, linecap: 'round'});
  // top
  svg.line(0+boxPadding,0+boxPadding,boxWidth,0+boxPadding)
    .stroke({color: 'grey', width: 3, linecap: 'round'});
  // right
  svg.line(boxWidth,0+boxPadding,boxWidth,height-boxPadding)
  //   .move(boxWidth,0)
    .stroke({color: 'grey', width: 2, linecap: 'round'});
}

function drawFreq(svg: Svg,height, boxWidth,boxPadding,freq,min,max) {
  
  const minY = height - boxPadding;
  const maxY = boxPadding;
  const actualHeight = (minY - maxY);
  const freqMultiplier = actualHeight / (max - min);
  const freqY = maxY + (freqMultiplier * (max - freq))
  console.log({freq: freq, freqY: freqY, freqMultiplier: freqMultiplier})
  svg.line(0+boxPadding,freqY,boxWidth,freqY)
    .stroke({color: 'red', width: 3});
}
export function drawVoiceGraph(parentDiv: HTMLElement,
			       width:number = 300,
			       height:number = 300,
			       freq:number,
			       min:number,
			       max:number) {
  const padding = 20;
  const boxPadding = 20;
  let svg = SVG().addTo(parentDiv).size(width + padding, height);
  const boxWidth = 100;
  drawBox(svg,height,boxWidth,boxPadding);
  drawFreq(svg,height,boxWidth,boxPadding,(freq|min),min,max);
}
