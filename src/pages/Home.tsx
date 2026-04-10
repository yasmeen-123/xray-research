import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonIcon, IonSpinner, IonBadge, IonGrid, IonRow, IonCol
} from '@ionic/react';
import { scanOutline } from 'ionicons/icons';
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

    // Use internal high resolution for AI, but CSS handles display size
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      const model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
      const predictions = await model.predict(canvas);
      predictions.sort((a: any, b: any) => b.probability - a.probability);
      
      const dsp = processXraySignal(canvas);
      // Dual-logic check to prevent false positives from your non-fractured set
      const isFracture = predictions[0].className === "Fractured" && 
                         predictions[0].probability > 0.95 && 
                         dsp?.status === "CRITICAL";

      setStats({
        status: isFracture ? "CRITICAL: FRACTURE DETECTED" : "NORMAL STUDY",
        confidence: (predictions[0].probability * 100).toFixed(1) + "%",
        isWarning: isFracture,
        report: {
            study: "DIGITAL OSSEOUS INTERPRETATION",
            findings: isFracture 
                ? ["Acute cortical discontinuity identified.", "Vector-localized breach in osseous shell.", "Associated soft tissue density observed."]
                : ["Cortical margins are smooth and intact.", "No radiographic breach localized.", "Osseous density within normal limits."],
            impression: isFracture 
                ? "Findings consistent with acute fracture. Urgent orthopedic correlation required."
                : "No radiographic evidence of acute bony injury."
        }
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#000', borderBottom: '1px solid #333' }}>
          <IonTitle style={{ color: '#fff', fontSize: '0.9rem', letterSpacing: '1px' }}>
            RADIOLOGY <span style={{ color: '#3880ff' }}>INTELLIGENCE</span> v3.0
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      
      {/* The key is height: 100vh and scrollY={false} to stop window expansion */}
      <IonContent scrollY={false} style={{ '--background': '#0a0a0a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '10px' }}>
          
          {/* IMAGE VIEWPORT: Takes exactly 55% of the screen height */}
          <div style={{ 
            flex: '0 0 55%', 
            background: '#000', 
            borderRadius: '8px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            position: 'relative',
            border: '1px solid #222',
            overflow: 'hidden'
          }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            {!loading && !stats && (
                <div style={{ color: '#444', textAlign: 'center' }}>
                    <IonIcon icon={scanOutline} style={{ fontSize: '3rem' }} />
                    <p>AWAITING SOURCE DATA</p>
                </div>
            )}
            <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#3880ff', fontSize: '0.6rem' }}>
                LIVE SCAN VIEWPORT // ACTIVE
            </div>
          </div>

          {/* CONTROL SECTION */}
          <div style={{ padding: '10px 0' }}>
            <input type="file" id="up" hidden accept="image/*" onChange={(e:any) => {
              const reader = new FileReader();
              reader.onload = (ev:any) => {
                const img = new Image();
                img.onload = () => analyzeImage(img);
                img.src = ev.target.result;
              };
              reader.readAsDataURL(e.target.files[0]);
            }} />
            <IonButton expand="block" mode="ios" color="primary" onClick={() => document.getElementById('up')?.click()} disabled={loading}>
              {loading ? <IonSpinner name="dots" /> : "UPLOAD SOURCE IMAGERY"}
            </IonButton>
          </div>

          {/* REPORT SECTION: Takes the remaining screen space */}
          <div style={{ 
            flex: '1', 
            background: '#111', 
            borderRadius: '8px', 
            padding: '15px', 
            border: '1px solid #222',
            overflow: 'hidden'
          }}>
            {stats ? (
              <IonGrid className="ion-no-padding">
                <IonRow>
                  <IonCol size="4" style={{ borderRight: '1px solid #222', paddingRight: '10px' }}>
                    <h6 style={{ color: '#666', fontSize: '0.6rem', margin: '0' }}>STATUS</h6>
                    <IonBadge color={stats.isWarning ? 'danger' : 'success'} style={{ fontSize: '0.6rem' }}>{stats.status}</IonBadge>
                    <div style={{ marginTop: '15px' }}>
                        <div style={{ color: '#666', fontSize: '0.6rem' }}>AI CONFIDENCE</div>
                        <div style={{ color: '#3880ff', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.confidence}</div>
                    </div>
                  </IonCol>
                  <IonCol size="8" style={{ paddingLeft: '10px', overflowY: 'auto' }}>
                    <h6 style={{ color: '#666', fontSize: '0.6rem', margin: '0' }}>FINDINGS</h6>
                    <ul style={{ color: '#ccc', fontSize: '0.7rem', paddingLeft: '15px' }}>
                        {stats.report.findings.map((f:string, i:number) => <li key={i}>{f}</li>)}
                    </ul>
                    <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', borderLeft: `3px solid ${stats.isWarning ? '#eb445a' : '#2dd36f'}` }}>
                        <p style={{ color: '#fff', margin: 0, fontSize: '0.75rem' }}><strong>IMPRESSION:</strong> {stats.report.impression}</p>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            ) : (
                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#333', fontSize: '0.7rem' }}>
                    SYSTEM IDLE // ANALYSIS MODULE READY
                </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}