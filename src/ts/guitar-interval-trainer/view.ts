import { Interval } from "../music/western/model"

export function renderCurrentInterval(interval: Interval) {
  return(`<div id=guitar-interval-trainer-current-interval>${interval.abbreviation}</div>`);
}

export function renderIsGuessCorrect(correct: boolean) {
  let html = '';
  switch(correct) {
    case (null):
      html = `<div></div>`;
      break;
    case (false):
      html = `<div class='guitar-interval-trainer-incorrect'>Incorrect Guess</div>`;
      break;
    case (true):
      html = `<div class='guitar-interval-trainer-correct'>Correct!</div>`;
      break;
  }
  return html;
}
