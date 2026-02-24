/**
 * dspEngine.ts
 * Digital Signal Processing Engine for X-Ray Analysis
 * This file handles the mathematical transformation of the image signal.
 */

export const processXraySignal = (canvas: HTMLCanvasElement): void => {
    const ctx = canvas.getContext('2d');
    
    // Safety check: ensure the context exists before processing
    if (!ctx) {
        console.error("Could not obtain 2D context from canvas");
        return;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data; // This is our 1D signal array [R, G, B, A, R, G, B, A...]

    /**
     * PHASE 1: SIGNAL NORMALIZATION (Grayscale Conversion)
     * We reduce the 3-channel RGB signal into a 1-channel Intensity signal.
     * Formula: Y = 0.299R + 0.587G + 0.114B
     */
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Calculating the weighted luminance
        const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;

        pixels[i]     = grayscale; // Red channel
        pixels[i + 1] = grayscale; // Green channel
        pixels[i + 2] = grayscale; // Blue channel
        // pixels[i + 3] is Alpha (transparency), we leave it at 255
    }

    /**
     * PHASE 2: CONTRAST ENHANCEMENT (Point Processing)
     * We apply a linear transformation to stretch the histogram.
     * This makes the anatomical structures in the X-ray more distinct.
     */
    const contrastLevel = 40; // Adjust this value (0-100) for your research experiments
    const factor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel));

    for (let i = 0; i < pixels.length; i += 4) {
        // Apply the contrast factor to each channel
        pixels[i]     = factor * (pixels[i] - 128) + 128;
        pixels[i + 1] = factor * (pixels[i + 1] - 128) + 128;
        pixels[i + 2] = factor * (pixels[i + 2] - 128) + 128;
    }

    // 3. Output the processed signal back to the UI
    ctx.putImageData(imageData, 0, 0);
};