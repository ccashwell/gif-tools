/**
 * Color quantization using the median cut algorithm
 *
 * This module provides functions to reduce the number of colors in an image
 * to fit within GIF's 256 color palette limitation.
 */

import {
  RGBColor,
  ImageData,
  IndexedImage,
  GifValidationError,
} from './types.js';
import { findClosestColorIndex } from './utils.js';

/**
 * A cube represents a region in RGB color space
 */
interface ColorCube {
  readonly colors: RGBColor[];
}

/**
 * Statistics for a color cube
 */
interface ColorCubeStats {
  readonly minRed: number;
  readonly maxRed: number;
  readonly minGreen: number;
  readonly maxGreen: number;
  readonly minBlue: number;
  readonly maxBlue: number;
  readonly size: number;
}

/**
 * Color component names for sorting
 */
type ColorComponent = 'red' | 'green' | 'blue';

/**
 * Calculates statistics for a color cube
 */
function analyzeColorCube(colors: RGBColor[]): ColorCubeStats {
  if (colors.length === 0) {
    throw new GifValidationError('Cannot analyze empty color cube');
  }

  let minRed = 255,
    maxRed = 0;
  let minGreen = 255,
    maxGreen = 0;
  let minBlue = 255,
    maxBlue = 0;

  for (const color of colors) {
    minRed = Math.min(minRed, color.red);
    maxRed = Math.max(maxRed, color.red);
    minGreen = Math.min(minGreen, color.green);
    maxGreen = Math.max(maxGreen, color.green);
    minBlue = Math.min(minBlue, color.blue);
    maxBlue = Math.max(maxBlue, color.blue);
  }

  return {
    minRed,
    maxRed,
    minGreen,
    maxGreen,
    minBlue,
    maxBlue,
    size: colors.length,
  };
}

/**
 * Finds the component with the largest range in a color cube
 */
function findLargestComponent(stats: ColorCubeStats): ColorComponent {
  // Weight the components to give more importance to red and green
  const redRange = (stats.maxRed - stats.minRed) * 1.0;
  const greenRange = (stats.maxGreen - stats.minGreen) * 0.8;
  const blueRange = (stats.maxBlue - stats.minBlue) * 0.5;

  if (greenRange >= blueRange) {
    return redRange >= greenRange ? 'red' : 'green';
  } else {
    return redRange >= blueRange ? 'red' : 'blue';
  }
}

/**
 * Finds the median value for a specific color component
 */
function findMedian(colors: RGBColor[], component: ColorComponent): number {
  const values = colors.map(color => color[component]);
  return selectKthElement(values, Math.floor(values.length / 2));
}

/**
 * Splits a color cube along the median of its largest component
 */
function splitColorCube(colors: RGBColor[]): RGBColor[][] {
  if (colors.length <= 1) {
    return [colors];
  }

  const stats = analyzeColorCube(colors);
  const component = findLargestComponent(stats);
  const median = findMedian(colors, component);

  const lowerHalf: RGBColor[] = [];
  const upperHalf: RGBColor[] = [];

  for (const color of colors) {
    if (color[component] < median) {
      lowerHalf.push(color);
    } else {
      upperHalf.push(color);
    }
  }

  // If split didn't work (all colors have same value), return original
  if (lowerHalf.length === 0 || upperHalf.length === 0) {
    return [colors];
  }

  return [lowerHalf, upperHalf];
}

/**
 * Calculates the average color of a group of colors
 */
function calculateAverageColor(colors: RGBColor[]): RGBColor {
  if (colors.length === 0) {
    throw new GifValidationError(
      'Cannot calculate average of empty color array'
    );
  }

  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;

  for (const color of colors) {
    totalRed += color.red;
    totalGreen += color.green;
    totalBlue += color.blue;
  }

  const count = colors.length;
  return {
    red: Math.floor(totalRed / count),
    green: Math.floor(totalGreen / count),
    blue: Math.floor(totalBlue / count),
  };
}

/**
 * Finds the largest color cube by number of colors
 */
function findLargestCube(cubes: ColorCube[]): ColorCube {
  if (cubes.length === 0) {
    throw new GifValidationError('Cannot find largest cube in empty array');
  }

  let largest = cubes[0];
  let maxSize = largest.colors.length;

  for (let i = 1; i < cubes.length; i++) {
    const size = cubes[i].colors.length;
    if (size > maxSize) {
      largest = cubes[i];
      maxSize = size;
    }
  }

  return largest;
}

/**
 * Performs median cut algorithm to reduce colors
 */
function medianCut(colors: RGBColor[], maxColors: number): ColorCube[] {
  if (maxColors <= 0) {
    throw new GifValidationError(
      `Invalid max colors: ${maxColors}. Must be positive`
    );
  }

  if (colors.length <= maxColors) {
    // No need to reduce colors
    return colors.map(color => ({ colors: [color] }));
  }

  const cubes: ColorCube[] = [{ colors: [...colors] }];

  while (cubes.length < maxColors) {
    const largest = findLargestCube(cubes);

    // If largest cube has only one color, we can't split further
    if (largest.colors.length <= 1) {
      break;
    }

    const splits = splitColorCube(largest.colors);

    // If split didn't work, we can't continue
    if (splits.length === 1) {
      break;
    }

    // Remove the original cube and add the splits
    const index = cubes.indexOf(largest);
    cubes.splice(index, 1);
    cubes.push(...splits.map(colors => ({ colors })));
  }

  return cubes;
}

