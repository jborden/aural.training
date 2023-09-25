import React from 'react';

interface TabsProps {
  data: {
    title: string;
    content: () => JSX.Element; // Assuming content is a function returning JSX.Element
  }[];
}

const Tab: React.FC<{ contentFunction: () => JSX.Element }> = ({ contentFunction }) => {
  const content = contentFunction();
  
  return (
    <div className="tab-content">
      {content}
    </div>
  );
};

//export default Tab;

export const Tabs: React.FC<TabsProps> = ({ data }) => {
  const defaultTabIndex = 0; // You can set the default tab index here
  const [activeTab, setActiveTab] = React.useState(defaultTabIndex);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
  };

  return (
    <div>
      <div className="tabs tabs-container">
        {data.map((tab, index) => (
          <div
            key={index}
            onClick={() => handleTabClick(index)}
            className={index === activeTab ? 'active tab' : 'tab'}
          >
            {tab.title}
	  </div>
        ))}
      </div>
        {data.map((tab, index) => (
          <Tab
	  key={index}
	  contentFunction={tab.content} />
        ))}
    </div>
  );
};
