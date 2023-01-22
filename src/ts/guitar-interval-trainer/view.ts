import { Interval } from "../music/western/model"

export function renderCurrentInterval(intervals: Interval[]) {
  let intervalsString = '';

  for(let i = 0; i < intervals.length ; i++) {
    intervalsString += intervals[i].abbreviation;
    intervalsString += ' ';
  }
  return(`<div id=guitar-interval-trainer-current-interval>${intervalsString}</div>`);
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

export function renderReplayButton(replayFunction: Function) {
  let element = document.createElement('button');
  element.innerHTML = 'Replay Interval';
  element.classList.add('button-54');
  element.addEventListener('click',() => {replayFunction()});
  return element;
}
