export type FractureResult = {
  hasFracture: boolean;
  confidence: number;
  message: string;
};

export const processXraySignal = (canvas: HTMLCanvasElement): FractureResult | null => {
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
  // STEP 2: SMOOTH (reduce noise)
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
  // STEP 3: EDGE DETECTION
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
  // STEP 4: THRESHOLD
  // -----------------------------
  const avgEdge = edges.reduce((a, b) => a + b, 0) / edges.length;
  const threshold = avgEdge * 1.3;

  // -----------------------------
  // STEP 5: FRACTURE SIGNAL SCORING
  // -----------------------------
  let fractureScore = 0;
  let strongBreaks = 0;

  for (let y = 3; y < height - 3; y++) {
    for (let x = 3; x < width - 3; x++) {
      const i = y * width + x;

      if (edges[i] > threshold) {

        // Edge discontinuity
        const drop = Math.max(
          edges[i] - edges[i + 1],
          edges[i] - edges[i - 1],
          edges[i] - edges[i + width],
          edges[i] - edges[i - width]
        );

        // Dark crack detection
        const center = smooth[i];
        const neighborAvg =
          (smooth[i - 1] +
           smooth[i + 1] +
           smooth[i - width] +
           smooth[i + width]) / 4;

        const darkLine = neighborAvg - center;

        // Strict fracture condition
        if (drop > threshold * 0.9 && darkLine > 6) {
          fractureScore += drop + darkLine;
          strongBreaks++;
        }
      }
    }
  }

  // -----------------------------
  // STEP 6: NORMALIZATION
  // -----------------------------
  const normalizedScore = fractureScore / (width * height);

  // -----------------------------
  // STEP 7: FINAL DECISION
  // -----------------------------
  let hasFracture = false;
  let confidence = 0;
  let message = "";

  if (strongBreaks > 50 && normalizedScore > 0.5) {
    hasFracture = true;
    confidence = Math.min(1, normalizedScore);
    message = "Fracture Detected";
  } else if (strongBreaks < 20) {
    hasFracture = false;
    confidence = 0.9;
    message = "Normal";
  } else {
    hasFracture = false;
    confidence = 0.5;
    message = "Uncertain — Needs Review";
  }

  return {
    hasFracture,
    confidence,
    message
  };
};