/*
The MIT License (MIT)
Copyright (c) 2014 Chris Wilson
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Note: autoCorrelate comes from https://github.com/cwilso/PitchDetect/pull/23
with the above license.

This code is from Alexander Ellis:  https://alexanderell.is/posts/tuner/tuner.js
It is demo'd here: https://alexanderell.is/posts/tuner/

Converted to TS by James Borden, using same MIT license
*/
import { publishEvent } from "./events/main"
import { soundMonitorTextDisable, soundMonitorTextEnable } from "./index"

type Note = {
  note: string;
  octave: number;
};

export type NoteObserved = Note & {
  timestamp: Date;
}

export let monitoring = {value: false}

export class AudioAnalyzer {
  private source: MediaStreamAudioSourceNode | undefined;
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  // private canvas: HTMLCanvasElement | null;
  // private canvasContext: CanvasRenderingContext2D | null;
  private animationFrameId: number;
  private WIDTH: number | undefined;
  private HEIGHT: number | undefined;
  //private drawVisual: number | undefined;
  //private drawNoteVisual: number | undefined;
  private previousValueToDisplay: number | string = 0;
  private smoothingCount: number = 0;
  public smoothingThreshold: number = 5;
  public smoothingCountThreshold: number = 5;
  public rootMeanSquareCutoff: number = 0.010;
  public autoCorrelateThreshold: number = 0.2;
  private noteStrings: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  private roundingValue: string = "note"; // "none", "hz", "note"
  private smoothingValue: string = "basic"; // "none", "basic", "very"
  private valueToDisplay: string | number;
  private note: string | undefined;
  private octave: number | undefined;
  private noteCounts: { [key: string]: number } = {};
  private notesNotHeard: string  = "NO NOTES HEARD";

  constructor() {
    monitoring.value = false;
  }

  private noteFromPitch( frequency: number ) {
      var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
      return Math.round( noteNum ) + 69;
  }

  private octaveFromPitch( frequency: number ) {
    // this is from freelizer lib , but is standard music theory.
    // https://github.com/sablevsky/freelizer
    const CONCERT_PITCH = 440 //frequency of a fixed note, which is used as a standard for tuning. It is usually a standard (also called concert) pitch of 440 Hz, which is called A440 or note A in the one-line (or fourth) octave (A4)
    const A = 2 ** (1 / 12) // the twelth root of 2 = the number which when multiplied by itself 12 times equals 2 = 1.059463094359...
    const C0_PITCH = 16.35 // frequency of lowest note: C0
    const N = Math.round(12 * Math.log2(frequency / CONCERT_PITCH)) // the number of half steps away from the fixed note you are. If you are at a higher note, n is positive. If you are on a lower note, n is negative.
    const Fn = CONCERT_PITCH * A ** N // the frequency of the note n half steps away of concert pitch
    return Math.floor(Math.log2(Fn / C0_PITCH))

  }

  private updateNoteDisplay(valueToDisplay: string) {
    if (valueToDisplay === this.notesNotHeard) {
      this.noteCounts = {}; // Reset note counts
      return valueToDisplay;
    } else {
      if (!this.noteCounts) {
	this.noteCounts = {}; // Initialize note counts object
      }

      // Increment count for the current note value
      this.noteCounts[valueToDisplay] = (this.noteCounts[valueToDisplay] || 0) + 1;

      // Check if count is greater than 1, then display the count
      const count = this.noteCounts[valueToDisplay];
      const displayedValue = count > 1 ? `${valueToDisplay}x${count}` : valueToDisplay;
      return displayedValue;
    }
  }

  private updateLastNoteDisplay(previousValue: string, newValue: string): string {
    if (previousValue === this.notesNotHeard) {
      return '';
    }
    // Compare the first two characters of the previous and new values
    const prevPrefix = previousValue.substring(0, 2);
    const newPrefix = newValue.substring(0, 2);

    // Return the previous value if the prefixes are different, otherwise return the new value
    return prevPrefix !== newPrefix ? previousValue : newValue;
  }


