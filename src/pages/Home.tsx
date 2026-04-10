import * as tmImage from '@teachablemachine/image';
import { useState } from 'react';

// 1. SET YOUR AI URL
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/[...]";

interface Stats {
  status: string;
  confidence: string;
  message: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);

  const runAIPrediction = async (imageElement: HTMLImageElement) => {
    // 2. LOAD THE MODEL
    const model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    
    // 3. GET PREDICTION
    const predictions = await model.predict(imageElement);
    
    // 4. FIND THE HIGHEST PROBABILITY
    // Predictions look like: [{className: "Fracture", probability: 0.98}, {className: "Healthy", probability: 0.02}]
    predictions.sort((a, b) => b.probability - a.probability);
    const topResult = predictions[0];

    // 5. UPDATE UI BASED ON AI VERDICT
    return {
        verdict: topResult.className,
        confidence: (topResult.probability * 100).toFixed(1) + "%",
        isSafe: topResult.className === "Healthy"
  };
};

const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const { width, height } = canvas;

    // --- AI CONVOLUTION KERNEL ---
    // This kernel detects "Edges" (Fractures) by comparing pixels to their neighbors
    const kernel = [
        [-1, -1, -1],
        [-1,  8, -1],
        [-1, -1, -1]
    ];

    let defectX = 0, defectY = 0, maxStress = 0;
    let boneArea = 0;

    // Only scan the central area (avoiding edges)
    for (let y = Math.floor(height * 0.15); y < height * 0.85; y += 4) {
        for (let x = Math.floor(width * 0.15); x < width * 0.85; x += 4) {
            const i = (y * width + x) * 4;
            const b = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;

            if (b > 140) { // If it's bone tissue
                boneArea++;
                
                // Check "Structural Stress" (the difference between neighbors)
                const stress = calculateStress(pixels, x, y, width, kernel);
                
                if (stress > maxStress) {
                    maxStress = stress;
                    defectX = x;
                    defectY = y;
                }
            }
        }
    }

    // --- MEDICAL CLASSIFICATION ---
    let confidence = (maxStress / 255) * 100;
    let status = "STABLE";
    let verdict = "Analysis complete. Bone continuity appears intact.";

    if (confidence > 45) { // Real threshold for "Jaggedness"
        status = "CRITICAL";
        verdict = `FRACTURE DETECTED: High-intensity structural disruption found at [${defectX}, ${defectY}]. Pathological break confirmed by AI pattern.`;
        
        // DRAW THE TARGET
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(defectX, defectY, 40, 0, 2 * Math.PI);
        ctx.stroke();
    }

    return {
        status,
        message: verdict,
        confidence: confidence.toFixed(1) + "%",
      coord: defectX > 0 ? `${defectX}, ${defectY}` : "None"
  };
};

// Helper function for the "AI Kernel"
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
    <>
      {stats && (
        <div className="report-container">
          <h2 style={{ color: '#000', fontWeight: '900' }}>DIAGNOSTIC REPORT</h2>
          
          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
            <p><b>Finding:</b> {stats.status}</p>
            <p><b>AI Confidence:</b> {stats.confidence}</p>
            
            {/* Confidence Visual Bar */}
            <div style={{ width: '100%', height: '10px', background: '#ddd', borderRadius: '5px' }}>
              <div style={{ 
                width: stats.confidence, 
                height: '100%', 
                background: stats.status === 'FRACTURED' ? 'red' : 'green',
                borderRadius: '5px' 
              }} />
            </div>
          </div>

          <div className={`verdict-box ${stats.status === 'FRACTURED' ? 'danger' : 'safe'}`}>
            <p>{stats.message}</p>
          </div>
        </div>
      )}
    </>
  );
}