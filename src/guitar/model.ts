const tones = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

class StringTuning {
  note: string
  octave: number
  string: number
}

type InstrumentTuning = [StringTuning];

class Note {
  note: string
  string: number
  octave: number
  fret: number
}

type FretBoard = [Note];

function createNote(stringTuning: StringTuning, fret: number) {
  let note = new Note()
  note = {note: stringTuning.note,
	  octave: stringTuning.octave,
	  string: stringTuning.string,
	  fret: fret}
  return note;
}

function createStringNotes(stringTuning: StringTuning, frets: number) {
  let firstNote = createNote(stringTuning,0);

  let stringNotes = [];
  let currentOctave = stringTuning.octave;

  stringNotes.push(firstNote);
  for (let i = 1; i < frets + 1; i++) {
    let tone = tones[(i + tones.indexOf(stringTuning.note)) % 12];
    if (tone == "C") { currentOctave++};
    let note = new Note();
    note = {note: tone,
	    octave: currentOctave,
	    string: stringTuning.string,
	    fret: i};
    stringNotes.push(note);
  }
  return stringNotes;
}

function createFretboard(tuning: Tuning, frets: Number) {
  let currentFretboard:FretBoard;
  for (let stringTuning of tuning) {
    currentFretboard.push(createStringNotes(stringTuning, frets));
    
    
    
  }
  
}
