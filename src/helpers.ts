/**
 * Helper functions for common GIF creation tasks
 *
 * This module provides convenient, high-level functions for creating GIFs
 * without needing to work with low-level GIF writing details.
 */

import {
  ImageData,
  IndexedImage,
  ImageOptions,
  GlobalColorTableOptions,
  RGBColor,
  GifValidationError,
} from './types.js';

import { GifWriter } from './writer.js';
import { MedianCutQuantizer } from './quantizer.js';
import { GifResult } from './gif-result.js';

/**
 * Creates a static GIF from image data using automatic color quantization.
 *
 * This is the most flexible static GIF creation function, accepting raw RGBA
 * image data and automatically quantizing colors to fit GIF's palette limitations.
 *
 * @param imageData - The source image data in RGBA format
 * @param imageData.width - Image width in pixels
 * @param imageData.height - Image height in pixels
 * @param imageData.data - RGBA pixel data as Uint8Array or Uint8ClampedArray
 * @param options - Optional configuration
 * @param options.maxColors - Maximum colors in quantized palette (default: 256)
 * @param options.globalColorTable - Global color table options
 * @param options.imageOptions - Image-specific options (position, delay, etc.)
 * @returns A GifResult with convenient output methods
 * @throws {GifValidationError} When image data is invalid
 *
 * @example
 * ```typescript
 * // Create from canvas ImageData
 * const canvas = document.createElement('canvas');
 * const ctx = canvas.getContext('2d');
 * const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 * const gif = createStaticGif(imageData);
 *
 * // Save or use the result
 * const dataUrl = gif.toDataURL();
 * await gif.saveToFile('output.gif');
 * ```
 *
 * @example
 * ```typescript
 * // Create with custom options
 * const gif = createStaticGif(imageData, {
 *   maxColors: 128,
 *   imageOptions: { delay: 0 }
 * });
 * ```
 */
export function createStaticGif(
  imageData: ImageData,
  options: {
    maxColors?: number;
    globalColorTable?: GlobalColorTableOptions;
    imageOptions?: ImageOptions;
  } = {}
): GifResult {
  const { maxColors = 256, globalColorTable = {}, imageOptions = {} } = options;

  // Quantize the image
  const quantizer = new MedianCutQuantizer(maxColors);
  const indexedImage = quantizer.quantize(imageData);

  // Create GIF
  const writer = new GifWriter();
  writer.writeStaticGif(indexedImage, globalColorTable, imageOptions);

  return new GifResult(writer.toUint8Array());
}

/**
 * Creates an animated GIF from multiple image frames.
 *
 * Processes multiple frames into a single animated GIF with consistent color
 * quantization across all frames. All frames are quantized using a unified
 * palette for optimal color consistency.
 *
 * @param frames - Array of image frames in RGBA format
 * @param options - Optional configuration
 * @param options.maxColors - Maximum colors in shared palette (default: 256)
 * @param options.delay - Delay between frames in milliseconds (default: 100)
 * @param options.loops - Number of animation loops, 0 for infinite (default: 0)
 * @param options.globalColorTable - Global color table options
 * @param options.imageOptions - Per-frame image options array
 * @returns A GifResult with convenient output methods
 * @throws {GifValidationError} When no frames provided or frames are invalid
 *
 * @example
 * ```typescript
 * const frames = [frame1, frame2, frame3]; // ImageData objects
 * const animatedGif = createAnimatedGif(frames, {
 *   delay: 200,
 *   loops: 0 // infinite loop
 * });
 * animatedGif.download('animation.gif');
 * ```
 *
 * @example
 * ```typescript
 * // Different delay for each frame
 * const gif = createAnimatedGif(frames, {
 *   imageOptions: [
 *     { delay: 100 },
 *     { delay: 200 },
 *     { delay: 150 }
 *   ]
 * });
 * ```
 */
