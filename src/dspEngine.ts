export const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // ---- STEP 1: Convert to grayscale array ----
    const gray: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
        gray.push(0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2]);
    }

    // ---- STEP 2: Sobel Edge Detection ----
    const edges: number[] = new Array(width * height).fill(0);

    const gx = [-1,0,1,-2,0,2,-1,0,1];
    const gy = [-1,-2,-1,0,0,0,1,2,1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sumX = 0, sumY = 0;
            let k = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixel = gray[(y + ky) * width + (x + kx)];
                    sumX += pixel * gx[k];
                    sumY += pixel * gy[k];
                    k++;
                }
            }

            edges[y * width + x] = Math.sqrt(sumX * sumX + sumY * sumY);
        }
    }

    // ---- STEP 3: Dynamic Threshold ----
    const avgEdge = edges.reduce((a, b) => a + b, 0) / edges.length;
    const threshold = avgEdge * 1.5; // adaptive

    let anomalies: any[] = [];

    // ---- STEP 4: Cortex-focused scanning ----
    const margin = Math.floor(width * 0.1);

    for (let y = margin; y < height - margin; y += 2) {
        for (let x = margin; x < width - margin; x += 2) {

            const idx = y * width + x;

            // Strong edge but suddenly weak nearby → discontinuity
            if (edges[idx] > threshold) {
                const neighbor = edges[idx + 5] || 0;
                const drop = edges[idx] - neighbor;

                if (drop > threshold * 0.8) {
                    anomalies.push({ x, y, score: drop });
                }
            }
        }
    }

    // ---- STEP 5: Highlight ----
    if (anomalies.length > 0) {
        anomalies.sort((a, b) => b.score - a.score);
        const top = anomalies[0];

        ctx.save();

        ctx.strokeStyle = "black";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(top.x, top.y, 40, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.shadowBlur = 25;
        ctx.shadowColor = "#ff0000";
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(top.x, top.y, 40, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y - 60);
        ctx.lineTo(top.x, top.y + 60);
        ctx.moveTo(top.x - 60, top.y);
        ctx.lineTo(top.x + 60, top.y);
        ctx.stroke();

        ctx.restore();

        return {
            status: "CRITICAL",
            x: top.x,
            y: top.y,
            score: top.score,
            threshold
        };
    }

    return { status: "STABLE", threshold };
};