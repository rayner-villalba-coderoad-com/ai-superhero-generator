import React, {useEffect, useState} from 'react';
import useAPI from '../hooks/useAPI';


const SharedContent: React.FC<{ data: string }> = ({ data }) => {
  const [user, setUser] = useState();
  const { postData} = useAPI();
  const [language, setLanguage] = useState('en'); // Default to English

  const  fetchData =   async (id: string) =>{
    if (!id) return;

    const response = await postData('result-url', {id });
    const { comicImage, vision } = response;
   
    if (comicImage && vision) {
      setUser(response);
    }
  }
  useEffect(() => {
    if (data) {
      fetchData(data);
    }

    return () => { setUser(null); };
  }, [data]);

    
     // Centralized object for all text labels and translations
    const translations: unknown = {
      en: {
        congratulations: `Congratulations, ${user?.fullname || 'User'}!`,
        subtitle: 'Your AI-generated superhero has been created.',
        noImage: 'No superhero image available.',
        noName: 'No superhero name available.',
        noVision: 'No superhero vision available.',
        buttonEnglish: 'English',
        buttonSpanish: 'Spanish',
      },
      es: {
        congratulations: `¡Felicidades, ${user?.fullname || 'User'}!`,
        subtitle: 'Tu superhéroe generado por IA ha sido creado.',
        noImage: 'No hay imagen de superhéroe disponible.',
        noName: 'No hay nombre de superhéroe disponible.',
        noVision: 'No hay descripción de superhéroe disponible.',
        buttonEnglish: 'Inglés',
        buttonSpanish: 'Español',
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
  if (!user) {
    return <div className="text-center text-gray-500 italic">Loading...</div>;
  }
  return (
<div className="bg-white rounded-lg shadow-lg mt-10 pt-4 pb-4 sm:p-2">
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

  {/* Main Content Grid */}
  <div className="grid grid-cols-1 gap-8 items-center">
    {/* Left Column: Superhero Image and Info */}
    <div className="flex flex-col gap-4">
      {/* Image is now smaller (max-w-md) and centered (mx-auto) */}
      <img
          src={user.comicImage}
          alt="AI Generated Superhero"
          className="mx-auto max-w-sd h-auto rounded-md border-2 border-gray-200 shadow-sm"
        />
      
      {/* Superhero Name (changes with language) */}
      <h3 className="text-2xl font-bold text-center text-gray-900">
          {language === 'es' ? user.spanishSuperHeroName : user.superHeroName}
      </h3>

      {/* Superhero Vision (changes with language) */}
      <p className="text-gray-700 text-center">
        {language === 'es' ? user.spanishVision : user.vision}
      </p>
    </div>
  </div>
</div>    
  );  
}

export default SharedContent;