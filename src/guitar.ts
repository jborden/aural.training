import { SVG, Svg } from '@svgdotjs/svg.js'

// Paul Tol colors https://personal.sron.nl/~pault/
const paulTolColors = ["#332288", "#6699cc", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#661100", "#cc6677", "#aa4466", "#882255", "#aa4499"];
//const paulTolColors = ["#BBCCEE", "#CCEEFF", "#CCDDAA", "#EEEEBB", "#FFCCCC", "#DDDDDD", "#222255", "#225555", "#225522", "#666633", "#663333", "#555555"]
function createStrings(svg: Svg, strings = 6) {

  for (let i = 0; i < strings; i++) {
    svg.line(0, 0, 1000, 0)
      .move(20, 20 + (i * 20))
      .stroke({ color: 'grey', width: 3, linecap: 'round' })
  }
}

function createFrets(svg: Svg, strings = 6, frets = 22, fretSpacing: number) {
  for (let i = 0; i < frets + 1; i++) {
      svg.line(0,0,0,20 * (strings - 1))
	.move(20 + (i * fretSpacing),20)
	.stroke({ color: 'grey', width: 3, linecap: 'round'})
  }
}

function createNut(svg: Svg, strings = 6) {
  svg.line(0,0,0,20 * (strings - 1))
    .move(25,20)
    .stroke({ color: 'grey', width: 3, linecap: 'round'})
}

function createInlays(svg: Svg, strings = 6, frets = 22, fretSpacing: number) {
  let stringHeight = strings * 20;
  let diameter = 10;
  let radius = diameter / 2;
  // quick, but hacky solution
  let inlayVals = new Set();
  [3, 5, 7, 9, 15, 17, 19, 21, 27, 29, 31, 33].reduce((s, e) => s.add(e), inlayVals);
  let octaveVals = new Set();
  [12, 24, 36].reduce((s, e) => s.add(e), octaveVals);
  // draw inlays
  for (let i = 0; i < frets + 1; i++) {
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
  //return paulTolColors[semitones.indexOf(note)];
  return paulTolColors[((octave + 3) * 2) % 12];
}

const semitones = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

export function noteFreq(note: string, octave: number){
  // f = 2^(n/12)*440
  // https://pages.mtu.edu/~suits/NoteFreqCalcs.html
  // https://codepen.io/enxaneta/post/frequencies-of-musical-notes
  const Afreq = 440.0
  let nDeltaNote =  semitones.indexOf(note) - semitones.indexOf("A");
  let nDeltaOctave = (octave - 4) * 12;
  let n = nDeltaNote + nDeltaOctave;
  return Math.pow(2,n/12)*Afreq;
}

function drawNote(svg: Svg, string: number, x: number, note: string, octave: number, diameter: number) {
  let radius = diameter / 2;
  let freq = Math.round(noteFreq(note,octave));
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

function createStringNotes(svg: Svg, string: number, frets: number, fretSpacing: number, openNote: string, openNoteOctave: number) {
  let diameter = 20;
  // draw notes for open strings
  drawNote(svg,string,2,openNote,openNoteOctave,diameter);
  let currentOctave = openNoteOctave;
  for (let i = 1; i < frets + 1; i++) {
    let note = semitones[(i + semitones.indexOf(openNote)) % 12];
    if (note == "C") { currentOctave++ };
    drawNote(svg,string,fretSpacing * i, note, currentOctave, diameter);
  }
}

export function guitarSvg(parentDiv: HTMLElement,
			  strings = 6,
			  frets = 22,
			  tuning = [{note: "E", octave: 4},
				    {note: "B", octave: 3},
				    {note: "G", octave: 3},
				    {note: "D", octave: 3},
				    {note: "A", octave: 2},
				    {note: "E", octave: 2}],
			  svgWidth = 1000) {
  let svgWidthPadding = 20;
  let fretSpacing = Math.round(svgWidth / frets)
  let svg = SVG().addTo(parentDiv).size(svgWidth + svgWidthPadding, 300)
  // draw the guitar
  createInlays(svg,strings,frets,fretSpacing);
  createFrets(svg,strings,frets,fretSpacing);
  createNut(svg,strings);
  createStrings(svg,strings);
  for (let i = 0; i < tuning.length; i++){
    createStringNotes(svg,i+1,frets,fretSpacing,tuning[i].note,tuning[i].octave);
  }
}
