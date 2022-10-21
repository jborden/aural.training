function addClass(els: NodeList, newClass: string) {
  // https://github.com/microsoft/TypeScript/issues/38616#issue-619575752
  if (els){
    els.forEach(el => { (<Element>el).classList.add(newClass) })
  }
}

function setAllAttributes(els: NodeList, name: string, value: string) {
  // https://github.com/microsoft/TypeScript/issues/38616#issue-619575752
  if (els) {
    els.forEach(el => { (<Element>el).setAttribute(name,value) })
  }
}

// below is based off of
// https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame#examples
let start:DOMHighResTimeStamp, previousTimeStamp:DOMHighResTimeStamp;

function processPluckedCircle(el: Element, deltaT: DOMHighResTimeStamp) {
  let strokeOpacity = el.getAttribute("stroke-opacity")
  let strokeOpacityNumber = parseFloat(strokeOpacity)
  const chi = 0.01 // Χ, after Χρόνος aka chronos

  if (strokeOpacityNumber > 0) {
    strokeOpacityNumber -= deltaT * chi;
    strokeOpacityNumber = strokeOpacityNumber < 0 ? 0 : strokeOpacityNumber;
    el.setAttribute("stroke-opacity",strokeOpacityNumber.toString());
  }
}

export function step(timestamp: DOMHighResTimeStamp) {
  if (start === undefined) {
    start = timestamp;
    }
  if (previousTimeStamp !== timestamp) {
    Array.from(document.querySelectorAll('.plucked')).map( el => processPluckedCircle(el,timestamp - previousTimeStamp))
  }

  previousTimeStamp = timestamp;
  window.requestAnimationFrame(step);
}

export function notePluckListener(e: any) {
  if (e) {
    let {note, octave} = e.detail;
    let query = `.plucked.note-${note}.octave-${octave}`;
    query = query.replace("#","\\#");
    setAllAttributes(document.querySelectorAll(query),"stroke-opacity", "1")
  }
}

export function guitarController() {
  //addClass(document.querySelectorAll("[class*='note']"),"  // make all plucked notes 0% opacity at begining
  setAllAttributes(document.querySelectorAll("[class*='plucked']"),"stroke-opacity","0")
}
