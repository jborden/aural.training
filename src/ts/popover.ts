import { publishEvent } from './events/main'

export let popoverOpen: boolean = false;

export class PopOver {
  private popoverIcon: HTMLElement;
  private popoverContent: HTMLElement;

  constructor(popoverContent: HTMLElement) {
    // this should
    // 1. only be active when the audio monitor
    // is working
    // 2. the other components should shut off because
    // the tuner is working
    
    // Create popover icon element
    this.popoverIcon = document.createElement('div');
    this.popoverIcon.classList.add('popover-icon');
    this.popoverIcon.innerHTML = '&#9881;'; // Unicode for gear icon
    this.popoverIcon.style.display = 'block';
    this.popoverIcon.addEventListener('click', () => this.togglePopoverContent());
    // add elements to the popoverContent
    this.popoverContent = popoverContent;
    this.popoverContent.style.display = 'none'; // Hide popover content initially
    document.body.appendChild(this.popoverIcon);
    this.popoverContent.classList.add('popover-content')
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times';
    closeButton.classList.add('close-button-times');
    closeButton.onclick = () => this.togglePopoverContent();
    this.popoverContent.appendChild(closeButton);
  }

  private togglePopoverContent(): void {
    let isOpen = this.popoverContent.style.display === 'block';
    this.popoverContent.style.display = isOpen ? 'none' : 'block';
    this.popoverIcon.style.display = isOpen ? 'block' : 'none';

    // set the global state of the popover
    popoverOpen = !isOpen // isOpen is now in the opposite state
    // Publish event based on the global state
    publishEvent("popover/open", {open: popoverOpen})
  }
}
