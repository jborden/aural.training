import { FretBoard, Note } from "../guitar/model"
import { flow,filter,isUndefined,isEmpty,includes } from "lodash-es"

// get a subselection of notes from a range of frets
export function getNotes(fretBoard: FretBoard, frets?: number[], strings?: number[]) {

  const filterFret = (fretBoard: FretBoard) => filter(fretBoard,(note:Note) => {
    if (isUndefined(frets) || isEmpty(frets)) {
      return true;
    } else {
      return(includes(frets,note.fret));
    }});

  const filterStrings = (fretBoard: FretBoard) => filter(fretBoard,(note:Note) => {
    if (isUndefined(strings) || isEmpty(strings)) {
      return true;
    } else {
      return(includes(strings, note.string));
    }});

  return(flow(filterFret,filterStrings))(fretBoard);
}
