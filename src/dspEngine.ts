export const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const { width, height } = canvas;
    let breaches: any[] = [];

    // Doctor's Logic: Search for specific "breaks" in the high-density Cortex
    for (let y = 50; y < height - 50; y += 5) {
        for (let x = 50; x < width - 50; x += 5) {
            const i = (y * width + x) * 4;
            const current = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

            // Only look at the Cortex (Bright White)
            if (current > 200) {
                const ahead = (y * width + (x + 10)) * 4;
                const bAhead = (pixels[ahead] + pixels[ahead + 1] + pixels[ahead + 2]) / 3;

                // Breach = sudden deep drop in brightness
                const gap = current - bAhead;

                // Threshold raised to 130 to avoid false positives from shadows
                if (gap > 130) {
                    breaches.push({ x, y, score: gap });
                }
            }
        }
    }

    if (breaches.length > 0) {
        breaches.sort((a, b) => b.score - a.score);
        const top = breaches[0];

        // Draw visual marker only on extremely high-confidence breaches
        ctx.strokeStyle = "red";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(top.x, top.y, 30, 0, 2 * Math.PI);
        ctx.stroke();

        return { status: "CRITICAL", message: "Structural breach detected in the cortical line." };
    }

    return { status: "STABLE", message: "No significant cortical breach found." };
};