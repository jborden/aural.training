import { soundMonitorTextEnable } from "./index"

export class PopoverManager {
  private popoverContainer: HTMLElement;
  private popoverActive: HTMLElement;
  private popoverInactive: HTMLElement;

  constructor(container: HTMLElement) {
    this.popoverContainer = container;
    this.popoverActive = document.createElement('div');
    this.popoverInactive = document.createElement('div');

    // Set up inactive content
    this.setupInactiveContent();

    // Set up active content
    this.setupActiveContent();

    // Listen to custom event for toggling visibility
    addEventListener('tuner/monitoring', (event: CustomEvent) => {
      console.log(`monitoring: {event.detail}`);
      const monitoring = event.detail.monitoring;
      if (monitoring) {
        this.popoverActive.classList.remove("hide");
        this.popoverInactive.classList.add("hide");
      } else {
        this.popoverActive.classList.add("hide");
        this.popoverInactive.classList.remove("hide");
      }
    });
  }

  private setupInactiveContent() {
    this.popoverInactive.id = "popover-content-inactive";
    const inactiveMessage = document.createElement('div');
    inactiveMessage.classList.add("text");
    inactiveMessage.innerText = `Please click '${soundMonitorTextEnable}' button to adjust settings`;
    this.popoverInactive.append(inactiveMessage);
    this.popoverContainer.append(this.popoverInactive);
  }

  private setupActiveContent() {
    this.popoverActive.id = "popover-content-active";
    this.popoverActive.classList.add("hide"); // Initially hidden
    // Set up sliders or other content for active state here
    this.popoverContainer.append(this.popoverActive);
  }

  public getPopoverActive(): HTMLElement {
    return this.popoverActive;
  }
}
