export interface Tab {
	title: string;
	content: () => HTMLElement;
	id: string;
}

export const createTabs = (data: Tab[], container: HTMLElement, defaultOpen: number = 0) => {
	const tabsContainer = document.createElement('div');
	tabsContainer.classList.add('tabs-container');
	const tabContent = document.createElement('div');
	tabContent.classList.add('tab-content');

	for (let i = 0; i < data.length; i++) {
		const tab = document.createElement('div');
		tab.classList.add('tab');
		tab.id = data[i].id;
		tab.innerText = data[i].title;
		tab.addEventListener('click', () => {
			showTabContent(i);
		});
		tabsContainer.appendChild(tab);
	}
	container.appendChild(tabsContainer);
	container.appendChild(tabContent);

  const showTabContent = (tabNumber: number) => {
    // activate / deactivate tabs
    const currentActiveTab = tabsContainer.querySelector('.active');
    if (currentActiveTab) currentActiveTab.classList.remove('active');
    tabsContainer.children[tabNumber].classList.add('active');
    // render the content
    const tabContentElement = document.createElement('div');
    //tabContentElement.innerHTML = data[tabNumber].content();
    tabContentElement.append(data[tabNumber].content());

    while (tabContent.firstChild) {
      tabContent.removeChild(tabContent.firstChild);
    }
    tabContent.appendChild(tabContentElement);
  };
  showTabContent(defaultOpen);
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