export function createAnimatedGif(
  frames: ImageData[],
  options: {
    maxColors?: number;
    delay?: number;
    loops?: number;
    globalColorTable?: GlobalColorTableOptions;
    imageOptions?: ImageOptions[];
  } = {}
): GifResult {
  if (frames.length === 0) {
    throw new GifValidationError('Cannot create animated GIF with no frames');
  }

  const {
    maxColors = 256,
    delay = 100,
    loops = 0,
    globalColorTable = {},
    imageOptions = [],
  } = options;

  // Quantize all frames using the same palette for consistency
  const indexedFrames = quantizeFrames(frames, maxColors);

  // Prepare image options for each frame
  const frameOptions = frames.map((_, index) => ({
    delay,
    ...imageOptions[index],
  }));

  // Create animated GIF
  const writer = new GifWriter();
  writer.writeAnimatedGif(
    indexedFrames,
    globalColorTable,
    { loops },
    frameOptions
  );

  return new GifResult(writer.toUint8Array());
}

/**
 * Creates a solid color GIF of the specified dimensions.
 *
 * This is the simplest way to create a GIF filled with a single color.
 * Perfect for backgrounds, placeholders, or testing.
 *
 * @param width - Image width in pixels (1-65535)
 * @param height - Image height in pixels (1-65535)
 * @param color - RGB color values
 * @param color.red - Red component (0-255)
 * @param color.green - Green component (0-255)
 * @param color.blue - Blue component (0-255)
 * @returns A GifResult with convenient output methods
 * @throws {GifValidationError} When dimensions or color values are invalid
 *
 * @example
 * ```typescript
 * // Create a red 100x100 square
 * const redSquare = createSolidColorGif(100, 100, {
 *   red: 255,
 *   green: 0,
 *   blue: 0
 * });
 *
 * // Use the GIF
 * document.body.innerHTML = `<img src="${redSquare.toDataURL()}">`;
 * ```
 *
 * @example
 * ```typescript
 * // Create a blue background
 * const background = createSolidColorGif(800, 600, {
 *   red: 70,
 *   green: 130,
 *   blue: 180 // Steel blue
 * });
 * ```
 */
