import { SVG, Svg } from '@svgdotjs/svg.js'
import {fretCount, stringCount, FretBoard, GuitarNote} from "./model"
import { noteFreq } from "../music/western/model"
import { max,map,flow } from "lodash-es"


// Paul Tol colors https://personal.sron.nl/~pault/
const paulTolColors = ["#332288", "#6699cc", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#661100", "#cc6677", "#aa4466", "#882255", "#aa4499"];
function drawStrings(svg: Svg, fretBoard: FretBoard, svgWidth: number) {

  for (let i = 0; i < stringCount(fretBoard); i++) {
    svg.line(0, 0, svgWidth, 0)
      .move(20, 20 + (i * 20))
      .stroke({ color: 'grey', width: 3, linecap: 'round' })
  }
}

function drawFrets(svg: Svg, fretBoard: FretBoard, fretSpacing: number) {

  for (let i = 0; i < fretCount(fretBoard) + 1; i++) {
    svg.line(0,0,0,20 * (stringCount(fretBoard) - 1))
	.move(20 + (i * fretSpacing),20)
	.stroke({ color: 'grey', width: 3, linecap: 'round'})
  }
}

function drawNut(svg: Svg, fretBoard: FretBoard) {
  svg.line(0,0,0,20 * (stringCount(fretBoard) - 1))
    .move(25,20)
    .stroke({ color: 'grey', width: 3, linecap: 'round'})
}

function drawInlays(svg: Svg, fretBoard: FretBoard, fretSpacing: number) {
  const stringHeight = stringCount(fretBoard) * 20;
  const diameter = 10;
  const radius = diameter / 2;
  // quick, but hacky solution
  const inlayVals = new Set();
  [3, 5, 7, 9, 15, 17, 19, 21, 27, 29, 31, 33].reduce((s, e) => s.add(e), inlayVals);
  const octaveVals = new Set();
  [12, 24, 36].reduce((s, e) => s.add(e), octaveVals);
  // draw inlays
  for (let i = 0; i < fretCount(fretBoard) + 1; i++) {
    // octave
    if (octaveVals.has(i)) {
      // top 
      svg.circle(diameter).move(fretSpacing * i - (fretSpacing / 4) + radius, (20 * 2) + radius)
      // bottom
      svg.circle(diameter).move(fretSpacing * i - (fretSpacing / 4) + radius, (stringHeight - (20 * 2)) + radius)
    }
    // non-octave
    if (inlayVals.has(i)) {
      svg.circle(diameter).move(fretSpacing * i - (fretSpacing / 4) + radius, stringHeight / 2 + radius)
    }
  }
}

function noteColor(octave: number) {
  return paulTolColors[((octave + 3) * 2) % 12];
}

function drawNote(svg: Svg, currentNote:GuitarNote, fretSpacing: number, diameter: number) {
  const {note,octave,string,fret} = currentNote;
  const radius = diameter / 2;
  const freq = Math.round(noteFreq(note,octave));
  const x = fretSpacing * fret;
  // note circle
  svg.circle(diameter)
    .move(x,(diameter * string) - radius)
    .stroke({color: noteColor(octave)})
    .fill({ color: noteColor(octave)})
    .addClass(`note-${note}`)
    .addClass(`octave-${octave}`)
    .addClass(`freq-${freq}`);
  // note text
  svg.text(`${note}${octave}`)
    .move(x,(diameter * string) - radius)
    .font({ family:   'Helvetica',
	    size:     '0.75em',
	    weight: 'bold'})
    .addClass(`note-${note}`)
    .addClass(`octave-${octave}`)
    .addClass(`freq-${freq}`);
  // plucked note
  svg.circle(diameter)
    .move(x,(diameter * string) - radius)
    .stroke({ color: "white",
	      width: 2})
    .fill({color: "none"})
    .addClass(`plucked`)
    .addClass(`note-${note}`)
    .addClass(`octave-${octave}`)
    .addClass(`freq-${freq}`);
}

function drawNotes(svg: Svg, fretBoard: FretBoard, fretSpacing: number) {
  const diameter = 20;

  map(fretBoard,
      currentNote => drawNote(svg,currentNote,fretSpacing,diameter))
}

export function drawGuitar(parentDiv: HTMLElement,
			   fretBoard: FretBoard,
			   svgWidth = 1000) {
  const svgWidthPadding = 20;
  const frets = flow(x => map(x,"fret"),
		     max)(fretBoard);
  const fretSpacing = Math.round(svgWidth / frets)
  let svg = SVG().addTo(parentDiv).size(svgWidth + svgWidthPadding, 300)
  // draw the guitar
  drawInlays(svg,fretBoard,fretSpacing);
  drawFrets(svg,fretBoard,fretSpacing);
  drawNut(svg,fretBoard);
  drawStrings(svg,fretBoard,svgWidth);
  drawNotes(svg,fretBoard,fretSpacing);
}
