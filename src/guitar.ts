import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js'

export function guitarSvg(parentDiv: HTMLElement) {
  console.log("hi I should be drawing")
  console.log(parentDiv)
  let draw = SVG().addTo(parentDiv).size(300, 300)
  draw.rect(100, 100).attr({ fill: '#f06' });
}
