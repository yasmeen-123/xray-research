/**
 * DSP Engine: Cortical Breach Detection Logic
 * Based on Radiology 'Rule of Cortex'
 */
export const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const { width, height } = canvas;

    // 1. VALIDITY GUARD: Is this an X-ray?
    let bonePixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const b = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (b > 160) bonePixels++; 
    }
    const boneDensity = bonePixels / (width * height);

    if (boneDensity < 0.05) {
        return {
            status: "INVALID",
            message: "ANALYSIS ABORTED: Valid bone tissue not detected. Ensure image is a high-contrast X-ray.",
            confidence: "0%"
        };
    }

    // 2. CORTICAL BREACH SCAN 
    // We look for sharp drops in brightness strictly in the white (Cortex) areas
    let structuralAnomalies: any[] = [];
    const margin = 0.12; 

    for (let y = Math.floor(height * margin); y < height * (1 - margin); y += 4) {
        for (let x = Math.floor(width * margin); x < width * (1 - margin); x += 4) {
            const i = (y * width + x) * 4;
            const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

            // DOCTOR'S RULE: Only analyze the white "Cortex" (Brightness > 180)
            if (brightness > 180) { 
                const ahead = (y * width + (x + 8)) * 4;
                const below = ((y + 8) * width + x) * 4;

                if (below < pixels.length) {
                    const bAhead = (pixels[ahead] + pixels[ahead + 1] + pixels[ahead + 2]) / 3;
                    const bBelow = (pixels[below] + pixels[below + 1] + pixels[below + 2]) / 3;
                    
                    // Deviation represents a 'crack' or 'breach' in the white line
                    const breachScore = Math.max(brightness - bAhead, brightness - bBelow);
                    
                    if (breachScore > 90) {
                        structuralAnomalies.push({ x, y, score: breachScore });
                    }
                }
            }
        }
    }

    structuralAnomalies.sort((a, b) => b.score - a.score);
    const topBreach = structuralAnomalies[0];

    // 3. RESULT CLASSIFICATION
    let status = "HEALTHY";
    let message = "CORTICAL ANALYSIS: Bone outer shell (Cortex) is continuous. No breaches found.";
    let confidenceVal = 0;

    if (topBreach) {
        confidenceVal = Math.min(99.9, (topBreach.score / 255) * 190);
        if (confidenceVal > 65) {
            status = "CRITICAL";
            message = `FRACTURE DETECTED: A cortical breach (discontinuity) was found at coordinates [${topBreach.x}, ${topBreach.y}].`;
            
            // Draw the Medical Reticle (The target)
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(topBreach.x, topBreach.y, 45, 0, 2 * Math.PI);
            ctx.stroke();
        } else {
            status = "STABLE";
            message = "MINOR IRREGULARITY: Possible overlap or slight thinning of cortex, but no clear fracture.";
        }
    }

    return {
        status,
        message,
        confidence: confidenceVal.toFixed(1) + "%"
    };
};