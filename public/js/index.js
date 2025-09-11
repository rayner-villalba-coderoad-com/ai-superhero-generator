const API_BASE = 'https://wafdhbeyc2.execute-api.us-east-1.amazonaws.com'; // If behind API Gateway custom domain; otherwise paste your invoke URL origin
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const toggleCameraBtn = document.getElementById("toggleCamera");
const captureBtn = document.getElementById('capture');
const uploadBtn = document.getElementById('upload');
const statusEl = document.getElementById('status');
const preview = document.getElementById('preview');
const resultEl = document.getElementById('result');
const refreshBtn = document.getElementById("refresh");
let stream = null;
let cameraOn = false;

let currentBlob = null;
let lastKey = null;

// Toggle Camera On/Off
async function toggleCamera() {
   if (!cameraOn) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
        cameraOn = true;
        toggleCameraBtn.textContent = "📴 Turn Off Camera";
        captureBtn.disabled = false;
      } catch (err) {
        document.getElementById("status").innerText = "⚠️ Error accessing camera.";
        console.error(err);
      }
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop()); // Stop camera
        video.srcObject = null;
      }
      cameraOn = false;
      toggleCameraBtn.textContent = "📷 Turn On Camera";
      captureBtn.disabled = true;
    }
}
//Togle camera on/off
toggleCameraBtn.onclick = toggleCamera;

// Refresh the page
refreshBtn.onclick = () => {
  window.location.reload();
};
captureBtn.onclick = () => {
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    currentBlob = blob;
    uploadBtn.disabled = !currentBlob;
    statusEl.textContent = 'Captured. Ready to upload.';
  }, 'image/jpeg', 0.92);
};

uploadBtn.onclick = async () => {
  if (!currentBlob) return;
  
  statusEl.textContent = 'Requesting upload URL...';

  const uploadRes = await fetch(`${API_BASE}/upload-url`, { method: 'POST' });
  const { uploadUrl, key } = await uploadRes.json();
  lastKey = key;

  statusEl.textContent = 'Uploading...';
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: currentBlob,
  });

  // Show what we uploaded
  preview.src = URL.createObjectURL(currentBlob);
  statusEl.textContent = 'Uploaded. Analyzing (Lambda)…';

  await pollResult(key);
};

async function pollResult(key, attempts = 0) {
  if (attempts > 100) {
    resultEl.textContent = 'Timed out waiting for analysis.';
    return;
  }
  
  const resp = await fetch(`${API_BASE}/result-url`, {
    method: 'POST',
    //mode: 'no-cors',
    headers: {'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ key }),
  });

  if (resp.status === 202) {
    // Not ready yet — wait and poll again
    resultEl.textContent = `Processing… (${attempts + 1})`;
    setTimeout(() => pollResult(key, attempts + 1), 1500);
    return;
  }

  const response = await resp.json();
  console.log('Response from result-url:', response);
  const resJson = await fetch(response.resultUrl).then(r => r.json());
  renderResult(resJson);
}

function renderResult({comicImage, detected, confidence, method, processedAt, spanishVision }) {
  console.log(comicImage);
  if (comicImage !== '') {
    statusEl.textContent = 'Analysis complete.';
    canvas.classList.add('hidden');
    preview.src = comicImage;
    preview.classList.remove('hidden');
  }
  
  if (!detected) {
    //resultEl.innerHTML = `<b>Vision: </b> ${spanishVision} <br/><b>Method: </b> ${method}<br/> <b>Processed at: </b> ${new Date(processedAt).toLocaleString()}`;
    resultEl.innerHTML = `<b>Arquitecto del Cambio: </b> <p class="description">${spanishVision}</p> <br/>`;
    return;
  }

  resultEl.innerHTML = `
    <div><strong>Detected:</strong> ${detected}</div>
    <div><strong>Confidence:</strong> ${confidence.toFixed ? confidence.toFixed(1) : confidence}%</div>
    <div><strong>Method:</strong> ${method}</div>
    <div><small>Processed at ${new Date(processedAt).toLocaleString()}</small></div>
  `;
}

window.onload = async(event) => {
  await toggleCamera();
};
