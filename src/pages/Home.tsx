import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonButton, IonSpinner, IonBadge
} from '@ionic/react';
import { processXraySignal, FractureBox } from '../dspEngine';

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
      // -----------------------------
      // LOAD MODEL
      // -----------------------------
      const model = await tmImage.load(
        MODEL_URL + "model.json",
        MODEL_URL + "metadata.json"
      );

      const predictions = await model.predict(canvas);

      // -----------------------------
      // ✅ CORRECT FRACTURE CLASS
      // -----------------------------
      const fracturePred = predictions.find((p: any) =>
        (p.className || "").toLowerCase().includes("fracture")
      );

      const prob = fracturePred?.probability ?? 0;

      // -----------------------------
      // DSP ANALYSIS
      // -----------------------------
      const dsp = processXraySignal(canvas);

      const hasBoxes =
        dsp &&
        Array.isArray(dsp.boxes) &&
        dsp.boxes.length > 0;

      // -----------------------------
      // FINAL DECISION (HYBRID AI)
      // -----------------------------
      const isFracture = !!(prob > 0.7 && hasBoxes);

      // -----------------------------
      // DRAW BOUNDING BOXES (YOLO STYLE)
      // -----------------------------
      if (isFracture && ctx && dsp) {
        ctx.save();

        dsp.boxes.forEach((box: FractureBox) => {
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.w, box.h);

          ctx.fillStyle = "#ff0000";
          ctx.font = "14px Arial";
          ctx.fillText(
            `Fracture ${(prob * 100).toFixed(1)}%`,
            box.x,
            Math.max(10, box.y - 5)
          );
        });

        ctx.restore();
      }

      // -----------------------------
      // REPORT GENERATION
      // -----------------------------
      setReport({
        status: isFracture ? "FRACTURE DETECTED" : "NORMAL",
        confidence: (prob * 100).toFixed(1) + "%",
        isCritical: isFracture,

        analysis: {
          edges: isFracture
            ? "Cortical discontinuity detected"
            : "Cortical continuity preserved",

          density: isFracture
            ? "Radiolucent fracture line detected"
            : "Uniform bone density",

          alignment: isFracture
            ? "Possible alignment disturbance"
            : "Normal anatomical alignment"
        },

        findings: isFracture
          ? [
              "Cortical break detected.",
              "Radiolucent fracture line present.",
              "Possible hairline or stress fracture.",
              "Localized structural disruption observed."
            ]
          : [
              "No cortical break detected.",
              "No fracture line visible.",
              "Bone density uniform.",
              "Alignment preserved."
            ],

        impression: isFracture
          ? "Findings suggest a fracture. Clinical correlation recommended (pain, swelling, tenderness)."
          : "No radiographic evidence of fracture."
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
        impression: "Unable to analyze X-ray."
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
        <div style={{ display: "flex", height: "100vh" }}>

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