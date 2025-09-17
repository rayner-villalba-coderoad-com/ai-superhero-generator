import React, {useState} from 'react';
import { TabsNavigationContext } from './TabsNavigationProvider';

// A small, reusable component to avoid repetitive conditional logic.
type ConditionalDisplayProps = {
  data: unknown;
  fallbackText: string;
  children: React.ReactNode;
};

const ConditionalDisplay: React.FC<ConditionalDisplayProps> = ({ data, fallbackText, children }) => {
  if (!data) {
    return <p className="text-gray-500 italic">{fallbackText}</p>;
  }
  return <>{children}</>;
};

const ShareTab: React.FC = () => {
  const { activeTab, userData } = React.useContext(TabsNavigationContext);
  const [language, setLanguage] = useState('en'); // Default to English
  
   // Centralized object for all text labels and translations
  const translations: unknown = {
    en: {
      congratulations: `Congratulations, ${userData?.fullname || 'User'}!`,
      subtitle: 'Your AI-generated superhero has been created.',
      noImage: 'No superhero image available.',
      noName: 'No superhero name available.',
      noVision: 'No superhero vision available.',
      noQr: 'No QR code available.',
      buttonEnglish: 'English',
      buttonSpanish: 'Spanish',
      qrCodeScan: 'Scan the QR code!',
    },
    es: {
      congratulations: `¡Felicidades, ${userData?.fullname || 'User'}!`,
      subtitle: 'Tu superhéroe generado por IA ha sido creado.',
      noImage: 'No hay imagen de superhéroe disponible.',
      noName: 'No hay nombre de superhéroe disponible.',
      noVision: 'No hay descripción de superhéroe disponible.',
      noQr: 'No hay código QR disponible.',
      buttonEnglish: 'Inglés',
      buttonSpanish: 'Español',
      qrCodeScan: '¡Escanea el código QR!',
    },
  };
    // Select the current set of translations
  const t = translations[language];
  
  // A helper function to get button styles based on active state
  const getButtonClass = (lang: string) => {
    return language === lang
      ? 'bg-purple-600 text-white'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  };

  if (activeTab !== 'share' ) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
      {/* Header and Language Switcher */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-800">{t.congratulations}</h2>
        <p className="text-md text-gray-600 mt-1">{t.subtitle}</p>
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={() => setLanguage('en')}
            className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 ${getButtonClass('en')}`}
          >
            {t.buttonEnglish}
          </button>
          <button
            onClick={() => setLanguage('es')}
            className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 ${getButtonClass('es')}`}
          >
            {t.buttonSpanish}
          </button>
        </div>
      </div>

      {/* Main Content Grid: 2 columns on medium screens+, 1 on small */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Column: Superhero Image and Info */}
        <div className="flex flex-col gap-4">
          <ConditionalDisplay data={userData?.comicImage} fallbackText={t.noImage}>
            <img
              src={userData.comicImage}
              alt="AI Generated Superhero"
              className="w-full h-auto rounded-md border-2 border-gray-200 shadow-sm"
            />
          </ConditionalDisplay>
          
          {/* Superhero Name (changes with language) */}
          <ConditionalDisplay 
            data={language === 'es' ? userData?.spanishSuperHeroName : userData?.superHeroName} 
            fallbackText={t.noName}
          >
            <h3 className="text-2xl font-bold text-center text-gray-900">
              {language === 'es' ? userData.spanishSuperHeroName : userData.superHeroName}
            </h3>
          </ConditionalDisplay>

          {/* Superhero Vision (changes with language) */}
          <ConditionalDisplay 
            data={language === 'es' ? userData?.spanishVision : userData?.vision} 
            fallbackText={t.noVision}
          >
            <p className="text-gray-700 text-center">
              {language === 'es' ? userData.spanishVision : userData.vision}
            </p>
          </ConditionalDisplay>
        </div>

        {/* Right Column: QR Code */}
        <div className="flex flex-col items-center justify-center">
          <h3 className="text-2xl font-bold text-center text-gray-900">
            {t.qrCodeScan}
          </h3>
          <ConditionalDisplay data={userData?.qrCodeImageUrl} fallbackText={t.noQr}>
            <img
              src={userData.qrCodeImageUrl}
              alt="QR Code"
              className="w-64 h-64 sm:w-80 sm:h-80 rounded-md border-2 border-gray-200"
            />
          </ConditionalDisplay>
        </div>
      </div>
    </div>    
  );
};

export default ShareTab;  
