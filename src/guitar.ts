import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js'

export function guitarSvg(parentDiv: HTMLElement, strings = 6, frets = 22, canvasWidth = 1000) {
  let canvasWidthPadding = 20;
  let fretSpacing = Math.round(canvasWidth / frets)
  let draw = SVG().addTo(parentDiv).size(canvasWidth + canvasWidthPadding, 300)
  // draw strings
  for (let i = 0; i < strings; i++) {
    draw.line(0, 0, 1000, 0)
      .move(20, 20 + (i * 20))
      .stroke({ color: 'grey', width: 3, linecap: 'round' })
  }

  // draw frets
  for (let i = 0; i < frets + 1; i++) {
      draw.line(0,0,0,20 * (strings - 1))
	.move(20 + (i * fretSpacing),20)
	.stroke({ color: 'grey', width: 3, linecap: 'round'})
  }

  // draw nut
  draw.line(0,0,0,20 * (strings - 1))
    .move(25,20)
    .stroke({ color: 'grey', width: 3, linecap: 'round'})

}
