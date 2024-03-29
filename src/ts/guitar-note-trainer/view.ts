import { GuitarNote } from "../guitar/model"

export function renderCurrentNote(note: GuitarNote) {
  return(`<div id=guitar-note-trainer-current-note>${note.note}${note.octave}</div>`);
}

export function renderIsGuessCorrect(correct: boolean) {
  let html = '';
  switch(correct) {
    case (null):
      html = `<div></div>`;
      break;
    case (false):
      html = `<div class='guitar-note-trainer-incorrect flash-element'>Incorrect Guess</div>`;
      break;
    case (true):
      html = `<div class='guitar-note-trainer-correct flash-element text-green'>Correct!</div>`;
      break;
  }
  return html;
}
