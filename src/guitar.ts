import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js'

export function guitarSvg(parentDiv: HTMLElement, strings = 6) {
  console.log("hi I should be drawing")
  console.log(parentDiv)
  let draw = SVG().addTo(parentDiv).size(1000, 300)
  // draw strings
  for (let i = 0; i < strings; i++) {
    draw.line(0, 0, 1900, 0)
      .move(20, 20 + (i * 20))
      .stroke({ color: 'grey', width: 3, linecap: 'round' })
  }

}
