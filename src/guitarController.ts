function addClass(els: NodeList, newClass: string) {
  // https://github.com/microsoft/TypeScript/issues/38616#issue-619575752
  els.forEach(el => { (<Element>el).classList.add(newClass) })
}

export function guitarController() {
  addClass(document.querySelectorAll("[class*='note']"),"hide")
}
