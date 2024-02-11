import noUiSlider from 'nouislider';
import { API, PipsMode } from 'nouislider';

interface TargetElement extends HTMLElement {
    noUiSlider?: API;
}

export class SliderControl {
  private container: HTMLElement;
  private label: string
  private initialValue: number;
  private rangeMin: number;
  private rangeMax: number;
  private onUpdate: Function;
  private mainElement: HTMLElement;
  private sliderElement: TargetElement;
  private labelElement: HTMLElement;
  
  
  constructor(container: HTMLElement, label: string, initialValue: number, rangeMin: number, rangeMax: number, onUpdate: Function) {
    this.container = container;
    this.label = label;
    this.initialValue = initialValue;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    this.onUpdate = onUpdate;
    this.createSlider();
  }

  createSlider() {
    this.mainElement = document.createElement('div');
    this.mainElement.classList.add('slider-container');
    this.sliderElement = document.createElement('div');
    this.sliderElement.classList.add('slider');
    
    this.labelElement = document.createElement('h3');
    this.labelElement.innerHTML = this.label;
    this.labelElement.classList.add('slider-label');
    
    this.mainElement.appendChild(this.labelElement); 
    this.mainElement.appendChild(this.sliderElement);
    
    noUiSlider.create(this.sliderElement, {
      start: [this.initialValue],
      connect: [true, false],
      range: {
	'min': this.rangeMin,
	'max': this.rangeMax
      },
      step: 1,
      tooltips: true,
      // pips: {
      // 	mode: PipsMode.Range,
      //   density: 3
      // }
    });
    
    this.sliderElement.noUiSlider.on('update', (values: number[]) => {
      this.onUpdate(Number(values[0]));
    });

    this.container.appendChild(this.mainElement);
  }
  
}
