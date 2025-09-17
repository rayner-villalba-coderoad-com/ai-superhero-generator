import { useState, createContext } from 'react';
import { LoadingOverlay } from './LoadingOverlay';

type TabsNavigationContextType = {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  userData: unknown;
  setUserData: unknown;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const TabsNavigationContext = createContext<TabsNavigationContextType>({
  activeTab: 'form',
  setActiveTab: () => {},
  userData: {},
  setUserData: () => {},
  setLoading: () => {},
});

const TabsNavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState('form');
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(false);
  return (
    <TabsNavigationContext.Provider value={{ activeTab, setActiveTab, userData, setUserData, setLoading }}>
      <div className="flex justify-around border-b padding-top-20 mt-8">
        <button
          className={`py-2 px-4 ${
            activeTab === "form"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("form")}
        >
          Personal Information
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === "photo"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600"
          }`}
          disabled={(!userData.fullname)}
          onClick={() => setActiveTab("photo")}
        >
          Upload your Photo
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === "share"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600"
          }`}
          disabled={!userData.qrCodeImageUrl}
          onClick={() => setActiveTab("share")}
        >
          Share
        </button>
      </div>
      
      {children}
      {loading && <LoadingOverlay />}
    </TabsNavigationContext.Provider>
  );
};

export { TabsNavigationContext, TabsNavigationProvider };
