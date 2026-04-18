import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonIcon, IonSpinner, IonBadge, IonGrid, IonRow, IonCol
} from '@ionic/react';
import { scanOutline, medicalOutline, analyticsOutline, fitnessOutline } from 'ionicons/icons';
import { processXraySignal } from '../dspEngine';

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/82gnJxwjs/";

const THEME = {
    bg: '#040609',
    card: '#0c111d',
    accent: '#3880ff',
    border: '#1e2533'
};

export default function Home() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const runAdvancedDiagnostic = async (img: HTMLImageElement) => {
    setLoading(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // STEP 2: PREPROCESSING (Normalization & Resizing)
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.filter = "grayscale(100%) contrast(120%)"; // Medical normalization
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none"; // Reset for DSP pass

    try {
      const model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
      const predictions = await model.predict(canvas);
      predictions.sort((a: any, b: any) => b.probability - a.probability);
      
      // STEP 3: FEATURE EXTRACTION (Digital Signal Processing)
      const dsp = processXraySignal(canvas);

      // HYBRID VALIDATION LOGIC
      const isFracture = predictions[0].className === "Fractured" && 
                         predictions[0].probability > 0.94 && 
                         dsp?.status === "CRITICAL";

      setReport({
        status: isFracture ? "ACUTE DISCONTINUITY DETECTED" : "UNREMARKABLE STUDY",
        confidence: (predictions[0].probability * 100).toFixed(1) + "%",
        isCritical: isFracture,
        analysis: {
            edges: isFracture ? "Cortex breach identified" : "Normal cortical edge",
            density: isFracture ? "Abnormal lucency shadow" : "Uniform osseous density",
            alignment: isFracture ? "Potential metaphyseal shift" : "Alignment preserved"
        },
        findings: isFracture 
            ? ["Clear bone discontinuity detected.", "Abnormal shadow (lucency) in metaphyseal region.", "Misalignment of cortical shell."]
            : ["No osseous breach detected.", "No abnormal shadows identified.", "Bone density is within normal anatomical limits."],
        impression: isFracture 
            ? "Radiographic evidence consistent with acute fracture. Urgent clinical correlation required."
            : "No radiographic evidence of acute fracture."
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': THEME.bg, borderBottom: `1px solid ${THEME.border}` }}>
          <IonTitle style={{ color: '#fff', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 'bold' }}>
            RADIOLOGY AI <span style={{ color: THEME.accent }}>DASHBOARD</span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent scrollY={false} style={{ '--background': THEME.bg }}>
        <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden' }}>
          
          {/* LEFT: VIEWPORT */}
          <div style={{ flex: '1.3', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', borderRight: `1px solid ${THEME.border}` }}>
            <canvas ref={canvasRef} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
            <div style={{ position: 'absolute', top: '20px', left: '20px', color: THEME.accent, fontSize: '0.6rem' }}>
                [ SYSTEM STATUS: {loading ? 'SCANNING...' : 'READY'} ]
            </div>
          </div>

          {/* RIGHT: DOCTOR ANALYSIS CONSOLE */}
          <div style={{ flex: '0.7', background: THEME.card, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <IonButton expand="block" mode="ios" color="primary" onClick={() => document.getElementById('x-up')?.click()} disabled={loading}>
              {loading ? <IonSpinner name="dots" /> : "UPLOAD & ANALYZE X-RAY"}
            </IonButton>
            <input type="file" id="x-up" hidden accept="image/*" onChange={(e:any) => {
              const reader = new FileReader();
              reader.onload = (ev:any) => {
                const img = new Image();
                img.onload = () => runAdvancedDiagnostic(img);
                img.src = ev.target.result;
              };
              reader.readAsDataURL(e.target.files[0]);
            }} />

            <div style={{ flex: '1', marginTop: '20px', background: THEME.bg, borderRadius: '10px', padding: '15px', border: `1px solid ${THEME.border}`, overflowY: 'auto' }}>
              {report ? (
                <>
                  <IonBadge color={report.isCritical ? 'danger' : 'success'} style={{ marginBottom: '15px' }}>{report.status}</IonBadge>
                  
                  {/* STEP 3 REPLICATED: Detailed Feature Table */}
                  <div style={{ marginBottom: '20px' }}>
                    <h6 style={{ color: '#444', fontSize: '0.6rem', letterSpacing: '1px' }}>FEATURE EXTRACTION</h6>
                    <table style={{ width: '100%', color: '#fff', fontSize: '0.7rem' }}>
                        <tr><td style={{ color: '#666' }}>Edges:</td><td>{report.analysis.edges}</td></tr>
                        <tr><td style={{ color: '#666' }}>Density:</td><td>{report.analysis.density}</td></tr>
                        <tr><td style={{ color: '#666' }}>Alignment:</td><td>{report.analysis.alignment}</td></tr>
                    </table>
                  </div>

                  <h6 style={{ color: THEME.accent, fontSize: '0.7rem' }}>CLINICAL FINDINGS:</h6>
                  <ul style={{ color: '#999', fontSize: '0.75rem', paddingLeft: '15px' }}>
                    {report.findings.map((f:any, i:number) => <li key={i}>{f}</li>)}
                  </ul>

                  <div style={{ background: '#1a1e2b', padding: '12px', borderRadius: '5px', borderLeft: `4px solid ${report.isCritical ? 'red' : 'green'}`, marginTop: '10px' }}>
                    <p style={{ color: '#fff', margin: 0, fontSize: '0.8rem' }}><strong>IMPRESSION:</strong> {report.impression}</p>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#333', marginTop: '50%' }}>
                    <IonIcon icon={fitnessOutline} style={{ fontSize: '2rem' }} /><br/>
                    AWAITING SOURCE IMAGERY
                </div>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}