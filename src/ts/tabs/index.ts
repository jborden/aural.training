export interface Tab {
	title: string;
	content: () => HTMLElement;
	id: string;
}

export class Tabs {
  private tabsContainer: HTMLDivElement;
  private tabContent: HTMLDivElement;
  private data: Tab[];

  constructor(data: Tab[], container: HTMLElement, defaultOpen: number = 0) {
    this.data = data;

    this.tabsContainer = document.createElement('div');
    this.tabsContainer.classList.add('tabs-container');

    this.tabContent = document.createElement('div');
    this.tabContent.classList.add('tab-content');

    for (let i = 0; i < this.data.length; i++) {
      const tab = document.createElement('div');
      tab.classList.add('tab');
      tab.id = this.data[i].id;
      tab.innerText = this.data[i].title;
      tab.addEventListener('click', () => {
        this.showTabContent(i);
      });
      this.tabsContainer.appendChild(tab);
    }
    container.appendChild(this.tabsContainer);
    container.appendChild(this.tabContent);

    this.showTabContent(defaultOpen);
  }

  private showTabContent(tabNumber: number) {
    // activate / deactivate tabs
    const currentActiveTab = this.tabsContainer.querySelector('.active');
    if (currentActiveTab) currentActiveTab.classList.remove('active');
    this.tabsContainer.children[tabNumber].classList.add('active');

    // render the content
    const tabContentElement = document.createElement('div');
    tabContentElement.append(this.data[tabNumber].content());

    while (this.tabContent.firstChild) {
      this.tabContent.removeChild(this.tabContent.firstChild);
    }

    this.tabContent.appendChild(tabContentElement);
  }
}

export function isElementActiveById(elementId: string) {
    // Get the element by its ID
    const element = document.getElementById(elementId);

    // Check if the element exists and has the "active" class
    if (element && element.classList.contains('active')) {
        // The element has the "active" class
        return true;
    } else {
        // The element does not have the "active" class or does not exist
        return false;
    }
}