  private drawNote() {
    this.animationFrameId = requestAnimationFrame(this.drawNote.bind(this));
    //requestAnimationFrame(this.drawNote.bind(this));
    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(buffer);
    const autoCorrelateValue = this.autoCorrelate(buffer, this.audioContext.sampleRate);
    
    // Handle rounding
    this.valueToDisplay = autoCorrelateValue;
    //const roundingValue = document.querySelector('input[name="rounding"]:checked').value;
    if (this.roundingValue == 'none') {
      // Do nothing
    } else if (this.roundingValue == 'hz') {
      this.valueToDisplay = Math.round(this.valueToDisplay);
    } else if (this.roundingValue = 'note'){
      // Get the closest Octave
      
      // Get the closest note
      // Thanks to PitchDetect:
      const note = this.noteStrings[this.noteFromPitch(autoCorrelateValue) % 12];
      const octave = this.octaveFromPitch(autoCorrelateValue);
      this.note = note;
      this.octave = octave;
      this.valueToDisplay = `${note}${octave}`;
    }
    
    //var smoothingValue = document.querySelector('input[name="smoothing"]:checked').value
    if (autoCorrelateValue === -1) {
      this.valueToDisplay = this.notesNotHeard;
      const previousValue = document.getElementById('note-display').innerText;
      document.getElementById('note-display').innerText = this.updateNoteDisplay(this.valueToDisplay);
      if (previousValue != this.notesNotHeard) {
	document.getElementById('previous-note-display').innerText = previousValue;
      }

      return;
    }
    // original default was at 'basic'
    // const originalParameters  = {'none': {'smoothingThreshold': 99999,
    // 					  'smoothingCountThreshold': 0},
    // 				 'basic': {'smoothingThreshold': 10,
    // 					   'smoothingCountThreshold': 5},
    // 				 'very': {'smoothingThreshold': 5,
    // 					  'smoothingCountThreshold': 10}}
    // this.smoothingCount = originalParameters['basic']['smoothingThreshold'];
    // this.smoothingCountThreshold = originalParameters['basic']['smoothingCountThreshold'];

    // we need to play with this variable
    // Check if this value has been within the given range for n iterations
    if (this.noteIsSimilarEnough()) {
      if (this.smoothingCount < this.smoothingCountThreshold) {
        this.smoothingCount++;
        return;
      } else {
        this.previousValueToDisplay = this.valueToDisplay;
        this.smoothingCount = 0;
      }
    } else {
      this.previousValueToDisplay = this.valueToDisplay;
      this.smoothingCount = 0;
      return;
    }
    
    if (typeof(this.valueToDisplay) == 'number') {
      this.valueToDisplay = this.valueToDisplay.toString() + ' Hz';
    }

    const newValue = this.updateNoteDisplay(this.valueToDisplay);
    const previousValue = document.getElementById('note-display').innerText;
    document.getElementById('note-display').innerText = newValue;
    document.getElementById('previous-note-display').innerText = this.updateLastNoteDisplay(previousValue, newValue);
    publishEvent("tuner/note-heard", {
      note: this.note,
      octave: this.octave,
      timestamp: new Date()
    })
  }

