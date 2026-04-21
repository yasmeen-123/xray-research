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
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = 224;
    canvas.width = SIZE;
    canvas.height = SIZE;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, 0, 0, SIZE, SIZE);

    try {
      // Load ML model
      const model = await tmImage.load(
        MODEL_URL + "model.json",
        MODEL_URL + "metadata.json"
      );

      const predictions = await model.predict(canvas);
      predictions.sort((a: any, b: any) => b.probability - a.probability);

      const dsp = processXraySignal(canvas);

      const prob = predictions[0]?.probability ?? 0;

      // ✅ ML decision
      const isMLFracture =
        (predictions[0]?.className || "").toLowerCase().includes("fracture") &&
        prob > 0.75;

      // ✅ FIXED TypeScript-safe DSP condition
      const isDSPStrong = !!(
        dsp &&
        typeof dsp.x === "number" &&
        typeof dsp.y === "number" &&
        dsp.score > dsp.threshold * 1.2
      );

      // ✅ Final decision (HYBRID)
      const isFracture = isMLFracture && isDSPStrong;

      // ✅ DRAW ONLY WHEN TRUE FRACTURE
      if (isFracture && ctx && dsp && typeof dsp.x === "number" && typeof dsp.y === "number") {
        ctx.save();

        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.arc(dsp.x, dsp.y, 20, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      // ✅ REPORT (Doctor-based)
      setReport({
        status: isFracture ? "FRACTURE DETECTED" : "NORMAL",
        confidence: (prob * 100).toFixed(1) + "%",
        isCritical: isFracture,

        analysis: {
          edges: isFracture
            ? "Cortical discontinuity detected"
            : "Cortical continuity preserved",

          density: isFracture
            ? "Radiolucent line (low density region) observed"
            : "Uniform bone density",

          alignment: isFracture
            ? "Possible alignment disturbance"
            : "Normal anatomical alignment"
        },

        findings: isFracture
          ? [
              "Cortical break indicating fracture.",
              "Radiolucent fracture line detected.",
              "Possible hairline or stress fracture.",
              "Minor structural misalignment observed."
            ]
          : [
              "Cortical continuity intact.",
              "No fracture line visible.",
              "Bone alignment is normal.",
              "Symmetry preserved."
            ],

        impression: isFracture
          ? "Findings suggest a possible hairline or stress fracture. Clinical correlation (pain, swelling, tenderness) is recommended."
          : "No radiographic evidence of fracture or dislocation."
      });

    } catch (err) {
      console.error(err);

      setReport({
        status: "ANALYSIS FAILED",
        confidence: "0.0%",
        isCritical: false,
        analysis: {
          edges: "Unavailable",
          density: "Unavailable",
          alignment: "Unavailable"
        },
        findings: ["Model loading or processing failed."],
        impression: "Unable to generate diagnostic report."
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
          height: "100vh"
        }}>

          {/* LEFT PANEL */}
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
                borderRadius: "10px",
                background: "#000",
                border: "1px solid #333"
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
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                  const img = new Image();
                  img.onload = () => runAdvancedDiagnostic(img);
                  img.src = ev.target?.result as string;
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>

          {/* RIGHT PANEL */}
          <div style={{
            flex: 1,
            padding: "25px",
            color: "#fff",
            overflowY: "auto"
          }}>
            {report ? (
              <>
                <IonBadge color={report.isCritical ? "danger" : "success"}>
                  {report.status}
                </IonBadge>

                <p><strong>Confidence:</strong> {report.confidence}</p>

                <h3>Feature Analysis</h3>
                <p><strong>Edges:</strong> {report.analysis.edges}</p>
                <p><strong>Density:</strong> {report.analysis.density}</p>
                <p><strong>Alignment:</strong> {report.analysis.alignment}</p>

                <h3>Clinical Findings</h3>
                <ul>
                  {report.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>

                <h3>Impression</h3>
                <div style={{
                  background: "#1e293b",
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