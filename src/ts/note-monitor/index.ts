type Note = {
  note: string;
  octave: number;
};

export class NoteMonitor {
  private noteMap: Map<string, { lastSeen: number; totalTime: number }> = new Map();

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
        if (totalTime >= 300) {
          this.fireEvent(observedNote, octave, totalTime);
        }
      } else {
	this.noteMap.set(currentNoteKey, { lastSeen: currentTime, totalTime: 0})
      }
    } else {
      // console.log(`I never saw ${currentNoteKey}`)
      this.noteMap.set(currentNoteKey, { lastSeen: currentTime, totalTime: 0 });
    }
  }

  private fireEvent(note: string, octave: number, threshold: number) {
    // Trigger your custom event here
    const eventDetail = { note, octave, threshold };
    // Replace the next line with your actual event firing mechanism
    console.log('!!!!!!!Custom Event Fired:', eventDetail);
  }

  startListening() {
    addEventListener('audioMonitor/filterAudioSignal', (event: CustomEvent<Note>) => {
      this.handleNotePlucked(event.detail);
    });
  }
}
