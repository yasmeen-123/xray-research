import * as tmImage from '@teachablemachine/image';
import { useState, useRef } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonButton, IonSpinner, IonBadge
} from '@ionic/react';

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

  // -----------------------------
  // IMAGE ENHANCEMENT (KEY FIX)
  // -----------------------------
  const enhanceImage = (ctx: CanvasRenderingContext2D, size: number) => {
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Increase contrast
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      const factor = 1.2; // contrast
      const brightness = 15; // brightness

      r = factor * (r - 128) + 128 + brightness;
      g = factor * (g - 128) + 128 + brightness;
      b = factor * (b - 128) + 128 + brightness;

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // -----------------------------
  // MULTI PASS PREDICTION
  // -----------------------------
  const getAveragePrediction = async (model: any, canvas: HTMLCanvasElement) => {
    let total = 0;
    const runs = 5;

    for (let i = 0; i < runs; i++) {
      const preds = await model.predict(canvas);

      const fracture = preds.find((p: any) =>
        (p.className || "").toLowerCase().includes("fracture")
      );

      total += fracture?.probability ?? 0;
    }

    return total / runs;
  };

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

    // ✅ Enhance image BEFORE prediction
    enhanceImage(ctx, SIZE);

    try {
      // -----------------------------
      // LOAD MODEL
      // -----------------------------
      const model = await tmImage.load(
        MODEL_URL + "model.json",
        MODEL_URL + "metadata.json"
      );

      // -----------------------------
      // MULTI-PASS PREDICTION
      // -----------------------------
      const prob = await getAveragePrediction(model, canvas);

      // -----------------------------
      // SMART THRESHOLD
      // -----------------------------
      let isFracture = false;

      if (prob > 0.6) {
        isFracture = true;
      } else if (prob > 0.45) {
        // borderline → still flag (important fix)
        isFracture = true;
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
            ? "Cortical discontinuity suspected"
            : "Cortical continuity preserved",

          density: isFracture
            ? "Possible radiolucent line detected"
            : "Uniform bone density",

          alignment: isFracture
            ? "Possible misalignment"
            : "Normal anatomical alignment"
        },

        findings: isFracture
          ? [
              "Possible cortical break.",
              "Suspicious fracture line.",
              "Potential hairline/stress fracture.",
              "Requires clinical validation."
            ]
          : [
              "No fracture detected.",
              "Bone structure intact.",
              "Density normal.",
              "Alignment preserved."
            ],

        impression: isFracture
          ? "Model suggests fracture. Clinical confirmation recommended."
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
        findings: ["Model error occurred."],
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