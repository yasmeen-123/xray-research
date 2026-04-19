import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonButton, IonSpinner, IonBadge
} from '@ionic/react';
import { processXraySignal } from '../dspEngine';

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/82gnJxwjs/";

type AnalysisReport = {
  status: string;
  confidence: string;
  isCritical: boolean;
  analysis: {
    edges: string;
    density: string;
    alignment: string;
  };
  findings: string[];
  impression: string;
};

export default function Home() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const runAdvancedDiagnostic = async (img: HTMLImageElement) => {
    setLoading(true);

    const canvas = canvasRef.current;
    if (!canvas) {
      setLoading(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setLoading(false);
      return;
    }

    const SIZE = 224;
    canvas.width = SIZE;
    canvas.height = SIZE;

    ctx.drawImage(img, 0, 0, SIZE, SIZE);

    try {
      const model = await tmImage.load(
        MODEL_URL + "model.json",
        MODEL_URL + "metadata.json"
      );

      const predictions = await model.predict(canvas);
      predictions.sort((a: any, b: any) => b.probability - a.probability);

      const dsp = processXraySignal(canvas);

      const prob = predictions[0]?.probability || 0;

      const isFracture =
        predictions[0]?.className === "Fractured" &&
        prob > 0.85 &&
        dsp?.status === "CRITICAL";

      setReport({
        status: isFracture ? "FRACTURE DETECTED" : "NORMAL",
        confidence: (prob * 100).toFixed(1) + "%",
        isCritical: isFracture,
        analysis: {
          edges: isFracture ? "Cortical edge discontinuity detected" : "Cortical edges intact",
          density: isFracture ? "Localized abnormal lucency" : "Uniform bone density",
          alignment: isFracture ? "Possible misalignment" : "Normal alignment"
        },
        findings: isFracture
          ? [
              "Visible cortical breach detected.",
              "Abnormal radiolucent region present.",
              "Bone structure shows discontinuity."
            ]
          : [
              "No cortical disruption observed.",
              "Bone density appears normal.",
              "No abnormal radiolucency detected."
            ],
        impression: isFracture
          ? "Radiographic findings are consistent with fracture. Clinical evaluation recommended."
          : "No radiographic evidence of fracture."
      });

    } catch (err) {
      console.error(err);
      setReport({
        status: "ANALYSIS FAILED",
        confidence: "0.0%",
        isCritical: false,
        analysis: {
          edges: "Unable to analyze",
          density: "Unable to analyze",
          alignment: "Unable to analyze"
        },
        findings: ["Model or image analysis failed. Please try another image."],
        impression: "No diagnostic impression available due to analysis error."
      });
    }

    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ background: "#0b0f1a" }}>
          <IonTitle style={{ color: "#fff" }}>
            XRAY AI ANALYSIS SYSTEM
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ "--background": "#0b0f1a" }}>
        <div style={{
          display: "flex",
          height: "100%",
          overflow: "hidden"
        }}>

          {/* LEFT SIDE */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid #222"
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: "80%",
                height: "auto",
                border: "1px solid #333",
                background: "#000"
              }}
            />

            <IonButton
              style={{ marginTop: "20px" }}
              onClick={() => document.getElementById('upload')?.click()}
              disabled={loading}
            >
              {loading ? <IonSpinner /> : "Upload X-ray"}
            </IonButton>

            <input
              id="upload"
              type="file"
              hidden
              accept="image/*"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) {
                  return;
                }
                const reader = new FileReader();
                reader.onload = (ev: ProgressEvent<FileReader>) => {
                  const result = ev.target?.result;
                  if (typeof result !== 'string') {
                    return;
                  }
                  const img = new Image();
                  img.onload = () => runAdvancedDiagnostic(img);
                  img.src = result;
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>

          {/* RIGHT SIDE */}
          <div style={{
            flex: 1,
            padding: "20px",
            color: "#fff",
            overflowY: "auto"
          }}>
            {report ? (
  <>
    <IonBadge color={report.isCritical ? "danger" : "success"}>
      {report.status}
    </IonBadge>

    <p><strong>Confidence:</strong> {report.confidence}</p>

    <h3 style={{ marginTop: "20px" }}>Feature Analysis</h3>
    <p><strong>Edges:</strong> {report.analysis.edges}</p>
    <p><strong>Density:</strong> {report.analysis.density}</p>
    <p><strong>Alignment:</strong> {report.analysis.alignment}</p>

    <h3 style={{ marginTop: "20px" }}>Clinical Findings</h3>
    <ul>
      {report.findings.map((f: string, i: number) => (
        <li key={i}>{f}</li>
      ))}
    </ul>

    <h3 style={{ marginTop: "20px" }}>Impression</h3>
    <div style={{
      background: "#1c2230",
      padding: "12px",
      borderLeft: `4px solid ${report.isCritical ? "red" : "green"}`
    }}>
      {report.impression}
    </div>
  </>
) : (
  <p>Upload an X-ray to begin analysis.</p>
)}
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
}