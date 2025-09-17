import { useState } from 'react';

const useUserData = () => {
  const [userData, setUserData] = useState();

  return { userData, setUserData };
}

export default useUserData;