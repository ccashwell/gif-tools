/**
 * Frame Manipulation Utilities
 *
 * Provides utilities for manipulating image frames before creating GIFs,
 * including GIF timing and sequence manipulation.
 */

import { ImageData, GifValidationError } from './types.js';
import { GifReader } from './reader.js';
import { createAnimatedGif } from './helpers.js';
import { GifResult } from './gif-result.js';

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeOptions {
  width: number;
  height: number;
  /** Resize algorithm: 'nearest' or 'bilinear' */
  algorithm?: 'nearest' | 'bilinear';
}

export interface RotateOptions {
  /** Rotation angle in degrees (90, 180, 270) */
  angle: 90 | 180 | 270;
}

export interface FlipOptions {
  /** Flip horizontally */
  horizontal?: boolean;
  /** Flip vertically */
  vertical?: boolean;
}

export interface ColorAdjustOptions {
  /** Brightness adjustment (-1 to 1) */
  brightness?: number;
  /** Contrast adjustment (-1 to 1) */
  contrast?: number;
  /** Saturation adjustment (-1 to 1) */
  saturation?: number;
  /** Hue shift in degrees (-180 to 180) */
  hue?: number;
}

/**
 * Crops an image to the specified rectangle
 */
export function cropImage(
  imageData: ImageData,
  options: CropOptions
): ImageData {
  const { x, y, width, height } = options;
  const { width: srcWidth, height: srcHeight, data: srcData } = imageData;

  // Validate crop bounds
  if (x < 0 || y < 0 || x + width > srcWidth || y + height > srcHeight) {
    throw new GifValidationError('Crop bounds exceed image dimensions');
  }

  const croppedData = new Uint8Array(width * height * 4);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIndex = ((y + row) * srcWidth + (x + col)) * 4;
      const dstIndex = (row * width + col) * 4;

      croppedData[dstIndex] = srcData[srcIndex]; // R
      croppedData[dstIndex + 1] = srcData[srcIndex + 1]; // G
      croppedData[dstIndex + 2] = srcData[srcIndex + 2]; // B
      croppedData[dstIndex + 3] = srcData[srcIndex + 3]; // A
    }
  }

  return { width, height, data: croppedData };
}

/**
 * Resizes an image using nearest neighbor or bilinear interpolation
 */
export function resizeImage(
  imageData: ImageData,
  options: ResizeOptions
): ImageData {
  const {
    width: newWidth,
    height: newHeight,
    algorithm = 'bilinear',
  } = options;
  const { width: srcWidth, height: srcHeight, data: srcData } = imageData;

  if (newWidth <= 0 || newHeight <= 0) {
    throw new GifValidationError('Invalid resize dimensions');
  }

  const resizedData = new Uint8Array(newWidth * newHeight * 4);

  if (algorithm === 'nearest') {
    // Nearest neighbor interpolation
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor((x / newWidth) * srcWidth);
        const srcY = Math.floor((y / newHeight) * srcHeight);

        const srcIndex = (srcY * srcWidth + srcX) * 4;
        const dstIndex = (y * newWidth + x) * 4;

        resizedData[dstIndex] = srcData[srcIndex]; // R
        resizedData[dstIndex + 1] = srcData[srcIndex + 1]; // G
        resizedData[dstIndex + 2] = srcData[srcIndex + 2]; // B
        resizedData[dstIndex + 3] = srcData[srcIndex + 3]; // A
      }
    }
  } else {
    // Bilinear interpolation
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = (x / newWidth) * srcWidth;
        const srcY = (y / newHeight) * srcHeight;

        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, srcWidth - 1);
        const y2 = Math.min(y1 + 1, srcHeight - 1);

        const fx = srcX - x1;
        const fy = srcY - y1;

        const dstIndex = (y * newWidth + x) * 4;

        for (let c = 0; c < 4; c++) {
          const p1 = srcData[(y1 * srcWidth + x1) * 4 + c];
          const p2 = srcData[(y1 * srcWidth + x2) * 4 + c];
          const p3 = srcData[(y2 * srcWidth + x1) * 4 + c];
          const p4 = srcData[(y2 * srcWidth + x2) * 4 + c];

          const interpolated =
            p1 * (1 - fx) * (1 - fy) +
            p2 * fx * (1 - fy) +
            p3 * (1 - fx) * fy +
            p4 * fx * fy;

          resizedData[dstIndex + c] = Math.round(interpolated);
        }
      }
    }
  }

  return { width: newWidth, height: newHeight, data: resizedData };
}

