import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonIcon, IonCard, IonCardContent, IonSpinner, IonBadge, IonGrid, IonRow, IonCol
} from '@ionic/react';
import { imageOutline, medicalOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { processXraySignal } from '../dspEngine';

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/82gnJxwjs/";

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

    // Set canvas display size but maintain high-quality internal resolution
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      const model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
      const predictions = await model.predict(canvas);
      predictions.sort((a: any, b: any) => b.probability - a.probability);
      
      const dsp = processXraySignal(canvas);

      // RIGOROUS LOGIC: Both AI and DSP must see strong evidence to call it a fracture
      const strongAI = (predictions.find(p => p.className === "Fractured")?.probability ?? 0) > 0.92;
      const strongDSP = dsp?.status === "CRITICAL";

      setStats({
        status: (strongAI && strongDSP) ? "FRACTURE DETECTED" : "NO FRACTURE DETECTED",
        confidence: (predictions[0].probability * 100).toFixed(1) + "%",
        details: (strongAI && strongDSP) ? dsp?.message : "Cortical shell appears continuous under scan.",
        isWarning: strongAI && strongDSP
      });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>RADIOLOGY AI PRO v2.0</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent color="light" scrollY={false} style={{ '--background': '#f0f2f5' }}>
        <IonGrid style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <IonRow className="ion-justify-content-center" style={{ flex: '1', overflow: 'hidden' }}>
            <IonCol sizeLg="6" sizeMd="8" sizeXs="12" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* FIXED IMAGE CONTAINER: Prevents expansion */}
              <div style={{ 
                flex: '0 0 50%', 
                background: '#000', 
                borderRadius: '12px', 
                margin: '10px 0', 
                overflow: 'hidden', 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: '3px solid #ccc'
              }}>
                <canvas ref={canvasRef} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                {!loading && !stats && <div style={{ color: 'white' }}>Upload X-Ray to Begin</div>}
              </div>

              {/* ACTION BUTTON */}
              <div style={{ padding: '5px 0' }}>
                <input type="file" id="up" hidden accept="image/*" onChange={(e:any) => {
                  const reader = new FileReader();
                  reader.onload = (ev:any) => {
                    const img = new Image();
                    img.onload = () => analyzeImage(img);
                    img.src = ev.target.result;
                  };
                  reader.readAsDataURL(e.target.files[0]);
                }} />
                <IonButton expand="block" color="primary" onClick={() => document.getElementById('up')?.click()}>
                  {loading ? <IonSpinner name="dots" /> : <><IonIcon icon={imageOutline} slot="start" /> UPLOAD PHOTO</>}
                </IonButton>
              </div>

              {/* RESULTS CARD: Fixed size bottom area */}
              {stats && (
                <IonCard style={{ margin: '10px 0', borderRadius: '15px', flex: '0 0 auto' }}>
                  <IonCardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: 0, fontWeight: 'bold' }}>SCAN RESULTS</h4>
                      <IonBadge color={stats.isWarning ? 'danger' : 'success'}>{stats.status}</IonBadge>
                    </div>
                    <p style={{ margin: '10px 0' }}>AI Confidence: <strong>{stats.confidence}</strong></p>
                    <div style={{ background: '#f4f4f4', padding: '10px', borderRadius: '8px', fontSize: '0.9rem' }}>
                      <strong>Conclusion:</strong> {stats.details}
                    </div>
                  </IonCardContent>
                </IonCard>
              )}
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}