export function createSolidColorGif(
  width: number,
  height: number,
  color: RGBColor
): GifResult {
  // Validate inputs
  if (!Number.isInteger(width) || width <= 0) {
    throw new GifValidationError(`Invalid width: ${width}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new GifValidationError(`Invalid height: ${height}`);
  }
  if (!Number.isInteger(color.red) || color.red < 0 || color.red > 255) {
    throw new GifValidationError(`Invalid red value: ${color.red}`);
  }
  if (!Number.isInteger(color.green) || color.green < 0 || color.green > 255) {
    throw new GifValidationError(`Invalid green value: ${color.green}`);
  }
  if (!Number.isInteger(color.blue) || color.blue < 0 || color.blue > 255) {
    throw new GifValidationError(`Invalid blue value: ${color.blue}`);
  }

  // Create simple indexed image
  const pixelCount = width * height;
  const data = new Uint8Array(pixelCount).fill(0); // All pixels use color index 0
  const palette = new Uint8Array([color.red, color.green, color.blue]);

  const indexedImage: IndexedImage = {
    width,
    height,
    data,
    palette,
  };

  const writer = new GifWriter();
  writer.writeStaticGif(indexedImage);

  return new GifResult(writer.toUint8Array());
}

/**
 * Creates a checkerboard pattern GIF with alternating colors.
 *
 * Generates a classic checkerboard pattern with customizable colors and
 * check size. Useful for backgrounds, patterns, or testing.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param color1 - First alternating color (RGB)
 * @param color2 - Second alternating color (RGB)
 * @param checkSize - Size of each check square in pixels (default: 10)
 * @returns A GifResult with convenient output methods
 * @throws {GifValidationError} When dimensions or colors are invalid
 *
 * @example
 * ```typescript
 * // Classic black and white checkerboard
 * const checkerboard = createCheckerboardGif(
 *   200, 200,
 *   { red: 0, green: 0, blue: 0 },     // Black
 *   { red: 255, green: 255, blue: 255 }, // White
 *   20 // 20px squares
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Colorful small checkerboard
 * const colorCheck = createCheckerboardGif(
 *   300, 200,
 *   { red: 255, green: 100, blue: 100 }, // Light red
 *   { red: 100, green: 100, blue: 255 }, // Light blue
 *   5 // Small 5px checks
 * );
 * ```
 */
export function createCheckerboardGif(
  width: number,
  height: number,
  color1: RGBColor,
  color2: RGBColor,
  checkSize = 10
): GifResult {
  const data = new Uint8Array(width * height);

  // Create checkerboard pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const checkX = Math.floor(x / checkSize);
      const checkY = Math.floor(y / checkSize);
      const colorIndex = (checkX + checkY) % 2;
      data[y * width + x] = colorIndex;
    }
  }

  const palette = new Uint8Array([
    color1.red,
    color1.green,
    color1.blue,
    color2.red,
    color2.green,
    color2.blue,
  ]);

  const indexedImage: IndexedImage = {
    width,
    height,
    data,
    palette,
  };

  const writer = new GifWriter();
  writer.writeStaticGif(indexedImage);

  return new GifResult(writer.toUint8Array());
}

/**
 * Quantizes multiple frames using a unified color palette.
 *
 * Internal helper function that ensures all frames in an animation share
 * the same color palette for consistent appearance and optimal compression.
 *
 * @param frames - Array of image frames to quantize
 * @param maxColors - Maximum colors in the shared palette
 * @returns Array of indexed images with shared palette
 * @internal
 */
function quantizeFrames(
  frames: ImageData[],
  maxColors: number
): IndexedImage[] {
  if (frames.length === 0) {
    return [];
  }

  // Collect all colors from all frames
  const allColors = new Set<string>();

  frames.forEach(frame => {
    const { width, height, data } = frame;
    for (let i = 0; i < width * height; i++) {
      const offset = i * 4;
      const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      allColors.add(key);
    }
  });

  // Create unified palette
  const quantizer = new MedianCutQuantizer(maxColors);

  // Use first frame to establish the palette
  const firstIndexed = quantizer.quantize(frames[0]);
  const palette = firstIndexed.palette;

  // Apply the same palette to all frames
  return frames.map(frame => {
    const { width, height, data } = frame;
    const indexedData = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const offset = i * 4;
      const color: RGBColor = {
        red: data[offset],
        green: data[offset + 1],
        blue: data[offset + 2],
      };

      indexedData[i] = quantizer.mapColor(color);
    }

    return {
      width,
      height,
      data: indexedData,
      palette,
    };
  });
}

/**
 * Converts an HTML Canvas element to ImageData format.
 *
 * Extracts pixel data from a canvas element in the format needed for GIF creation.
 * This is a convenient bridge between Canvas API and GIF generation.
 *
 * @param canvas - HTML Canvas element to convert
 * @returns ImageData object with width, height, and RGBA pixel data
 * @throws {GifValidationError} When canvas context cannot be obtained
 *
 * @example
 * ```typescript
 * // Draw on canvas and convert to GIF
 * const canvas = document.createElement('canvas');
 * canvas.width = 200;
 * canvas.height = 100;
 * const ctx = canvas.getContext('2d');
 *
 * // Draw something
 * ctx.fillStyle = 'blue';
 * ctx.fillRect(0, 0, 200, 100);
 * ctx.fillStyle = 'red';
 * ctx.fillRect(50, 25, 100, 50);
 *
 * // Convert to GIF
 * const imageData = canvasToImageData(canvas);
 * const gif = createStaticGif(imageData);
 * ```
 */
export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new GifValidationError('Cannot get 2D context from canvas');
  }

  const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvasImageData.width,
    height: canvasImageData.height,
    data: canvasImageData.data,
  };
}

/**
 * Creates ImageData from raw RGBA pixel data.
 *
 * Constructs an ImageData object from raw pixel data, with validation
 * to ensure data length matches dimensions.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param data - RGBA pixel data (4 bytes per pixel)
 * @returns ImageData object ready for GIF creation
 * @throws {GifValidationError} When data length doesn't match dimensions
 *
 * @example
 * ```typescript
 * // Create a simple 2x2 image
 * const width = 2, height = 2;
 * const data = new Uint8Array([
 *   255, 0, 0, 255,   // Red pixel
 *   0, 255, 0, 255,   // Green pixel
 *   0, 0, 255, 255,   // Blue pixel
 *   255, 255, 0, 255  // Yellow pixel
 * ]);
 *
 * const imageData = createImageData(width, height, data);
 * const gif = createStaticGif(imageData);
 * ```
 */
export function createImageData(
  width: number,
  height: number,
  data: Uint8Array | Uint8ClampedArray
): ImageData {
  if (data.length !== width * height * 4) {
    throw new GifValidationError(
      `Data length mismatch: expected ${width * height * 4}, got ${data.length}`
    );
  }

  return {
    width,
    height,
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
  };
}

/**
 * Creates a gradient GIF with smooth color transition.
 *
 * Generates a linear gradient between two colors in the specified direction.
 * Perfect for backgrounds, UI elements, or artistic effects.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param startColor - Starting gradient color (RGB)
 * @param endColor - Ending gradient color (RGB)
 * @param direction - Gradient direction (default: 'horizontal')
 * @returns A GifResult with convenient output methods
 *
 * @example
 * ```typescript
 * // Horizontal red to blue gradient
 * const gradient = createGradientGif(
 *   300, 100,
 *   { red: 255, green: 0, blue: 0 },   // Red
 *   { red: 0, green: 0, blue: 255 },   // Blue
 *   'horizontal'
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Vertical sunset gradient
 * const sunset = createGradientGif(
 *   200, 300,
 *   { red: 255, green: 94, blue: 77 },  // Coral
 *   { red: 255, green: 154, blue: 0 },  // Orange
 *   'vertical'
 * );
 * ```
 */
export function createGradientGif(
  width: number,
  height: number,
  startColor: RGBColor,
  endColor: RGBColor,
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'horizontal'
): GifResult {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;

      // Calculate interpolation factor
      const factor =
        direction === 'horizontal'
          ? x / (width - 1)
          : direction === 'vertical'
          ? y / (height - 1)
          : (x + y) / (width + height - 2);

      // Interpolate colors
      const red = Math.round(
        startColor.red + (endColor.red - startColor.red) * factor
      );
      const green = Math.round(
        startColor.green + (endColor.green - startColor.green) * factor
      );
      const blue = Math.round(
        startColor.blue + (endColor.blue - startColor.blue) * factor
      );

      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255; // Full opacity
    }
  }

  const imageData: ImageData = { width, height, data };
  return createStaticGif(imageData);
}

/**
 * Creates an animated gradient GIF with dynamic effects.
 *
 * Generates an animated gradient with various animation types including
 * shifting, rotating colors, pulsing, and wave effects. Perfect for
 * dynamic backgrounds and eye-catching animations.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param startColor - Starting gradient color (RGB)
 * @param endColor - Ending gradient color (RGB)
 * @param options - Animation configuration
 * @param options.direction - Gradient direction (default: 'horizontal')
 * @param options.animationType - Type of animation (default: 'shift')
 * @param options.frames - Number of animation frames (default: 20)
 * @param options.delay - Delay between frames in ms (default: 100)
 * @param options.loops - Animation loops, 0 for infinite (default: 0)
 * @param options.intensity - Animation strength 0-1 (default: 1.0)
 * @param options.maxColors - Maximum colors in palette (default: 256)
 * @returns A GifResult with convenient output methods
 *
 * @example
 * ```typescript
 * // Shifting gradient animation
 * const shiftingGradient = createAnimatedGradientGif(
 *   200, 100,
 *   { red: 255, green: 0, blue: 0 },
 *   { red: 0, green: 0, blue: 255 },
 *   {
 *     animationType: 'shift',
 *     frames: 30,
 *     delay: 80
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Pulsing gradient with custom intensity
 * const pulsingGradient = createAnimatedGradientGif(
 *   150, 150,
 *   { red: 0, green: 255, blue: 0 },
 *   { red: 255, green: 0, blue: 255 },
 *   {
 *     direction: 'diagonal',
 *     animationType: 'pulse',
 *     intensity: 0.7,
 *     frames: 25
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Wave effect gradient
 * const waveGradient = createAnimatedGradientGif(
 *   300, 200,
 *   { red: 255, green: 255, blue: 0 },
 *   { red: 0, green: 255, blue: 255 },
 *   {
 *     animationType: 'wave',
 *     direction: 'vertical',
 *     frames: 40,
 *     delay: 60
 *   }
 * );
 * ```
 */
export function createAnimatedGradientGif(
  width: number,
  height: number,
  startColor: RGBColor,
  endColor: RGBColor,
  options: {
    direction?: 'horizontal' | 'vertical' | 'diagonal';
    animationType?: 'shift' | 'rotate' | 'pulse' | 'wave';
    frames?: number;
    delay?: number;
    loops?: number;
    intensity?: number; // 0-1, controls animation strength
    maxColors?: number;
  } = {}
): GifResult {
  const {
    direction = 'horizontal',
    animationType = 'shift',
    frames = 20,
    delay = 100,
    loops = 0,
    intensity = 1.0,
  } = options;

  // Validate inputs
  if (!Number.isInteger(width) || width <= 0) {
    throw new GifValidationError(`Invalid width: ${width}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new GifValidationError(`Invalid height: ${height}`);
  }
  if (!Number.isInteger(frames) || frames <= 0) {
    throw new GifValidationError(`Invalid frame count: ${frames}`);
  }
  if (intensity < 0 || intensity > 1) {
    throw new GifValidationError(
      `Invalid intensity: ${intensity}. Must be 0-1`
    );
  }

  // Pre-calculate base factors for each pixel to avoid repeated calculations
  const baseFactors = new Float32Array(width * height);
  const pixelCount = width * height;

  // Pre-calculate base interpolation factors based on direction
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;

      switch (direction) {
        case 'horizontal':
          baseFactors[index] = width > 1 ? x / (width - 1) : 0;
          break;
        case 'vertical':
          baseFactors[index] = height > 1 ? y / (height - 1) : 0;
          break;
        case 'diagonal':
          baseFactors[index] =
            width + height > 2 ? (x + y) / (width + height - 2) : 0;
          break;
      }
    }
  }

  // Pre-calculate color differences for faster interpolation
  const redDiff = endColor.red - startColor.red;
  const greenDiff = endColor.green - startColor.green;
  const blueDiff = endColor.blue - startColor.blue;

  // Pre-calculate animation values for rotate type
  let hue1 = 0,
    hue2 = 0;
  if (animationType === 'rotate') {
    hue1 = rgbToHue(startColor);
    hue2 = rgbToHue(endColor);
  }

  // Pre-calculate wave constants for better performance
  const waveFreq = Math.PI * 4;
  const animFreq = Math.PI * 2;

  const imageFrames: ImageData[] = [];

  for (let frame = 0; frame < frames; frame++) {
    const data = new Uint8Array(pixelCount * 4);
    const t = frame / frames; // Animation progress (0-1)

    // Pre-calculate animation values that are constant for this frame
    let pulse = 0,
      waveOffset = 0,
      rotationHue = 0;

    switch (animationType) {
      case 'pulse':
        pulse = Math.sin(t * animFreq) * 0.5 + 0.5;
        break;
      case 'wave':
        waveOffset = Math.sin(t * animFreq) * intensity * 0.2;
        break;
      case 'rotate':
        rotationHue = t * 360 * intensity;
        break;
    }

    // Optimized inner loop - process pixels in batches
    for (let i = 0; i < pixelCount; i++) {
      const baseFactor = baseFactors[i];
      let factor = baseFactor;

      // Apply animation effect with optimized calculations
      switch (animationType) {
        case 'shift':
          factor = (baseFactor + t * intensity) % 1;
          break;

        case 'pulse':
          factor = baseFactor + (pulse - 0.5) * intensity * 0.3;
          factor = factor < 0 ? 0 : factor > 1 ? 1 : factor; // Faster clamping
          break;

        case 'wave': {
          const y = Math.floor(i / width);
          const x = i % width;
          const waveX =
            Math.sin((x / width) * waveFreq + t * animFreq) * waveOffset;
          const waveY =
            Math.sin((y / height) * waveFreq + t * animFreq) * waveOffset;
          factor = baseFactor + waveX + waveY;
          factor = factor < 0 ? 0 : factor > 1 ? 1 : factor; // Faster clamping
          break;
        }

        case 'rotate':
          // factor stays as baseFactor for rotate
          break;
      }

      // Calculate colors with optimized operations
      let red: number, green: number, blue: number;

      if (animationType === 'rotate') {
        // Optimized HSL calculation for rotate
        let hue = hue1 + (hue2 - hue1) * factor + rotationHue;
        hue = hue % 360;
        if (hue < 0) hue += 360;

        const rgb = hslToRgb(hue);
        red = rgb.red;
        green = rgb.green;
        blue = rgb.blue;
      } else {
        // Optimized linear interpolation - avoid Math.round
        red = (startColor.red + redDiff * factor + 0.5) | 0; // Fast rounding
        green = (startColor.green + greenDiff * factor + 0.5) | 0;
        blue = (startColor.blue + blueDiff * factor + 0.5) | 0;
      }

      // Fast clamping (faster than Math.max/Math.min)
      red = red < 0 ? 0 : red > 255 ? 255 : red;
      green = green < 0 ? 0 : green > 255 ? 255 : green;
      blue = blue < 0 ? 0 : blue > 255 ? 255 : blue;

      // Write pixel data
      const offset = i * 4;
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255; // Full opacity
    }

    imageFrames.push({ width, height, data });
  }

  const maxColors =
    options.maxColors ??
    Math.min(256, Math.max(32, Math.ceil(Math.sqrt(pixelCount / 100))));

  return createAnimatedGif(imageFrames, { delay, loops, maxColors });
}

/**
 * Converts RGB color to hue value for color manipulations.
 *
 * Internal helper function that extracts the hue component from an RGB color
 * for use in color space conversions and animations.
 *
 * @param color - RGB color to convert
 * @returns Hue value in degrees (0-360)
 * @internal
 */
function rgbToHue(color: RGBColor): number {
  const r = color.red / 255;
  const g = color.green / 255;
  const b = color.blue / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  if (diff === 0) return 0;

  let hue: number;
  switch (max) {
    case r:
      hue = ((g - b) / diff) % 6;
      break;
    case g:
      hue = (b - r) / diff + 2;
      break;
    case b:
      hue = (r - g) / diff + 4;
      break;
    default:
      hue = 0;
  }

  return hue * 60;
}

/**
 * Converts hue value to RGB color.
 *
 * Internal helper function that converts a hue value to RGB color
 * with maximum saturation and lightness, used in color animations.
 *
 * @param h - Hue value in degrees (0-360)
 * @returns RGB color with full saturation
 * @internal
 */
function hslToRgb(h: number): RGBColor {
  // For saturation=1 and lightness=0.5: c=1, x=1-|((h/60)%2)-1|, m=0
  const h60 = h / 60;
  const x = 1 - Math.abs((h60 % 2) - 1);

  let r: number, g: number, b: number;

  if (h60 < 1) {
    r = 1;
    g = x;
    b = 0;
  } else if (h60 < 2) {
    r = x;
    g = 1;
    b = 0;
  } else if (h60 < 3) {
    r = 0;
    g = 1;
    b = x;
  } else if (h60 < 4) {
    r = 0;
    g = x;
    b = 1;
  } else if (h60 < 5) {
    r = x;
    g = 0;
    b = 1;
  } else {
    r = 1;
    g = 0;
    b = x;
  }

  return {
    red: (r * 255 + 0.5) | 0, // Fast rounding
    green: (g * 255 + 0.5) | 0,
    blue: (b * 255 + 0.5) | 0,
  };
}
