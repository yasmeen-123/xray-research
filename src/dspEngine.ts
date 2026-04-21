export const processXraySignal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // -----------------------------
    // STEP 1: GRAYSCALE
    // -----------------------------
    const gray: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
        gray.push(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    }

    // -----------------------------
    // STEP 2: GAUSSIAN SMOOTH (reduce noise)
    // -----------------------------
    const smooth: number[] = new Array(width * height).fill(0);
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sum = 0;
            let k = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    sum += gray[(y + ky) * width + (x + kx)] * kernel[k];
                    k++;
                }
            }

            smooth[y * width + x] = sum / 16;
        }
    }

    // -----------------------------
    // STEP 3: SOBEL EDGES
    // -----------------------------
    const edges: number[] = new Array(width * height).fill(0);

    const gx = [-1,0,1,-2,0,2,-1,0,1];
    const gy = [-1,-2,-1,0,0,0,1,2,1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sumX = 0, sumY = 0;
            let k = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixel = smooth[(y + ky) * width + (x + kx)];
                    sumX += pixel * gx[k];
                    sumY += pixel * gy[k];
                    k++;
                }
            }

            edges[y * width + x] = Math.sqrt(sumX * sumX + sumY * sumY);
        }
    }

    // -----------------------------
    // STEP 4: THRESHOLD
    // -----------------------------
    const avgEdge = edges.reduce((a, b) => a + b, 0) / edges.length;
    const strongEdge = avgEdge * 1.8;

    // -----------------------------
    // STEP 5: FRACTURE DETECTION
    // -----------------------------
    let best = { x: 0, y: 0, score: 0 };

    for (let y = 10; y < height - 10; y++) {
        for (let x = 10; x < width - 10; x++) {

            const idx = y * width + x;

            // 1. Strong edge (bone)
            if (edges[idx] > strongEdge) {

                // 2. Check continuity break (cortex break)
                const right = edges[idx + 2];
                const left = edges[idx - 2];
                const up = edges[idx - width * 2];
                const down = edges[idx + width * 2];

                const continuityDrop =
                    Math.max(
                        edges[idx] - right,
                        edges[idx] - left,
                        edges[idx] - up,
                        edges[idx] - down
                    );

                // 3. Detect dark line (radiolucent fracture)
                const center = smooth[idx];
                const neighborAvg =
                    (smooth[idx - 1] +
                     smooth[idx + 1] +
                     smooth[idx - width] +
                     smooth[idx + width]) / 4;

                const darkLine = neighborAvg - center;

                // -----------------------------
                // FINAL CONDITION (DOCTOR LOGIC)
                // -----------------------------
                if (
                    continuityDrop > strongEdge * 0.9 &&   // cortex break
                    darkLine > 8                          // lucent line
                ) {
                    const score = continuityDrop + darkLine;

                    if (score > best.score) {
                        best = { x, y, score };
                    }
                }
            }
        }
    }

    // -----------------------------
    // STEP 6: VALIDATE RESULT
    // -----------------------------
    if (best.score > strongEdge * 1.2) {

        ctx.save();

        // Red accurate marker
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(best.x, best.y, 18, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.restore();

        return {
            status: "FRACTURE",
            x: best.x,
            y: best.y,
            score: best.score,
            threshold: strongEdge
        };
    }

    return {
        status: "NORMAL",
        threshold: strongEdge
    };
};