//import { Chart } from 'chart.js';
import { Chart, registerables, Point} from 'chart.js/auto';


const paulTolColors = ["#332288", "#6699cc", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#661100", "#cc6677", "#aa4466", "#882255", "#aa4499"];

export class RealTimeGraph {
  private audioGraph: Chart;
  private monitoredKW: string;

  constructor(canvasId: string, monitoredKW: string) {
    Chart.register(...registerables);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    this.monitoredKW = monitoredKW;

    this.audioGraph = new Chart(ctx, {
      type: 'scatter',
      data: {
        //labels: [],
        datasets: [],
      },
      options: {
        // Add any additional chart options here
      },
    });
  }

  public updateGraph(data: any) {
    const { frequency, note, noteFrequency, deviation, octave } = data;
    const color = this.getColorForNoteAndOctave(note, octave);
    const currentTime = new Date().getTime();
    const maxDataPoints = 100;
    const maxTime = 1000;
    const noteLabel = `${note}${octave}`;
    // const newDataPoint = {
    //   x: currentTime,
    //   y: data[this.monitoredKW],
    //   //label: `${note}${octave}`,
    // };
    //this.audioGraph.data.labels.push(currentTime);

    // if (!this.audioGraph.data.labels.includes(noteLabel)) {
    //   this.audioGraph.data.labels.push(noteLabel)
    // }
    const existingDataset = this.audioGraph.data.datasets.find(item => item.label === noteLabel);

    if (existingDataset) {
      // Label exists, push the new value to its data array
      existingDataset.data.push({x: currentTime, y: data[this.monitoredKW]})
      if (existingDataset.data.length > maxDataPoints) {
	existingDataset.data.shift();
      }
    } else {
      // Label does not exist, create a new object and push it to the array
      this.audioGraph.data.datasets.push({
	label: noteLabel,
	borderColor: color,
	//showLine: true,
	data: [{x: currentTime, y: data[this.monitoredKW]}], 
      });
    }

    // // remove labels
    // if (this.audioGraph.data.labels.length > maxDataPoints) {
    //   this.audioGraph.data.labels.shift();
    // }
    // for each dataset, filter out any points that are older than 
    this.audioGraph.data.datasets.forEach((dataset: any) => {
      //const min = Math.min(...this.audioGraph.data.labels)
      const minValue = new Date().getTime() - 1000;
      console.log("minValue", minValue)
      dataset.data = dataset.data.filter((item: any) => item.x >= minValue)
    });
    
    this.audioGraph.update();
  }

   public attachEventListener(eventName: string) {
     addEventListener(eventName, this.handleEvent.bind(this));

    // Example: call detachEventListener when you want to stop listening
    // this.detachEventListener(eventName);
  }

  public detachEventListener(eventName: string) {
    document.removeEventListener(eventName, this.handleEvent);
  }

  private handleEvent(event: CustomEvent) {
    const eventData = event.detail;
    this.updateGraph(eventData);
  }

  private getColorForNoteAndOctave(note: string, octave: number): string {
    const index = (octave - 2) * 12 + this.getNoteIndex(note);
    return paulTolColors[index % paulTolColors.length];
  }

  private getNoteIndex(note: string): number {
    const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    return notes.indexOf(note);
  }
}

// // Example usage:
// const graph = new RealTimeGraph('audioGraphCanvasId');

// // Call this whenever you have new data
// graph.updateGraph({
//   frequency: 440,
//   note: 'A',
//   noteFrequency: 880,
//   deviation: 0,
//   octave: 4,
// });
