export type FractureBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
};

export const processXraySignal = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // -----------------------------
  // STEP 1: GRAYSCALE
  // -----------------------------
  const gray: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    gray.push(
      0.299 * pixels[i] +
      0.587 * pixels[i + 1] +
      0.114 * pixels[i + 2]
    );
  }

  // -----------------------------
  // STEP 2: SMOOTH (noise reduce)
  // -----------------------------
  const smooth: number[] = new Array(width * height).fill(0);
  const kernel = [1,2,1,2,4,2,1,2,1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0, k = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * kernel[k++];
        }
      }

      smooth[y * width + x] = sum / 16;
    }
  }

  // -----------------------------
  // STEP 3: EDGE DETECTION (SOBEL)
  // -----------------------------
  const edges: number[] = new Array(width * height).fill(0);
  const gx = [-1,0,1,-2,0,2,-1,0,1];
  const gy = [-1,-2,-1,0,0,0,1,2,1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumX = 0, sumY = 0, k = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = smooth[(y + ky) * width + (x + kx)];
          sumX += val * gx[k];
          sumY += val * gy[k];
          k++;
        }
      }

      edges[y * width + x] = Math.sqrt(sumX * sumX + sumY * sumY);
    }
  }

  // -----------------------------
  // STEP 4: ADAPTIVE THRESHOLD
  // -----------------------------
  const avgEdge = edges.reduce((a, b) => a + b, 0) / edges.length;

  const weakThreshold = avgEdge * 1.2;   // LOWERED (important)
  const strongThreshold = avgEdge * 1.6;

  // -----------------------------
  // STEP 5: HEATMAP (IMPROVED)
  // -----------------------------
  const heatmap: number[] = new Array(width * height).fill(0);

  for (let y = 3; y < height - 3; y++) {
    for (let x = 3; x < width - 3; x++) {
      const i = y * width + x;

      if (edges[i] > weakThreshold) {

        // continuity break (important for fracture)
        const drop = Math.max(
          edges[i] - edges[i + 1],
          edges[i] - edges[i - 1],
          edges[i] - edges[i + width],
          edges[i] - edges[i - width]
        );

        // dark fracture line
        const center = smooth[i];
        const neighborAvg =
          (smooth[i - 1] +
           smooth[i + 1] +
           smooth[i - width] +
           smooth[i + width]) / 4;

        const darkLine = neighborAvg - center;

        // 🔥 RELAXED CONDITIONS (CRITICAL FIX)
        if (drop > weakThreshold * 0.4 || darkLine > 4) {
          heatmap[i] = drop + darkLine;
        }
      }
    }
  }

  // -----------------------------
  // STEP 6: CLUSTERING → MULTI BOX
  // -----------------------------
  const visited = new Set<number>();
  const boxes: FractureBox[] = [];

  for (let i = 0; i < heatmap.length; i++) {
    if (heatmap[i] > weakThreshold && !visited.has(i)) {

      const queue = [i];

      let minX = width, minY = height;
      let maxX = 0, maxY = 0;
      let score = 0;
      let count = 0;

      while (queue.length) {
        const idx = queue.pop()!;
        if (visited.has(idx)) continue;

        visited.add(idx);

        const x = idx % width;
        const y = Math.floor(idx / width);

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        score += heatmap[idx];
        count++;

        const neighbors = [
          idx + 1, idx - 1,
          idx + width, idx - width
        ];

        neighbors.forEach(n => {
          if (
            n >= 0 &&
            n < heatmap.length &&
            heatmap[n] > weakThreshold &&
            !visited.has(n)
          ) {
            queue.push(n);
          }
        });
      }

      // 🔥 SMALL BOXES ALLOWED (important for hairline fractures)
      if (count > 8) {
        boxes.push({
          x: minX,
          y: minY,
          w: maxX - minX,
          h: maxY - minY,
          score
        });
      }
    }
  }

  return {
    boxes,
    threshold: weakThreshold
  };
};