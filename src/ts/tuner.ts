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

export class AudioAnalyzer {
  private source: MediaStreamAudioSourceNode | undefined;
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private canvas: HTMLCanvasElement | null;
  private canvasContext: CanvasRenderingContext2D | null;
  private WIDTH: number | undefined;
  private HEIGHT: number | undefined;
  //private drawVisual: number | undefined;
  //private drawNoteVisual: number | undefined;
  private previousValueToDisplay: number | string = 0;
  private smoothingCount: number = 0;
  private smoothingThreshold: number = 5;
  private smoothingCountThreshold: number = 5;
  private noteStrings: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  private roundingValue: string = "hz"; // "none", "hz", "note"
  private smoothingValue: string = "basic"; // "none", "basic", "very"
  private valueToDisplay: string | number;
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.minDecibels = -100;
    this.analyser.maxDecibels = -10;
    this.analyser.smoothingTimeConstant = 0.85;

    this.canvas = document.querySelector('.visualizer');
    this.canvasContext = this.canvas?.getContext("2d");
  }

  private visualize() {
    this.WIDTH = this.canvas?.width || undefined;
    this.HEIGHT = this.canvas?.height || undefined;

    //this.drawVisual = requestAnimationFrame(this.draw.bind(this));
    requestAnimationFrame(this.draw.bind(this));
    this.analyser.fftSize = 2048;
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    // var displayValue = document.querySelector('input[name="display"]:checked').value
    // if (displayValue == 'sine') {
    //   draw();
    // } else {
    //   drawFrequency();
    // }
    // Call other draw methods...
    this.drawNote();
  }

  private noteFromPitch( frequency: number ) {
      var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
      return Math.round( noteNum ) + 69;
  }
  
  private draw() {
    //this.drawVisual = requestAnimationFrame(this.draw.bind(this));
    requestAnimationFrame(this.draw.bind(this));
    
    this.analyser.fftSize = 2048;
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);
    
    this.canvasContext.fillStyle = 'rgb(200, 200, 200)';
    this.canvasContext.fillRect(0, 0, this.WIDTH || 0, this.HEIGHT || 0);
    
    this.canvasContext.lineWidth = 2;
    this.canvasContext.strokeStyle = 'rgb(0, 0, 0)';
    this.canvasContext.beginPath();
    
    const sliceWidth = (this.WIDTH || 0) * 1.0 / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * (this.HEIGHT || 0) / 2;
      
      if (i === 0) {
	this.canvasContext?.moveTo(x, y);
      } else {
	this.canvasContext?.lineTo(x, y);
      }
      
      x += sliceWidth;
    }

    this.canvasContext?.lineTo(this.canvas?.width || 0, (this.canvas?.height || 0) / 2);
    this.canvasContext?.stroke();
  }

  private drawNote() {
    //this.drawNoteVisual = requestAnimationFrame(this.drawNote.bind(this));
    requestAnimationFrame(this.drawNote.bind(this));
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
      // Get the closest note
      // Thanks to PitchDetect:
      this.valueToDisplay = this.noteStrings[this.noteFromPitch(autoCorrelateValue) % 12];
    }

    //var smoothingValue = document.querySelector('input[name="smoothing"]:checked').value


      if (autoCorrelateValue === -1) {
        document.getElementById('note').innerText = 'Too quiet...';
        return;
      }
      if (this.smoothingValue === 'none') {
        this.smoothingThreshold = 99999;
        this.smoothingCountThreshold = 0;
      } else if (this.smoothingValue === 'basic') {
        this.smoothingThreshold = 10;
        this.smoothingCountThreshold = 5;
      } else if (this.smoothingValue === 'very') {
        this.smoothingThreshold = 5;
        this.smoothingCountThreshold = 10;
      }
     
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

      document.getElementById('note').innerText = this.valueToDisplay;
    
  }

  private noteIsSimilarEnough() {
    // Check threshold for number, or just difference for notes.
    if (typeof(this.valueToDisplay) == 'number' && typeof(this.previousValueToDisplay) == 'number') {
      return Math.abs(this.valueToDisplay - this.previousValueToDisplay) < this.smoothingThreshold;
    } else {
      return this.valueToDisplay === this.previousValueToDisplay;
    }
  }

  // private drawFrequency() {
  //   const bufferLengthAlt = this.analyser.frequencyBinCount;
  //   const dataArrayAlt = new Uint8Array(bufferLengthAlt);

  //   this.canvasContext?.clearRect(0, 0, this.WIDTH || 0, this.HEIGHT || 0);

  //   const drawAlt = () => {
  //     requestAnimationFrame(drawAlt);
  //     //this.drawVisual = requestAnimationFrame(drawAlt);

  //     this.analyser.getByteFrequencyData(dataArrayAlt);

  //     this.canvasContext?.fillStyle = 'rgb(0, 0, 0)';
  //     this.canvasContext?.fillRect(0, 0, this.WIDTH || 0, this.HEIGHT || 0);

  //     const barWidth = (this.WIDTH || 0) / bufferLengthAlt * 2.5;
  //     let barHeight;
  //     let x = 0;

  //     for (let i = 0; i < bufferLengthAlt; i++) {
  //       barHeight = dataArrayAlt[i];

  //       this.canvasContext?.fillStyle = `rgb(${barHeight + 100},50,50)`;
  //       this.canvasContext?.fillRect(x, this.HEIGHT ? this.HEIGHT - barHeight / 2 : 0, barWidth, barHeight / 2);

  //       x += barWidth + 1;
  //     }
  //   };

  //   console.log('wut');
  //   drawAlt();
  // }

  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    // Perform a quick root-mean-square to see if we have enough signal
    let SIZE = buffer.length;
    let sumOfSquares = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      sumOfSquares += val * val;
    }

    const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
    if (rootMeanSquare < 0.01) {
      return -1;
    }

    // Find a range in the buffer where the values are below a given threshold.
    let r1 = 0;
    let r2 = SIZE - 1;
    const threshold = 0.2;

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

  public init() {
    if (!navigator?.mediaDevices?.getUserMedia) {
      // No audio allowed
      alert('Sorry, getUserMedia is required for the app.');
      return;
    } else {
      const constraints = { audio: true };
      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          // Initialize the SourceNode
          this.source = this.audioContext.createMediaStreamSource(stream);
          // Connect the source node to the analyzer
          this.source.connect(this.analyser);
          this.visualize();
        })
        .catch((err) => {
          alert(`Microphone permissions are required for the app. ${err}`,);
        });
    }
  }
}
