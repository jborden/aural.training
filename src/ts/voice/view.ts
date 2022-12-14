import { SVG, Svg } from '@svgdotjs/svg.js'
import { freqNoteRange,freqNote } from '../music/western/model'

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

function drawFreq(svg: Svg,height:number, boxWidth:number,boxPadding:number,freq:number,min:number,max:number) {
  const noteName = freqNote(freq).note + freqNote(freq).octave;
  const minY = height - boxPadding;
  const maxY = boxPadding;
  const actualHeight = (minY - maxY);
  const freqMultiplier = actualHeight / (max - min);
  const freqY = maxY + (freqMultiplier * (max - freq))
  let freqDeviationPercent = Math.abs(freqNote(freq).deviation / freq);
  let noteColor = "white";
  if (freqDeviationPercent > 0.10) {
    noteColor = "red";
  } else if ( 0.05 < freqDeviationPercent && freqDeviationPercent < 0.10) {
    noteColor = "yellow";
  } else {
    noteColor = "green";
  }

  svg.line(0+boxPadding,freqY,boxWidth,freqY)
    .stroke({color: 'red', width: 3});
  svg.text(noteName)
    .font({ family: 'Helvetica',
	    size: '0.75em',
	    color: 'gray'})
    .stroke({color: noteColor})
    .fill({color: 'white'})
    .move(boxWidth/2,freqY-15);
}

function drawNote(svg: Svg, boxPadding:number, boxWidth:number, noteName:string, y: number) {
  svg.text(noteName)
    .move(boxWidth+5,y - (boxPadding * 2))
    .font({ family: 'Helvetica',
	    size: '0.75em',
	    color: 'gray'})
    .stroke({color: 'gray'})
    .fill({color: 'gray'})
}

function drawNotes(svg:Svg, height: number, boxWidth: number,boxPadding: number, min: number, max: number) {
  const notes = freqNoteRange(min,max);
  const noteDistance = height / notes.length;
  notes.map((v,i) =>
    {
      drawNote(svg,boxPadding,boxWidth,String(v.note + " " + v.octave),height-(i*noteDistance));
    })
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
  drawFreq(svg,height,boxWidth,boxPadding,freq||min,min,max);
  drawNotes(svg,height,boxWidth,boxPadding,min,max);
}
