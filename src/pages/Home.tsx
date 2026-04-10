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

    // Lock canvas dimensions to prevent window expansion
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      const model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
      const predictions = await model.predict(canvas);
      predictions.sort((a: any, b: any) => b.probability - a.probability);
      
      const dsp = processXraySignal(canvas);
      
      // Strict Logic: Prevents false positives from healthy images
      const isFracture = predictions[0].className === "Fractured" && 
                         predictions[0].probability > 0.96 && 
                         dsp?.status === "CRITICAL";

      setStats({
        status: isFracture ? "CRITICAL: FRACTURE IDENTIFIED" : "NORMAL STUDY",
        confidence: (predictions[0].probability * 100).toFixed(1) + "%",
        isWarning: isFracture,
        report: {
            study: "DIGITAL RADIOGRAPHIC INTERPRETATION",
            technique: "Plain radiograph, anteroposterior projection",
            // Using your provided elaborated findings
            findings: isFracture 
                ? [
                    "Clear cortical discontinuity involving the osseous aspect.",
                    "Transverse/oblique fracture line localized in the metaphyseal region.",
                    "Increased soft tissue density noted, consistent with localized swelling.",
                    "Potential mild displacement of the distal fracture fragment."
                  ]
                : [
                    "Cortical margins appear sharp, continuous, and intact.",
                    "No linear lucency or osseous breach detected.",
                    "Soft tissue planes appear normal with no significant edema.",
                    "Anatomical alignment is maintained throughout."
                  ],
            // Using your provided elaborated impression
            impression: isFracture 
                ? "Imaging features consistent with an acute fracture. Associated soft tissue swelling suggests localized trauma. Clinical correlation recommended."
                : "No radiographic evidence of acute bony injury or joint dislocation."
        }
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#000', borderBottom: '1px solid #0f0f0f' }}>
          <IonTitle style={{ color: '#080808', fontSize: '0.85rem', letterSpacing: '2px' }}>
            RADIOLOGY <span style={{ color: '#131414' }}>INTELLIGENCE</span> v4.0
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent scrollY={false} style={{ '--background': '#719fb1' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '15px' }}>
          
          {/* IMAGE SECTION: Fixed container to prevent expansion */}
          <div style={{ 
            flex: '0 0 50%', 
            background: '#6d99aa', 
            borderRadius: '10px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            position: 'relative',
            border: '2px solid #000000',
            overflow: 'hidden'
          }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            {!loading && !stats && (
                <div style={{ color: '#422121', textAlign: 'center' }}>
                    <IonIcon icon={scanOutline} style={{ fontSize: '3rem' }} />
                    <p style={{ fontSize: '0.8rem' }}>UPLOAD DICOM/X-RAY DATA</p>
                </div>
            )}
          </div>

          <div style={{ padding: '15px 0' }}>
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
              {loading ? <IonSpinner name="lines-sharp" /> : "START INTERPRETATION SCAN"}
            </IonButton>
          </div>

          {/* RADIOLOGY REPORT PANEL: Professional Layout */}
          <div style={{ 
            flex: '1', 
            background: '#f0e9e9', 
            borderRadius: '10px', 
            padding: '15px', 
            border: '1px solid #030303',
            overflowY: 'auto' // Only this section scrolls if text is long
          }}>
            {stats ? (
              <IonGrid className="ion-no-padding">
                <IonRow>
                  <IonCol size="12" style={{ borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ color: 'rgb(255, 255, 255)', fontSize: '0.9rem', margin: '0' }}>RADIOLOGY REPORT</h3>
                    <IonBadge color={stats.isWarning ? 'danger' : 'success'}>{stats.status}</IonBadge>
                  </IonCol>
                  <IonCol size="12">
                    <p style={{ color: '#aec916', fontSize: '0.7rem' }}><strong>STUDY:</strong> {stats.report.study}</p>
                    <p style={{ color: '#8d0586', fontSize: '0.7rem' }}><strong>TECHNIQUE:</strong> {stats.report.technique}</p>
                    
                    <h6 style={{ color: '#ece4e4', fontSize: '0.75rem', marginTop: '15px' }}>FINDINGS:</h6>
                    <ul style={{ color: '#fa7508', fontSize: '0.75rem', paddingLeft: '15px' }}>
                        {stats.report.findings.map((f:string, i:number) => <li key={i} style={{ marginBottom: '4px' }}>{f}</li>)}
                    </ul>
                    
                    <div style={{ background: stats.isWarning ? 'rgba(9, 80, 212, 0.1)' : 'rgba(4, 7, 5, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${stats.isWarning ? '#eb445a' : '#2dd36f'}` }}>
                        <p style={{ color: '#ffffff', margin: 0, fontSize: '0.75rem', lineHeight: '1.4' }}>
                            <strong>IMPRESSION:</strong> {stats.report.impression}
                        </p>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            ) : (
                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0c0b0b', fontSize: '0.7rem', letterSpacing: '1px' }}>
                    READY FOR ANALYSIS...
                </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}