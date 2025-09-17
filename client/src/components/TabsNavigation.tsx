import React from 'react';
import UserProfileFormTab from './UserProfileFormTab';
import PhotoTab from './PhotoTab';
import { TabsNavigationProvider } from './TabsNavigationProvider';
import ShareTab from './ShareTab';

const TabsNavigation: React.FC = () => {
  
  return (
    <div className="pt-28 px-4">
      <h1 className='text-4xl font-extrabold text-gray-900'>AI Superhero Generator</h1>
      <TabsNavigationProvider>
        <UserProfileFormTab />
        <PhotoTab /> 
        <ShareTab />
      </TabsNavigationProvider>
    </div>
  );
};

export default TabsNavigation;