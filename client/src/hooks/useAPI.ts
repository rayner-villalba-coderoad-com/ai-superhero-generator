
const API_URL = import.meta.env.VITE_API_URL;

const useAPI = () => {
  async function postData(url: string, payload: unknown) {
    const response = await fetch(`${API_URL}/${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  async function getData(url: string) {
    const response = await fetch(`${API_URL}/${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    return response.json();
  }

  async function uploadImageViaPresignedUrl(presignedUrl: string, imageBlob: Blob) {
    return await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: imageBlob
    });
  }

  return { postData, getData, uploadImageViaPresignedUrl };
};

export default useAPI;
