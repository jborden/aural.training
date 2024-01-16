import { AudioMonitorEventDetail } from "../audioMonitor";

export class NoteMonitor {
  private isObserving: boolean = false;
  private note: { note: string, octave: number } | null = null;
  private threshold = 1000; // in milliseconds
  private silenceThreshold = 300; // in milliseconds, adjust as needed

  constructor() {
    this.handleNotePlucked = this.handleNotePlucked.bind(this);
  }

  private publishNoteEvent() {
    if (this.note) {
      const eventDetail = {
        note: this.note.note,
        octave: this.note.octave,
        threshold: this.threshold,
      };

      // Emit your custom event here
      // Example: document.dispatchEvent(new CustomEvent("note-monitor-events/noteSeenAtThreshold", { detail: eventDetail }));
      console.log("!!!!!!!!!!Note seen at threshold:", eventDetail);
    }
  }

  private checkForSilence() {
    setTimeout(() => {
      this.isObserving = false;
      this.note = null;
    }, this.silenceThreshold);
  }

  public handleNotePlucked(note: AudioMonitorEventDetail) {
    // Extract only the relevant properties
    const { note: observedNote, octave } = note;
    const currentNote = { note: observedNote, octave };

    if (!this.isObserving) {
      this.isObserving = true;
      this.note = currentNote;
      this.publishNoteEvent();
      this.checkForSilence();
    } else {
      // Continue observing subsequent notes
      this.note = currentNote;
    }
  }

  public startListening() {
    addEventListener('audioMonitor/filterAudioSignal', (event: CustomEvent<AudioMonitorEventDetail>) => {
      this.handleNotePlucked(event.detail);
    });
  }
}
