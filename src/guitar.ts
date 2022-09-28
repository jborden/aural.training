import { SVG, extend as SVGextend, Element as SVGElement, Svg } from '@svgdotjs/svg.js'

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

export function guitarSvg(parentDiv: HTMLElement, strings = 6, frets = 22, svgWidth = 1000) {
  let svgWidthPadding = 20;
  let fretSpacing = Math.round(svgWidth / frets)
  let svg = SVG().addTo(parentDiv).size(svgWidth + svgWidthPadding, 300)
  // draw the guitar
  createInlays(svg,strings,frets,fretSpacing);
  createFrets(svg,strings,frets,fretSpacing);
  createNut(svg,strings);
  createStrings(svg,strings);



}
