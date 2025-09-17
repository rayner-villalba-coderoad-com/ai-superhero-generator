import Header from './components/Header'
import './App.css'
import TabsNavigation from './components/TabsNavigation'
import { useSearchParams } from 'react-router-dom';
import SharedContent from './components/SharedContent';


const ViewSwitcher = () => {
  // Get the search params from the URL
  const [searchParams] = useSearchParams();

  const currentKey = searchParams.get('key');
  console.log('Current view from URL param "key":', currentKey); // Debugging line
  if (currentKey) {
    return <SharedContent data={currentKey} />;
  } else {
    return <TabsNavigation />
  }
};
function App() {
  return (
    <>   
      <div className="bg-gray-100 min-h-screen">
        <Header /> 
        <ViewSwitcher />
      </div>
    </>
  )
}

export default App