  private noteIsSimilarEnough() {
    // Check threshold for number, or just difference for notes.
    if (typeof(this.valueToDisplay) == 'number' && typeof(this.previousValueToDisplay) == 'number') {
      return Math.abs(this.valueToDisplay - this.previousValueToDisplay) < this.smoothingThreshold;
    } else {
      return this.valueToDisplay === this.previousValueToDisplay;
    }
  }

  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    // Perform a quick root-mean-square to see if we have enough signal
    let SIZE = buffer.length;
    let sumOfSquares = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      sumOfSquares += val * val;
    }

    const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
    // was originally 0.01, we need to be able to play with this
    // it essentially gives us the threshold at where a note is detected.
    // The problem is that lower notes will need a lower threshold
    // we might have to make this value dependent upon note asked!
    // BUT.. if you increase this value,  there is a large lag
    // between when the audio monitor is started and when a note
    // is first detected!
    if (rootMeanSquare < this.rootMeanSquareCutoff) {
      return -1;
    }

    // Find a range in the buffer where the values are below a given threshold.
    let r1 = 0;
    let r2 = SIZE - 1;
    // this has no discernable effect, for values 0.002 to 20!
    const threshold = this.autoCorrelateThreshold;

    // Walk up for r1
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) {
        r1 = i;
        break;
      }
    }

    // Walk down for r2
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < threshold) {
        r2 = SIZE - i;
        break;
      }
    }

    // Trim the buffer to these ranges and update SIZE.
    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    // Create a new array of the sums of offsets to do the autocorrelation
    const c = new Array(SIZE).fill(0);

    // For each potential offset, calculate the sum of each buffer value times its offset value
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + buffer[j] * buffer[j + i];
      }
    }

    // Find the last index where that value is greater than the next one (the dip)
    let d = 0;
    while (c[d] > c[d + 1]) {
      d++;
    }

    // Iterate from that index through the end and find the maximum sum
    let maxValue = -1;
    let maxIndex = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxValue) {
        maxValue = c[i];
        maxIndex = i;
      }
    }

    let T0 = maxIndex;

    // interpolation logic...
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];

    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;

    if (a) {
      T0 = T0 - b / (2 * a);
    }

    return sampleRate / T0;
  }

  public startAudioMonitoring() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.minDecibels = -100;
    this.analyser.maxDecibels = -10;
    this.analyser.smoothingTimeConstant = 0.85;
    if (!navigator?.mediaDevices?.getUserMedia) {
      // No audio allowed
      alert('Sorry, getUserMedia is required for the app.');
      monitoring.value = false;
      return;
    } else {
      const constraints = { audio: true };
      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          // Initialize the SourceNode
          this.source = this.audioContext.createMediaStreamSource(stream);
          // Connect the source node to the analyzer
          this.source.connect(this.analyser);
	  monitoring.value = true;
	  publishEvent("tuner/monitoring", {
	    monitoring: true
	  })
          this.drawNote();
        })
        .catch((err) => {
          alert(`Microphone permissions are required for the app. ${err}`,);
        });
    }
  }

  public stopAudioMonitoring() {
    try {
      if (this.source) {
        this.source.disconnect();
        this.analyser.disconnect();
      }

      if (this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }

      cancelAnimationFrame(this.animationFrameId);
      monitoring.value = false;
      publishEvent("tuner/monitoring", {
	monitoring: false
      })
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

}

export class AudioMonitorToggleButton {
  private listening = false;
  private parentDiv: HTMLElement = null;
  public tuner: AudioAnalyzer;
  public monitoring: boolean;
  
  constructor(parentDiv: HTMLElement) {
    this.listening = false;
    this.parentDiv = parentDiv;
    this.audioMonitorToggleButtonRender();
    // for the newer tuner.ts
    this.tuner = new AudioAnalyzer();
  };

  
  public audioMonitorToggleButtonRender() {
    let message = this.listening ? soundMonitorTextDisable : soundMonitorTextEnable;
    let element = document.createElement('button');
    element.innerHTML = message;
    element.classList.add('button-54');
    element.setAttribute("role","button");
    element.addEventListener('click',() => {this.audioMonitorToggleButton()})
    this.parentDiv.innerHTML = '';
    this.parentDiv.append(element);
  };

  public audioMonitorToggleButton() {
    if (this.listening) {
      this.tuner.stopAudioMonitoring()
    } else {
      this.tuner.startAudioMonitoring()
    }
    this.listening = !this.listening;
    this.audioMonitorToggleButtonRender();
  };
}