/**
 * Rotates an image by 90, 180, or 270 degrees
 */
export function rotateImage(
  imageData: ImageData,
  options: RotateOptions
): ImageData {
  const { angle } = options;
  const { width, height, data } = imageData;

  let newWidth: number, newHeight: number;
  let rotatedData: Uint8Array;

  switch (angle) {
    case 90:
      newWidth = height;
      newHeight = width;
      rotatedData = new Uint8Array(newWidth * newHeight * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIndex = (y * width + x) * 4;
          const dstIndex = ((width - 1 - x) * newWidth + y) * 4;

          rotatedData[dstIndex] = data[srcIndex];
          rotatedData[dstIndex + 1] = data[srcIndex + 1];
          rotatedData[dstIndex + 2] = data[srcIndex + 2];
          rotatedData[dstIndex + 3] = data[srcIndex + 3];
        }
      }
      break;

    case 180:
      newWidth = width;
      newHeight = height;
      rotatedData = new Uint8Array(newWidth * newHeight * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIndex = (y * width + x) * 4;
          const dstIndex = ((height - 1 - y) * width + (width - 1 - x)) * 4;

          rotatedData[dstIndex] = data[srcIndex];
          rotatedData[dstIndex + 1] = data[srcIndex + 1];
          rotatedData[dstIndex + 2] = data[srcIndex + 2];
          rotatedData[dstIndex + 3] = data[srcIndex + 3];
        }
      }
      break;

    case 270:
      newWidth = height;
      newHeight = width;
      rotatedData = new Uint8Array(newWidth * newHeight * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIndex = (y * width + x) * 4;
          const dstIndex = (x * newWidth + (height - 1 - y)) * 4;

          rotatedData[dstIndex] = data[srcIndex];
          rotatedData[dstIndex + 1] = data[srcIndex + 1];
          rotatedData[dstIndex + 2] = data[srcIndex + 2];
          rotatedData[dstIndex + 3] = data[srcIndex + 3];
        }
      }
      break;

    default:
      throw new GifValidationError(
        `Unsupported rotation angle: ${angle as number}`
      );
  }

  return { width: newWidth, height: newHeight, data: rotatedData };
}

/**
 * Flips an image horizontally and/or vertically
 */
export function flipImage(
  imageData: ImageData,
  options: FlipOptions
): ImageData {
  const { horizontal = false, vertical = false } = options;
  const { width, height, data } = imageData;

  if (!horizontal && !vertical) {
    return { width, height, data: new Uint8Array(data) };
  }

  const flippedData = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;

      const dstX = horizontal ? width - 1 - x : x;
      const dstY = vertical ? height - 1 - y : y;
      const dstIndex = (dstY * width + dstX) * 4;

      flippedData[dstIndex] = data[srcIndex];
      flippedData[dstIndex + 1] = data[srcIndex + 1];
      flippedData[dstIndex + 2] = data[srcIndex + 2];
      flippedData[dstIndex + 3] = data[srcIndex + 3];
    }
  }

  return { width, height, data: flippedData };
}

/**
 * Adjusts color properties of an image
 */
