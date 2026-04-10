import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonIcon, IonCard, IonCardContent, IonSpinner, IonText 
} from '@ionic/react';
import { imageOutline } from 'ionicons/icons';
import { processXraySignal } from '../dspEngine';

// PASTE YOUR LINK HERE
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/[...]";

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analyzeImage = async (img: HTMLImageElement) => {
    setLoading(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup Canvas
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      // 1. Load AI Model & Predict
      const model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
      const predictions = await model.predict(canvas);
      predictions.sort((a: any, b: any) => b.probability - a.probability);
      
      // 2. Run DSP (Cortical Breach Logic)
      const dspResult = processXraySignal(canvas);

      // 3. Final Report Logic
      if (dspResult?.status === "INVALID") {
        setStats({
          status: "INVALID",
          confidence: "0%",
          message: dspResult.message,
          color: "warning"
        });
      } else {
        const isFractured = dspResult?.status === "CRITICAL" || predictions[0].className === "Fractured";
        setStats({
          status: isFractured ? "CRITICAL / FRACTURED" : "HEALTHY / STABLE",
          confidence: isFractured && dspResult?.status === "CRITICAL" ? dspResult.confidence : (predictions[0].probability * 100).toFixed(1) + "%",
          message: dspResult?.message,
          color: isFractured ? "danger" : "success"
        });
      }
    } catch (error) {
      console.error("Analysis Failed:", error);
      alert("Error: Ensure your Teachable Machine URL is correct and public.");
    }
    setLoading(false);
  };

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => analyzeImage(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>X-RAY CORTICAL DIAGNOSTIC</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <canvas 
            ref={canvasRef} 
            style={{ 
              width: '100%', 
              borderRadius: '12px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              background: '#000'
            }} 
          />
          
          <input type="file" id="xray-upload" hidden accept="image/*" onChange={handleFileChange} />
          
          <IonButton 
            expand="block" 
            style={{ marginTop: '20px' }} 
            onClick={() => document.getElementById('xray-upload')?.click()}
            disabled={loading}
          >
            <IonIcon icon={imageOutline} slot="start" />
            {loading ? <IonSpinner name="dots" /> : "UPLOAD & ANALYZE X-RAY"}
          </IonButton>
        </div>

        {stats && (
          <IonCard>
            <IonCardContent>
              <IonText color={stats.color}>
                <h1 style={{ fontWeight: '900', fontSize: '1.8rem' }}>{stats.status}</h1>
              </IonText>
              <p style={{ fontSize: '1.2rem' }}><b>AI Confidence:</b> {stats.confidence}</p>
              
              <div style={{ width: '100%', height: '10px', background: '#eee', borderRadius: '5px', margin: '10px 0' }}>
                <div style={{ 
                  width: stats.confidence, 
                  height: '100%', 
                  background: stats.color === 'danger' ? '#eb445a' : '#2dd36f',
                  borderRadius: '5px',
                  transition: 'width 0.5s ease-in-out'
                }} />
              </div>
              
              <p style={{ marginTop: '15px', color: '#444', lineHeight: '1.5', fontStyle: 'italic' }}>
                {stats.message}
              </p>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
}