import React from 'react';
import { range } from 'lodash-es'; // Import any necessary libraries
import { createFretBoard, standardTuning} from "./guitar/model"
import { drawGuitar } from "./guitar/view"

function GuitarNoteTrainer() {
  // Create React elements and JSX for the Guitar Note Trainer
  const fretsRange = range(0, 2);
  const fretBoard = createFretBoard(standardTuning, 12); // Assuming createFretBoard is a valid function

  const fretBoardDiv = document.createElement('div');
  // Create the SVG content using your drawGuitar function
  drawGuitar(fretBoardDiv, fretBoard);
  
  return (
    <div>
      <div id="guitar-note-trainer">
        {/* Your Guitar Note Trainer JSX here */}
        {/* You can use React components or JSX to build the content */}
      </div>
      <div dangerouslySetInnerHTML={{ __html: fretBoardDiv.outerHTML }} />
      <div>
        {/* Container div for guessNotes */}
        { /* guessNotes() */}
      </div>
    </div>
  );
}

export default GuitarNoteTrainer;