export function adjustColors(
  imageData: ImageData,
  options: ColorAdjustOptions
): ImageData {
  const { brightness = 0, contrast = 0, saturation = 0, hue = 0 } = options;
  const { width, height, data } = imageData;

  const adjustedData = new Uint8Array(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    // Apply brightness
    if (brightness !== 0) {
      const brightnessFactor = brightness * 255;
      r = Math.max(0, Math.min(255, r + brightnessFactor));
      g = Math.max(0, Math.min(255, g + brightnessFactor));
      b = Math.max(0, Math.min(255, b + brightnessFactor));
    }

    // Apply contrast
    if (contrast !== 0) {
      const contrastFactor = (1 + contrast) / (1 - contrast);
      r = Math.max(0, Math.min(255, (r - 128) * contrastFactor + 128));
      g = Math.max(0, Math.min(255, (g - 128) * contrastFactor + 128));
      b = Math.max(0, Math.min(255, (b - 128) * contrastFactor + 128));
    }

    // Apply saturation and hue adjustments (simplified HSL conversion)
    if (saturation !== 0 || hue !== 0) {
      const hsl = rgbToHsl(r, g, b);

      if (saturation !== 0) {
        hsl.s = Math.max(0, Math.min(1, hsl.s + saturation));
      }

      if (hue !== 0) {
        hsl.h = (hsl.h + hue / 360) % 1;
        if (hsl.h < 0) hsl.h += 1;
      }

      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }

    adjustedData[i] = Math.round(r);
    adjustedData[i + 1] = Math.round(g);
    adjustedData[i + 2] = Math.round(b);
    adjustedData[i + 3] = a;
  }

  return { width, height, data: adjustedData };
}

/**
 * Converts RGB to HSL
 */
function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / diff) % 6;
        break;
      case g:
        h = (b - r) / diff + 2;
        break;
      case b:
        h = (r - g) / diff + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

/**
 * Converts HSL to RGB
 */
function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

/**
 * Applies a simple blur effect
 */
export function blurImage(imageData: ImageData, radius = 1): ImageData {
  const { width, height, data } = imageData;
  const blurredData = new Uint8Array(width * height * 4);

  const kernelSize = radius * 2 + 1;
  const kernel = new Array(kernelSize * kernelSize).fill(
    1 / (kernelSize * kernelSize)
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const index = (py * width + px) * 4;

          const weight = kernel[(ky + radius) * kernelSize + (kx + radius)];
          r += data[index] * weight;
          g += data[index + 1] * weight;
          b += data[index + 2] * weight;
          a += data[index + 3] * weight;
        }
      }

      const dstIndex = (y * width + x) * 4;
      blurredData[dstIndex] = Math.round(r);
      blurredData[dstIndex + 1] = Math.round(g);
      blurredData[dstIndex + 2] = Math.round(b);
      blurredData[dstIndex + 3] = Math.round(a);
    }
  }

  return { width, height, data: blurredData };
}

// ===== GIF MANIPULATION FUNCTIONS =====

export interface GifSpeedOptions {
  /** Speed multiplier (0.5 = half speed, 2.0 = double speed) */
  speedMultiplier: number;
  /** Minimum delay in milliseconds (prevents too-fast animations) */
  minDelay?: number;
  /** Maximum delay in milliseconds (prevents too-slow animations) */
  maxDelay?: number;
}

export interface GifManipulationOptions {
  /** Whether to reverse the frame order */
  reverse?: boolean;
  /** Speed adjustment options */
  speed?: GifSpeedOptions;
}

/**
 * Reverses the frame order of an animated GIF
 *
 * Creates a new GIF with frames in reverse order, creating a "boomerang"
 * or reverse playback effect.
 *
 * @param gifData - Original GIF data as Uint8Array
 * @returns A new GIF with reversed frame order
 *
 * @example
 * ```typescript
 * const reversedGif = reverseGif(originalGifData);
 * ```
 */
export function reverseGif(gifData: Uint8Array): GifResult {
  const reader = new GifReader(gifData);
  const info = reader.getInfo();
  const frames = reader.getFrames();

  if (frames.length <= 1) {
    throw new GifValidationError('Cannot reverse GIF with only one frame');
  }

  // Reverse the frame order
  const reversedFrames = frames.slice().reverse();

  // Convert frames to the format expected by createAnimatedGif
  const animationFrames = reversedFrames.map(frame => frame.imageData);

  return createAnimatedGif(animationFrames, {
    delay: reversedFrames[0]?.delay || 100, // Use first frame delay as default
    loops: info.loops,
  });
}

