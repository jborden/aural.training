export class PopOver {
  private popoverIcon: HTMLElement;
  private popoverContent: HTMLElement;

  constructor(popoverContent: HTMLElement) {
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
    this.popoverContent.style.display = this.popoverContent.style.display === 'none' ? 'block' : 'none';
    this.popoverIcon.style.display = this.popoverIcon.style.display === 'none' ? 'block' : 'none';
  }

}
