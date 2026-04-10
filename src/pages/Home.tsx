import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon } from '@ionic/react';
import { imageOutline, cameraOutline } from 'ionicons/icons';

// 1. REPLACE THIS with your actual uploaded model link
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/";

interface Stats {
  status: string;
  confidence: string;
  message: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 2. AI PREDICTION LOGIC
  const runAIPrediction = async (imageElement: HTMLCanvasElement | HTMLImageElement) => {
    const model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    const predictions = await model.predict(imageElement);
    predictions.sort((a, b) => b.probability - a.probability);
    return predictions[0];
  };

  // 3. IMAGE HANDLING
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => processImage(img);
      img.src = e.target?.result as string;
      setImageSrc(img.src);
    };
    reader.readAsDataURL(file);
  };

  // 4. COMBINED ANALYSIS (DSP + AI)
  const processImage = async (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Run AI Model for Verdict
    const aiResult = await runAIPrediction(canvas);
    
    // Run DSP Kernel for Visual Targeting (The red circle)
    const dspResult = processXraySignal(canvas);

    setStats({
      status: aiResult.className.toUpperCase(),
      confidence: (aiResult.probability * 100).toFixed(1) + "%",
      message: aiResult.className === "Fractured" 
        ? "CRITICAL: Structural breach identified by AI neural pattern." 
        : "STABLE: No significant fractures detected in bone morphology."
    });
  };

  // 5. DSP KERNEL (Your existing logic)
  const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const { width, height } = canvas;
    const kernel = [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];
    let defectX = 0, defectY = 0, maxStress = 0;

    for (let y = Math.floor(height * 0.15); y < height * 0.85; y += 10) {
      for (let x = Math.floor(width * 0.15); x < width * 0.85; x += 10) {
        const i = (y * width + x) * 4;
        if ((pixels[i] + pixels[i+1] + pixels[i+2]) / 3 > 140) {
          const stress = calculateStress(pixels, x, y, width, kernel);
          if (stress > maxStress) {
            maxStress = stress; defectX = x; defectY = y;
          }
        }
      }
    }

    if (maxStress > 50) {
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(defectX, defectY, 50, 0, 2 * Math.PI);
      ctx.stroke();
    }
    return { defectX, defectY };
  };

  const calculateStress = (pixels: Uint8ClampedArray, x: number, y: number, width: number, kernel: number[][]) => {
    let sum = 0;
    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const idx = ((y + ky) * width + (x + kx)) * 4;
        const val = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
        sum += val * kernel[ky + 1][kx + 1];
      }
    }
    return Math.abs(sum);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>X-RAY SMART DIAGNOSTIC</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: '15px', border: '2px solid #ddd' }} />
          <input type="file" id="file-input" style={{ display: 'none' }} onChange={handleUpload} />
          <br />
          <IonButton onClick={() => document.getElementById('file-input')?.click()}>
            <IonIcon icon={imageOutline} slot="start" /> UPLOAD X-RAY
          </IonButton>
        </div>

        {stats && (
          <div className="report-container" style={{ padding: '20px', border: '2px solid #000', borderRadius: '15px' }}>
            <h2 style={{ color: '#000', fontWeight: '900' }}>DIAGNOSTIC REPORT</h2>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', marginBottom: '15px' }}>
              <p><b>Finding:</b> {stats.status}</p>
              <p><b>AI Confidence:</b> {stats.confidence}</p>
              <div style={{ width: '100%', height: '10px', background: '#ddd', borderRadius: '5px' }}>
                <div style={{ 
                  width: stats.confidence, 
                  height: '100%', 
                  background: stats.status === 'FRACTURED' ? 'red' : 'green',
                  borderRadius: '5px' 
                }} />
              </div>
            </div>
            <div style={{ padding: '15px', border: '2px solid red', color: 'red', fontWeight: 'bold' }}>
              <p>{stats.message}</p>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}