/**
 * Extracts unique colors from image data
 */
function extractColors(imageData: ImageData): RGBColor[] {
  const { width, height, data } = imageData;
  const colorMap = new Map<string, RGBColor>();

  const pixelCount = width * height;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    // Alpha channel is ignored for GIF

    const key = `${red},${green},${blue}`;
    if (!colorMap.has(key)) {
      colorMap.set(key, { red, green, blue });
    }
  }

  return Array.from(colorMap.values());
}

/**
 * Color quantizer using median cut algorithm
 */
export class MedianCutQuantizer {
  private palette: RGBColor[] = [];
  private colorMap = new Map<string, number>();

  constructor(private readonly maxColors: number = 256) {
    if (maxColors <= 0 || maxColors > 256) {
      throw new GifValidationError(
        `Invalid max colors: ${maxColors}. Must be 1-256`
      );
    }
  }

  /**
   * Quantizes an image to the specified number of colors
   */
  quantize(imageData: ImageData): IndexedImage {
    // Extract unique colors from the image
    const uniqueColors = extractColors(imageData);

    // Perform median cut to reduce colors
    const cubes = medianCut(uniqueColors, this.maxColors);

    // Generate palette from cube averages
    this.palette = cubes.map(cube => calculateAverageColor(cube.colors));

    // Build color mapping for quick lookup
    this.buildColorMap(cubes);

    // Convert image data to indexed format
    const indexedData = this.convertToIndexed(imageData);
    const paletteData = this.getPaletteData();

    return {
      width: imageData.width,
      height: imageData.height,
      data: indexedData,
      palette: paletteData,
    };
  }

  /**
   * Gets the current palette as RGB colors
   */
  getPalette(): RGBColor[] {
    return [...this.palette];
  }

  /**
   * Gets the current palette as Uint8Array (RGB triplets)
   */
  getPaletteData(): Uint8Array {
    const data = new Uint8Array(this.palette.length * 3);

    for (let i = 0; i < this.palette.length; i++) {
      const offset = i * 3;
      const color = this.palette[i];
      data[offset] = color.red;
      data[offset + 1] = color.green;
      data[offset + 2] = color.blue;
    }

    return data;
  }

  /**
   * Maps a color to its closest palette index
   */
  mapColor(color: RGBColor): number {
    const key = `${color.red},${color.green},${color.blue}`;

    let index = this.colorMap.get(key);
    if (index !== undefined) {
      return index;
    }

    // Find closest color if not in map
    index = findClosestColorIndex(color, this.palette);
    this.colorMap.set(key, index);
    return index;
  }

  /**
   * Builds the color mapping from cubes
   */
  private buildColorMap(cubes: ColorCube[]): void {
    this.colorMap.clear();

    cubes.forEach((cube, paletteIndex) => {
      cube.colors.forEach(color => {
        const key = `${color.red},${color.green},${color.blue}`;
        this.colorMap.set(key, paletteIndex);
      });
    });
  }

  /**
   * Converts image data to indexed format
   */
  private convertToIndexed(imageData: ImageData): Uint8Array {
    const { width, height, data } = imageData;
    const indexed = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const offset = i * 4;
      const color: RGBColor = {
        red: data[offset],
        green: data[offset + 1],
        blue: data[offset + 2],
      };

      indexed[i] = this.mapColor(color);
    }

    return indexed;
  }
}

/**
 * Selection algorithm to find the k-th smallest element
 * Based on Quickselect algorithm
 */
function selectKthElement(array: number[], k: number): number {
  if (k < 0 || k >= array.length) {
    throw new GifValidationError(
      `Invalid k value: ${k} for array length ${array.length}`
    );
  }

  const arr = [...array]; // Copy to avoid mutating original
  return quickSelect(arr, 0, arr.length - 1, k);
}

/**
 * Quickselect implementation
 */
function quickSelect(
  arr: number[],
  left: number,
  right: number,
  k: number
): number {
  while (left < right) {
    const pivotIndex = partition(arr, left, right);

    if (pivotIndex === k) {
      return arr[k];
    } else if (pivotIndex < k) {
      left = pivotIndex + 1;
    } else {
      right = pivotIndex - 1;
    }
  }

  return arr[k];
}

/**
 * Partitioning function for quickselect
 */
function partition(arr: number[], left: number, right: number): number {
  const pivot = arr[right];
  let i = left;

  for (let j = left; j < right; j++) {
    if (arr[j] <= pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }

  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}

/**
 * Convenience function to quantize an image
 */
export function quantizeImage(
  imageData: ImageData,
  maxColors = 256
): IndexedImage {
  const quantizer = new MedianCutQuantizer(maxColors);
  return quantizer.quantize(imageData);
}
