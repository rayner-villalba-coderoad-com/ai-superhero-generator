import React, { useContext, useEffect, useState, useRef } from 'react';
import { TabsNavigationContext } from './TabsNavigationProvider';
import useAPI from '../hooks/useAPI';


let stream: MediaStream | null = null;
const PhotoTab: React.FC = () => {
  const { activeTab, userData, setActiveTab, setUserData, setLoading } = useContext(TabsNavigationContext);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { postData, uploadImageViaPresignedUrl} = useAPI();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Effect to start and stop the camera
  useEffect(() => {
    // Function to start the camera stream
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraOn(true);
        }
      } catch (err) {
        console.error("Error accessing the camera: ", err);
        // Handle camera access denial or other errors here
        alert("Could not access the camera. Please check permissions.");
      }
    };

    // Function to stop the camera stream
    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        const videoElement = document.getElementById('video') as HTMLVideoElement;
        if (videoElement) {
          videoElement.srcObject = null;
        }
        setIsCameraOn(false);
      }

    };

    if (activeTab === 'photo') {
      startCamera();
    } else {
      stopCamera();
    }

    // Cleanup function: stop the camera when the component unmounts or tab changes
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const dataURLtoBlob = (dataUrl: string) => {
    // 1. Split the Data URL to get the data part and the MIME type
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);

    if (!mimeMatch) {
      throw new Error('Invalid Data URL');
    }
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]); // 2. Decode the Base64 string
    let n = bstr.length;
    const u8arr = new Uint8Array(n); // 3. Create a byte array

    // 4. Populate the byte array with the decoded data
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    // 5. Create and return the Blob
    return new Blob([u8arr], { type: mime });
  };


  // Handle capturing the photo
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match the video feed
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame onto the canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get the image data from the canvas
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
      }
    }
  };

  const pollResult = async (key: string, attempts = 0) => {
    if (attempts > 100) {
      return;
    }
  
    const response = await postData('result-url', {key: key});

    if (response.status === 'Processing') {
      // Not ready yet — wait and poll again
      setTimeout(() => pollResult(key, attempts + 1), 2000);
      return;
    }

    const { resultUrl } = response;
    const resJson = await fetch(resultUrl).then(r => r.json());
    setUserData(resJson);
    setLoading(false);
    setActiveTab("share");
  }

  // Handle uploading the captured photo
  const handleUpload = async() => {
    if (capturedImage) {
      try {
        setLoading(true);
        // Pass the captured image data to the parent component
        // update(capturedImage);
        const payload = { ...userData, linkedin: userData?.linkedin !== '' ? `https://www.linkedin.com/in/${userData?.linkedin}` : '' };

        // 1. Save data 
        const response = await postData('save-profile', payload);
        const { uploadUrl, key } = response;
        //2. Upload image to S3 using the presigned URL
        const capturedImageBlob = dataURLtoBlob(capturedImage);
        await uploadImageViaPresignedUrl(uploadUrl, capturedImageBlob); 
        await pollResult(key);
      } catch (error) {
        console.error("Error during upload and analysis:", error);
        setLoading(false);
      }
    }
  };

  if (activeTab !== 'photo') {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-8">
          {/* Hidden canvas for capturing the image */}
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

          {/* Container for Video and Image Preview */}
          <div className="flex flex-row gap-4">

            {/* Live Video Feed */}
            <div className="relative w-1/2">
              <video
                id="video"
                ref={videoRef}
                autoPlay
                playsInline
                className="h-auto w-full bg-black rounded-md border border-gray-300"
              ></video>
              {!isCameraOn && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-md">
                      <p>Starting camera...</p>
                   </div>
              )}
            </div>

            {/* Captured Image Preview */}
            <div className="w-1/2">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="h-auto w-full rounded-md border border-gray-300"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-md border border-dashed">
                    <p className="text-gray-500">Image preview</p>
                </div>
              )}
            </div>
            
          </div>
         
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleCapture}
              disabled={!isCameraOn}
              className="w-full bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
            >
              📸 Capture
            </button>
            <button
              onClick={handleUpload}
              disabled={!capturedImage}
              className="w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              ⬆️ Submit & Analyze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoTab;