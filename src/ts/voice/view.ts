import { SVG, Svg } from '@svgdotjs/svg.js'

function drawBox(svg: Svg,height: number) {
  const width = 100;
  const padding = 20;
  //bottom
  svg.line(0+padding,height-padding,width,height-padding)
    //.move(0,0)
    .stroke({color: 'grey', width: 3, linecap: 'round'});
  // left
  svg.line(0+padding,0+padding,0+padding,height-padding)
    .stroke({color: 'grey', width: 3, linecap: 'round'});
  // top
  svg.line(0+padding,0+padding,width,0+padding)
    .stroke({color: 'grey', width: 3, linecap: 'round'});
  // right
  svg.line(width,0+padding,width,height-padding)
  //   .move(width,0)
    .stroke({color: 'grey', width: 2, linecap: 'round'});
}

export function drawVoiceGraph(parentDiv: HTMLElement,
			       svgWidth = 300) {
  const svgWidthPadding = 20;
  const height = 300;
  let svg = SVG().addTo(parentDiv).size(svgWidth + svgWidthPadding, height);
  drawBox(svg,height);
}
