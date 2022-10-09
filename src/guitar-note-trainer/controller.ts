import { selectNotes } from "./model"
import { FretBoard } from "./guitar/model"
import { currentNote } from "./view"
import { sample } from "lodash-es"


export function guessNotes(parentDiv: HTMLElement, fretBoard: FretBoard, frets?: number[], strings?: number[]) {
  const subFretBoard: FretBoard = selectNotes(fretBoard, frets, strings);
  let selectedNoteHTML = currentNote(sample(subFretBoard))
  parentDiv.innerHTML = `<div>${selectedNoteHTML}</div>`;
}
