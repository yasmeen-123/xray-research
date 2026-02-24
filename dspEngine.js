/**
 * DSP Engine for X-Ray Analysis
 * Purpose: Signal Normalization and Feature Enhancement
 */

export const processXraySignal = (canvasId) => {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // 1. Grayscale Conversion (Dimensionality Reduction)
    // We convert 3 signals (RGB) into 1 (Intensity) to simplify the data.
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Standard Luma formula: Y = 0.299R + 0.587G + 0.114B
        const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
        
        pixels[i] = pixels[i + 1] = pixels[i + 2] = grayscale;
    }

    // 2. Contrast Enhancement (Signal Amplification)
    // This makes the difference between bone (high density) and tissue (low density) clearer.
    const contrast = 40; // This value can be adjusted for your research
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = factor * (pixels[i] - 128) + 128;     // Red
        pixels[i + 1] = factor * (pixels[i + 1] - 128) + 128; // Green
        pixels[i + 2] = factor * (pixels[i + 2] - 128) + 128; // Blue
    }

    // Apply the transformed signal back to the canvas
    ctx.putImageData(imageData, 0, 0);
};