/**
 * Changes the playback speed of an animated GIF
 *
 * Adjusts frame delays to speed up or slow down animation playback.
 * Includes safety limits to prevent extremely fast or slow animations.
 *
 * @param gifData - Original GIF data as Uint8Array
 * @param options - Speed adjustment options
 * @returns A new GIF with adjusted playback speed
 *
 * @example
 * ```typescript
 * // Double the speed
 * const fastGif = changeGifSpeed(originalGifData, { speedMultiplier: 2.0 });
 *
 * // Half speed with minimum delay
 * const slowGif = changeGifSpeed(originalGifData, {
 *   speedMultiplier: 0.5,
 *   minDelay: 50
 * });
 * ```
 */
export function changeGifSpeed(
  gifData: Uint8Array,
  options: GifSpeedOptions
): GifResult {
  const { speedMultiplier, minDelay = 20, maxDelay = 1000 } = options;

  if (speedMultiplier <= 0) {
    throw new GifValidationError('Speed multiplier must be positive');
  }

  const reader = new GifReader(gifData);
  const info = reader.getInfo();
  const frames = reader.getFrames();

  if (frames.length <= 1) {
    throw new GifValidationError('Cannot change speed of static GIF');
  }

  // Adjust frame delays and get average delay
  let totalDelay = 0;
  const adjustedFrames = frames.map(frame => {
    let newDelay = frame.delay / speedMultiplier;

    // Apply safety limits
    newDelay = Math.max(minDelay, Math.min(maxDelay, newDelay));
    const roundedDelay = Math.round(newDelay);
    totalDelay += roundedDelay;

    return frame.imageData;
  });

  const averageDelay = Math.round(totalDelay / frames.length);

  return createAnimatedGif(adjustedFrames, {
    delay: averageDelay,
    loops: info.loops,
  });
}

/**
 * Applies multiple manipulations to a GIF (reverse, speed change, etc.)
 *
 * Combines multiple GIF manipulation operations into a single function
 * for convenience and better performance.
 *
 * @param gifData - Original GIF data as Uint8Array
 * @param options - Manipulation options
 * @returns A new GIF with applied manipulations
 *
 * @example
 * ```typescript
 * // Create a reversed, double-speed GIF
 * const manipulatedGif = manipulateGif(originalGifData, {
 *   reverse: true,
 *   speed: { speedMultiplier: 2.0 }
 * });
 *
 * // Just slow down
 * const slowGif = manipulateGif(originalGifData, {
 *   speed: { speedMultiplier: 0.5, minDelay: 100 }
 * });
 * ```
 */
export function manipulateGif(
  gifData: Uint8Array,
  options: GifManipulationOptions
): GifResult {
  const { reverse = false, speed } = options;

  const reader = new GifReader(gifData);
  const info = reader.getInfo();
  let frames = reader.getFrames();

  if (frames.length <= 1 && (reverse || speed)) {
    throw new GifValidationError('Cannot manipulate static GIF');
  }

  // Apply reverse if requested
  if (reverse) {
    frames = frames.slice().reverse();
  }

  // Apply speed changes if requested
  if (speed) {
    const { speedMultiplier, minDelay = 20, maxDelay = 1000 } = speed;

    if (speedMultiplier <= 0) {
      throw new GifValidationError('Speed multiplier must be positive');
    }

    frames = frames.map(frame => ({
      ...frame,
      delay: Math.round(
        Math.max(minDelay, Math.min(maxDelay, frame.delay / speedMultiplier))
      ),
    }));
  }

  // Convert to animation format and calculate average delay
  let totalDelay = 0;
  const animationFrames = frames.map(frame => {
    totalDelay += frame.delay;
    return frame.imageData;
  });

  const averageDelay = Math.round(totalDelay / frames.length);

  return createAnimatedGif(animationFrames, {
    delay: averageDelay,
    loops: info.loops,
  });
}
