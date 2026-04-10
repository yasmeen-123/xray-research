export const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const { width, height } = canvas;
    let candidates: any[] = [];
    
    // Only scan the bone-containing regions (middle 70%)
    for (let y = Math.floor(height * 0.15); y < height * 0.85; y += 6) {
        for (let x = Math.floor(width * 0.15); x < width * 0.85; x += 6) {
            const i = (y * width + x) * 4;
            const bright = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;

            // Strict Cortex filter: ignores grey tissue/shadows
            if (bright > 225) { 
                const ahead = (y * width + (x + 15)) * 4;
                if (ahead < pixels.length) {
                    const bAhead = (pixels[ahead] + pixels[ahead+1] + pixels[ahead+2]) / 3;
                    const gap = bright - bAhead;

                    if (gap > 170) { // Very deep breach detection
                        candidates.push({ x, y, score: gap });
                    }
                }
            }
        }
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const top = candidates[0];

        // Draw HUD Crosshair
        ctx.strokeStyle = "#eb445a";
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(top.x, top.y, 25, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Horizontal and Vertical Crosshair lines
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(top.x - 35, top.y); ctx.lineTo(top.x + 35, top.y);
        ctx.moveTo(top.x, top.y - 35); ctx.lineTo(top.x, top.y + 35);
        ctx.stroke();

        return { status: "CRITICAL", x: top.x, y: top.y };
    }

    return { status: "STABLE" };
};