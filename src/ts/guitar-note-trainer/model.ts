import { FretBoard, GuitarNote } from "../guitar/model"
import { flow,filter,isUndefined,isEmpty,includes } from "lodash-es"

// get a subselection of notes from a range of frets
export function selectNotes(fretBoard: FretBoard, frets?: number[], strings?: number[]):FretBoard {

  const filterFret = (fretBoard: FretBoard) => filter(fretBoard,(note:GuitarNote) => {
    if (isUndefined(frets) || isEmpty(frets)) {
      return true;
    } else {
      return(includes(frets,note.fret));
    }});

  const filterStrings = (fretBoard: FretBoard) => filter(fretBoard,(note:GuitarNote) => {
    if (isUndefined(strings) || isEmpty(strings)) {
      return true;
    } else {
      return(includes(strings, note.string));
    }});

  return(flow(filterFret,filterStrings))(fretBoard);
}
