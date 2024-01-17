import { publishEvent } from "../events/main"

type Note = {
  note: string;
  octave: number;
};

export type NoteObserved = Note & {
  ms: number;
}

export class NoteMonitor {
  private noteMap: Map<string, { lastSeen: number; totalTime: number }> = new Map();
  private threshold: number;

  constructor(threshold: number = 300) {
    this.threshold = threshold;
  }

  handleNotePlucked(note: Note) {
    const { note: observedNote, octave } = note;
    const currentNoteKey = `${observedNote}${octave}`;

    const currentTime = Date.now();
    if (this.noteMap.has(currentNoteKey)) {
      const { lastSeen, totalTime } = this.noteMap.get(currentNoteKey)!;

      const duration = currentTime - lastSeen;
      // console.log(`currentNoteKey: ${currentNoteKey}, lastSeen: ${lastSeen}, totalTime: ${totalTime}, currentTime: ${currentTime} duration: ${duration}`)
      
      if (duration <= 100) {
        this.noteMap.set(currentNoteKey, { lastSeen: currentTime, totalTime: totalTime + duration });
        if (totalTime >= this.threshold) {
          this.fireEvent({note: observedNote, octave: octave, ms: totalTime});
        }
      } else {
	this.noteMap.set(currentNoteKey, { lastSeen: currentTime, totalTime: 0})
      }
    } else {
      this.noteMap.set(currentNoteKey, { lastSeen: currentTime, totalTime: 0 });
    }
  }

  private handleNotePluckedCallback = (event: CustomEvent<Note>) => {
    this.handleNotePlucked(event.detail);
  };

  private fireEvent(eventDetail: NoteObserved) {
    publishEvent("note-monitor/note-observed", eventDetail)
  }

  startListening() {
    addEventListener('audioMonitor/filterAudioSignal',
		     this.handleNotePluckedCallback);
  }

  stopListening() {
    removeEventListener('audioMonitor/filterAudioSignal',
			this.handleNotePluckedCallback);
  }
}
