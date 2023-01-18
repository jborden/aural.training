export interface Tab {
  title: string;
  content: () => HTMLElement;
}

export const createTabs = (data: Tab[], container: HTMLElement) => {
    const tabsContainer = document.createElement('div');
    tabsContainer.classList.add('tabs-container');
    const tabContent = document.createElement('div');
    tabContent.classList.add('tab-content');

    for (let i = 0; i < data.length; i++) {
        const tab = document.createElement('div');
        tab.classList.add('tab');
        tab.innerText = data[i].title;
        tab.addEventListener('click', () => {
            showTabContent(i);
        });
        tabsContainer.appendChild(tab);
    }
    container.appendChild(tabsContainer);
    container.appendChild(tabContent);

  const showTabContent = (tabNumber: number) => {
    const tabContentElement = document.createElement('div');
    //tabContentElement.innerHTML = data[tabNumber].content();
    tabContentElement.append(data[tabNumber].content());

    while (tabContent.firstChild) {
        tabContent.removeChild(tabContent.firstChild);
    }
    tabContent.appendChild(tabContentElement);

    const currentActiveTab = tabsContainer.querySelector('.active');
    if(currentActiveTab) currentActiveTab.classList.remove('active');
    tabsContainer.children[tabNumber].classList.add('active');
  };
  showTabContent(0);
}
