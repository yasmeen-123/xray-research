export const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const { width, height } = canvas;
    
    let anomalies: any[] = [];

    // Scanning central ROI (Region of Interest)
    for (let y = Math.floor(height * 0.15); y < height * 0.85; y += 4) {
        for (let x = Math.floor(width * 0.15); x < width * 0.85; x += 4) {
            const i = (y * width + x) * 4;
            const gray = 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];

            if (gray > 190) {
                const ahead = (y * width + (x + 12)) * 4;
                if (ahead < pixels.length) {
                    const grayAhead = (pixels[ahead] + pixels[ahead+1] + pixels[ahead+2]) / 3;
                    const densityDrop = gray - grayAhead;

                    if (densityDrop > 135) { 
                        anomalies.push({ x: x + 6, y, score: densityDrop });
                    }
                }
            }
        }
    }

    if (anomalies.length > 0) {
        anomalies.sort((a, b) => b.score - a.score);
        const top = anomalies[0];

        // --- ULTRA-HIGH VISIBILITY HIGHLIGHTING ---
        ctx.save();
        
        // 1. Create a "Contrast Drop Shadow" (Makes the red visible on white bone)
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "black"; 
        ctx.lineWidth = 10; // Extra thick black backing
        ctx.beginPath();
        ctx.arc(top.x, top.y, 40, 0, 2 * Math.PI);
        ctx.stroke();

        // 2. Neon Red Layer (The actual marker)
        ctx.shadowBlur = 25; // Massive Glow
        ctx.shadowColor = "#ff0000"; 
        ctx.strokeStyle = "#ff0000"; // Pure Bright Red
        ctx.lineWidth = 5; // Bold line
        ctx.beginPath();
        ctx.arc(top.x, top.y, 40, 0, 2 * Math.PI);
        ctx.stroke();

        // 3. Precision Crosshair (White center for maximum "Point" visibility)
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Vertical line
        ctx.moveTo(top.x, top.y - 60); ctx.lineTo(top.x, top.y + 60);
        // Horizontal line
        ctx.moveTo(top.x - 60, top.y); ctx.lineTo(top.x + 60, top.y);
        ctx.stroke();

        ctx.restore();

        return { 
            status: "CRITICAL", 
            x: top.x, 
            y: top.y, 
            score: top.score 
        };
    }

    return { status: "STABLE" };
};