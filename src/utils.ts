/**
 * Utility Functions for GIF Processing
 *
 * This module provides essential utility functions for GIF creation, validation,
 * and data manipulation. These functions handle low-level operations like
 * validation, color operations, and binary data processing.
 */

import {
  ColorIntensity,
  RGBColor,
  ImageDimensions,
  GifValidationError,
} from './types.js';

/**
 * GIF file signature bytes - the magic number "GIF" that identifies GIF files.
 * Used for validating that binary data represents a valid GIF file.
 */
export const GIF_SIGNATURE = new Uint8Array([0x47, 0x49, 0x46]); // "GIF"

/**
 * GIF version 89a bytes - identifies GIF89a format which supports animation and transparency.
 * This is the most commonly used GIF version for modern applications.
 */
export const GIF_VERSION_89A = new Uint8Array([0x38, 0x39, 0x61]); // "89a"

/**
 * GIF trailer byte - marks the end of a GIF file.
 * Every valid GIF file must end with this byte.
 */
export const GIF_TRAILER = 0x3b;

/**
 * Maximum number of colors supported in a GIF palette.
 * GIF format limitation due to 8-bit color indexing.
 */
export const MAX_COLORS = 256;

/**
 * Maximum LZW code value for GIF compression.
 * This represents the highest code value (4095) used in LZW compression algorithm.
 */
export const MAX_CODE_VALUE = 0xfff; // 4095

/**
 * Netscape application identifier for animation extensions.
 * Used to identify Netscape-style animation controls in GIF files.
 */
export const NETSCAPE_APPLICATION_IDENTIFIER = new Uint8Array([
  0x4e,
  0x45,
  0x54,
  0x53,
  0x43,
  0x41,
  0x50,
  0x45, // "NETSCAPE"
]);

/**
 * Netscape application authentication code for animation extensions.
 * Specifies version "2.0" of the Netscape animation extension format.
 */
export const NETSCAPE_APPLICATION_AUTHENTICATION_CODE = new Uint8Array([
  0x32,
  0x2e,
  0x30, // "2.0"
]);

/**
 * Validates image dimensions for GIF creation.
 *
 * Ensures width and height are positive integers within GIF format limits.
 * GIF format supports dimensions up to 65535 pixels in each direction.
 *
 * @param dimensions - Object containing width and height
 * @param dimensions.width - Image width in pixels
 * @param dimensions.height - Image height in pixels
 * @throws {GifValidationError} When dimensions are invalid or out of range
 *
 * @example
 * ```typescript
 * // Valid dimensions
 * validateDimensions({ width: 800, height: 600 }); // OK
 *
 * // These will throw errors
 * validateDimensions({ width: -100, height: 200 }); // Negative width
 * validateDimensions({ width: 100.5, height: 200 }); // Non-integer
 * validateDimensions({ width: 70000, height: 200 }); // Too large
 * ```
 */
export function validateDimensions(dimensions: ImageDimensions): void {
  const { width, height } = dimensions;

  if (!Number.isInteger(width) || width <= 0 || width > 65535) {
    throw new GifValidationError(
      `Invalid width: ${width}. Must be positive integer ≤ 65535`
    );
  }

  if (!Number.isInteger(height) || height <= 0 || height > 65535) {
    throw new GifValidationError(
      `Invalid height: ${height}. Must be positive integer ≤ 65535`
    );
  }
}

/**
 * Validates a single color intensity value (0-255).
 *
 * Ensures a color component value is a valid integer within the RGB range.
 * Used for validating individual red, green, and blue color components.
 *
 * @param value - Color intensity value to validate
 * @param name - Name of the color component for error messages (default: 'color')
 * @throws {GifValidationError} When value is not an integer or outside 0-255 range
 *
 * @example
 * ```typescript
 * // Valid values
 * validateColorIntensity(255, 'red');   // OK
 * validateColorIntensity(0, 'green');   // OK
 * validateColorIntensity(128, 'blue');  // OK
 *
 * // These will throw errors
 * validateColorIntensity(-1, 'red');    // Below range
 * validateColorIntensity(256, 'green'); // Above range
 * validateColorIntensity(128.5, 'blue'); // Not integer
 * ```
 */
export function validateColorIntensity(value: number, name = 'color'): void {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new GifValidationError(
      `Invalid ${name}: ${value}. Must be integer 0-255`
    );
  }
}

/**
 * Validates an RGB color object.
 *
 * Ensures all color components (red, green, blue) are valid integers
 * within the 0-255 range. This is a comprehensive validation for complete RGB colors.
 *
 * @param color - RGB color object to validate
 * @param color.red - Red component (0-255)
 * @param color.green - Green component (0-255)
 * @param color.blue - Blue component (0-255)
 * @throws {GifValidationError} When any color component is invalid
 *
 * @example
 * ```typescript
 * // Valid colors
 * validateRGBColor({ red: 255, green: 128, blue: 0 }); // Orange
 * validateRGBColor({ red: 0, green: 0, blue: 0 });     // Black
 * validateRGBColor({ red: 255, green: 255, blue: 255 }); // White
 *
 * // These will throw errors
 * validateRGBColor({ red: -1, green: 128, blue: 255 }); // Invalid red
 * validateRGBColor({ red: 255, green: 256, blue: 0 });  // Invalid green
 * validateRGBColor({ red: 128.5, green: 0, blue: 255 }); // Non-integer red
 * ```
 */
export function validateRGBColor(color: RGBColor): void {
  validateColorIntensity(color.red, 'red');
  validateColorIntensity(color.green, 'green');
  validateColorIntensity(color.blue, 'blue');
}

/**
 * Validates GIF palette data format and constraints.
 *
 * Ensures palette data is properly formatted as RGB triplets and contains
 * a valid number of colors within GIF format limitations.
 *
 * @param palette - Palette data as RGB triplets (3 bytes per color)
 * @throws {GifValidationError} When palette format or size is invalid
 *
 * @example
 * ```typescript
 * // Valid palettes
 * const palette1 = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]); // RGB
 * validatePalette(palette1); // OK - 3 colors
 *
 * const palette2 = new Uint8Array([0, 0, 0]); // Single black color
 * validatePalette(palette2); // OK - 1 color
 *
 * // These will throw errors
 * const badPalette1 = new Uint8Array([255, 0]); // Incomplete RGB triplet
 * validatePalette(badPalette1); // Error: not divisible by 3
 *
 * const badPalette2 = new Uint8Array([]); // Empty
 * validatePalette(badPalette2); // Error: empty palette
 * ```
 */
export function validatePalette(palette: Uint8Array): void {
  if (palette.length === 0 || palette.length % 3 !== 0) {
    throw new GifValidationError(
      'Palette must contain RGB triplets (length divisible by 3)'
    );
  }

  const colorCount = palette.length / 3;
  if (colorCount > MAX_COLORS) {
    throw new GifValidationError(
      `Too many colors in palette: ${colorCount}. Maximum is ${MAX_COLORS}`
    );
  }
}

/**
 * Calculates the color table size field for GIF format.
 *
 * Determines the size field value needed to represent a given number of colors
 * in a GIF color table. The size field represents the power of 2 needed to
 * accommodate all colors (e.g., size 3 = 2^4 = 16 colors).
 *
 * @param colorCount - Number of colors in the palette (1-256)
 * @returns Size field value (0-7) for GIF color table
 * @throws {GifValidationError} When color count is invalid
 *
 * @example
 * ```typescript
 * // Calculate required size fields
 * calculateColorTableSize(1);   // Returns 0 (2^1 = 2 colors minimum)
 * calculateColorTableSize(4);   // Returns 1 (2^2 = 4 colors)
 * calculateColorTableSize(16);  // Returns 3 (2^4 = 16 colors)
 * calculateColorTableSize(128); // Returns 6 (2^7 = 128 colors)
 * calculateColorTableSize(256); // Returns 7 (2^8 = 256 colors)
 *
 * // Edge cases
 * calculateColorTableSize(0);   // Error: invalid count
 * calculateColorTableSize(300); // Error: exceeds maximum
 * ```
 */
export function calculateColorTableSize(colorCount: number): number {
  if (colorCount <= 0 || colorCount > MAX_COLORS) {
    throw new GifValidationError(`Invalid color count: ${colorCount}`);
  }

  // Find the next power of 2
  let size = 0;
  let pow2 = 2;

  while (pow2 < colorCount) {
    size++;
    pow2 <<= 1;
  }

  return size;
}

/**
 * Pads a color table to the required size for GIF format.
 *
 * Extends a palette to match the required power-of-2 size by filling
 * remaining slots with black (0,0,0) colors. This ensures the palette
 * meets GIF format requirements.
 *
 * @param palette - Original palette data as RGB triplets
 * @param requiredSize - Required size field (determines final palette size)
 * @returns Padded palette with power-of-2 number of colors
 *
 * @example
 * ```typescript
 * // Original palette with 3 colors (9 bytes)
 * const original = new Uint8Array([
 *   255, 0, 0,    // Red
 *   0, 255, 0,    // Green
 * Pads color table to the required size
 */
export function padColorTable(
  palette: Uint8Array,
  requiredSize: number
): Uint8Array {
  const currentColors = palette.length / 3;
  const targetColors = 1 << (requiredSize + 1);

  if (currentColors >= targetColors) {
    return palette;
  }

  const padded = new Uint8Array(targetColors * 3);
  padded.set(palette);

  // Fill remaining with black (0, 0, 0)
  // The Uint8Array is already initialized with zeros

  return padded;
}

/**
 * Writes a 16-bit integer in little-endian format.
 *
 * Converts a 16-bit integer to a 2-byte Uint8Array in little-endian order
 * (least significant byte first). This is the byte order used in GIF files.
 *
 * @param value - Integer value to encode (0-65535)
 * @returns 2-byte array in little-endian format
 * @throws {GifValidationError} When value is out of 16-bit range
 *
 * @example
 * ```typescript
 * // Convert various values
 * write16BitLE(0);     // Returns [0, 0]
 * write16BitLE(255);   // Returns [255, 0]
 * write16BitLE(256);   // Returns [0, 1]
 * write16BitLE(65535); // Returns [255, 255]
 *
 * // Use in GIF writing
 * const width = 320;
 * const height = 240;
 * const widthBytes = write16BitLE(width);   // [64, 1]
 * const heightBytes = write16BitLE(height); // [240, 0]
 *
 * // Error cases
 * write16BitLE(-1);    // Error: negative value
 * write16BitLE(70000); // Error: exceeds 16-bit range
 * ```
 */
export function write16BitLE(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new GifValidationError(`Invalid 16-bit value: ${value}`);
  }

  return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
}

/**
 * Clamps a numeric value between minimum and maximum bounds.
 *
 * Ensures a value stays within specified limits by constraining it to
 * the given range. Values below minimum return minimum, values above
 * maximum return maximum.
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Value constrained to [min, max] range
 *
 * @example
 * ```typescript
 * // Basic clamping
 * clamp(5, 0, 10);   // Returns 5 (within range)
 * clamp(-5, 0, 10);  // Returns 0 (below minimum)
 * clamp(15, 0, 10);  // Returns 10 (above maximum)
 *
 * // Color component clamping
 * clamp(300, 0, 255); // Returns 255 (valid color)
 * clamp(-50, 0, 255); // Returns 0 (valid color)
 *
 * // Percentage clamping
 * clamp(1.5, 0, 1);   // Returns 1.0 (valid percentage)
 * clamp(-0.2, 0, 1);  // Returns 0.0 (valid percentage)
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts milliseconds to GIF delay units.
 *
 * Transforms time in milliseconds to GIF delay format, which uses
 * centiseconds (1/100th of a second). Minimum delay is 0.
 *
 * @param ms - Time in milliseconds
 * @returns Delay in GIF units (centiseconds)
 *
 * @example
 * ```typescript
 * // Common frame rates
 * msToGifDelay(100);  // Returns 10 (100ms = 10 centiseconds)
 * msToGifDelay(50);   // Returns 5 (50ms = 5 centiseconds)
 * msToGifDelay(1000); // Returns 100 (1000ms = 1 second = 100 centiseconds)
 *
 * // Animation examples
 * const fastAnimation = msToGifDelay(33);  // ~30 FPS
 * const slowAnimation = msToGifDelay(500); // 2 FPS
 * const veryFast = msToGifDelay(16);       // ~60 FPS
 *
 * // Edge cases
 * msToGifDelay(0);    // Returns 0 (no delay)
 * msToGifDelay(-100); // Returns 0 (negative clamped to 0)
 * ```
 */
export function msToGifDelay(ms: number): number {
  return Math.max(0, Math.round(ms / 10));
}

/**
 * Converts GIF delay units to milliseconds.
 *
 * Transforms GIF delay format (centiseconds) back to milliseconds.
 * This is the inverse operation of msToGifDelay().
 *
 * @param delay - Delay in GIF units (centiseconds)
 * @returns Time in milliseconds
 *
 * @example
 * ```typescript
 * // Convert GIF delays back to milliseconds
 * gifDelayToMs(10);  // Returns 100 (10 centiseconds = 100ms)
 * gifDelayToMs(5);   // Returns 50 (5 centiseconds = 50ms)
 * gifDelayToMs(100); // Returns 1000 (100 centiseconds = 1 second)
 *
 * // Round-trip conversion
 * const originalMs = 250;
 * const gifDelay = msToGifDelay(originalMs);     // 25
 * const convertedBack = gifDelayToMs(gifDelay);  // 250
 *
 * // Use for timing calculations
 * const frameDelay = 8; // From GIF file
 * const frameRate = 1000 / gifDelayToMs(frameDelay); // Calculate FPS
 * ```
 */
export function gifDelayToMs(delay: number): number {
  return delay * 10;
}

/**
 * Creates a validated RGB color object.
 *
 * Constructs an RGB color object with automatic validation of all components.
 * This is a convenience function that combines color creation with validation.
 *
 * @param red - Red component (0-255)
 * @param green - Green component (0-255)
 * @param blue - Blue component (0-255)
 * @returns Validated RGB color object
 * @throws {GifValidationError} When any color component is invalid
 *
 * @example
 * ```typescript
 * // Create valid colors
 * const red = createColor(255, 0, 0);
 * const green = createColor(0, 255, 0);
 * const blue = createColor(0, 0, 255);
 * const white = createColor(255, 255, 255);
 * const black = createColor(0, 0, 0);
 *
 * // Create custom colors
 * const orange = createColor(255, 165, 0);
 * const purple = createColor(128, 0, 128);
 * const gray = createColor(128, 128, 128);
 *
 * // These will throw validation errors
 * createColor(-1, 128, 255);   // Invalid red
 * createColor(255, 256, 0);    // Invalid green
 * createColor(128.5, 0, 255);  // Non-integer red
 * ```
 */
export function createColor(
  red: ColorIntensity,
  green: ColorIntensity,
  blue: ColorIntensity
): RGBColor {
  const color = { red, green, blue };
  validateRGBColor(color);
  return color;
}

/**
 * Calculates squared Euclidean distance between two RGB colors.
 *
 * Computes the squared distance in RGB color space without taking the square root,
 * which is sufficient for color comparison and is more computationally efficient.
 * Used in color quantization and nearest-color algorithms.
 *
 * @param a - First RGB color
 * @param b - Second RGB color
 * @returns Squared distance between colors (0-195075)
 *
 * @example
 * ```typescript
 * const red = { red: 255, green: 0, blue: 0 };
 * const blue = { red: 0, green: 0, blue: 255 };
 * const darkRed = { red: 128, green: 0, blue: 0 };
 *
 * // Calculate color distances
 * const redBlueDistance = colorDistanceSquared(red, blue);     // 130050
 * const redDarkRedDistance = colorDistanceSquared(red, darkRed); // 16129
 *
 * // Find closest color
 * const targetColor = { red: 200, green: 50, blue: 100 };
 * const colors = [red, blue, darkRed];
 *
 * let closestColor = colors[0];
 * let minDistance = colorDistanceSquared(targetColor, colors[0]);
 *
 * for (const color of colors) {
 *   const distance = colorDistanceSquared(targetColor, color);
 *   if (distance < minDistance) {
 *     minDistance = distance;
 *     closestColor = color;
 *   }
 * }
 * ```
 */
export function colorDistanceSquared(a: RGBColor, b: RGBColor): number {
  const dr = a.red - b.red;
  const dg = a.green - b.green;
  const db = a.blue - b.blue;
  return dr * dr + dg * dg + db * db;
}

/**
 * Finds the index of the closest color in a palette.
 *
 * Searches through a palette of RGB colors to find the one with minimum
 * Euclidean distance to the target color. Uses squared distance for efficiency.
 *
 * @param target - Target RGB color to match
 * @param palette - Array of RGB colors to search
 * @returns Index of the closest color in the palette
 * @throws {GifValidationError} When palette is empty
 *
 * @example
 * ```typescript
 * const palette = [
 *   { red: 255, green: 0, blue: 0 },     // Index 0: Red
 *   { red: 0, green: 255, blue: 0 },     // Index 1: Green
 *   { red: 0, green: 0, blue: 255 },     // Index 2: Blue
 *   { red: 255, green: 255, blue: 0 }    // Index 3: Yellow
 * ];
 *
 * // Find closest matches
 * const orange = { red: 255, green: 128, blue: 0 };
 * const closestToOrange = findClosestColorIndex(orange, palette); // 0 (red)
 *
 * const lightBlue = { red: 100, green: 100, blue: 200 };
 * const closestToLightBlue = findClosestColorIndex(lightBlue, palette); // 2 (blue)
 *
 * // Use for color quantization
 * const targetColor = { red: 200, green: 200, blue: 50 };
 * const paletteIndex = findClosestColorIndex(targetColor, palette);
 * const quantizedColor = palette[paletteIndex];
 * ```
 */
export function findClosestColorIndex(
  target: RGBColor,
  palette: RGBColor[]
): number {
  if (palette.length === 0) {
    throw new GifValidationError('Palette cannot be empty');
  }

  let bestIndex = 0;
  let bestDistance = colorDistanceSquared(target, palette[0]);

  for (let i = 1; i < palette.length; i++) {
    const distance = colorDistanceSquared(target, palette[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;

      // Perfect match found
      if (distance === 0) {
        break;
      }
    }
  }

  return bestIndex;
}

/**
 * Converts raw palette data to an array of RGB color objects.
 *
 * Transforms a Uint8Array containing RGB triplets into an array of structured
 * RGB color objects. This makes palette data easier to work with programmatically.
 *
 * @param palette - Raw palette data as RGB triplets (3 bytes per color)
 * @returns Array of RGB color objects
 * @throws {GifValidationError} When palette length is not divisible by 3
 *
 * @example
 * ```typescript
 * // Convert raw palette data
 * const rawPalette = new Uint8Array([
 *   255, 0, 0,     // Red
 *   0, 255, 0,     // Green
 *   0, 0, 255,     // Blue
 *   255, 255, 0    // Yellow
 * ]);
 *
 * const colors = paletteToColors(rawPalette);
 * // Result: [
 * //   { red: 255, green: 0, blue: 0 },
 * //   { red: 0, green: 255, blue: 0 },
 * //   { red: 0, green: 0, blue: 255 },
 * //   { red: 255, green: 255, blue: 0 }
 * // ]
 *
 * // Use converted colors
 * for (const color of colors) {
 *   console.log(`RGB(${color.red}, ${color.green}, ${color.blue})`);
 * }
 * ```
 */
export function paletteToColors(palette: Uint8Array): RGBColor[] {
  validatePalette(palette);

  const colors: RGBColor[] = [];
  for (let i = 0; i < palette.length; i += 3) {
    colors.push({
      red: palette[i],
      green: palette[i + 1],
      blue: palette[i + 2],
    });
  }

  return colors;
}

/**
 * Converts an array of RGB color objects to raw palette data.
 *
 * Transforms structured RGB color objects into a flat Uint8Array of RGB triplets
 * suitable for use in GIF files. This is the inverse of paletteToColors().
 *
 * @param colors - Array of RGB color objects
 * @returns Raw palette data as RGB triplets
 *
 * @example
 * ```typescript
 * // Convert color objects to raw palette
 * const colors = [
 *   { red: 255, green: 0, blue: 0 },     // Red
 *   { red: 0, green: 255, blue: 0 },     // Green
 *   { red: 0, green: 0, blue: 255 },     // Blue
 *   { red: 255, green: 255, blue: 0 }    // Yellow
 * ];
 *
 * const rawPalette = colorsToPalette(colors);
 * // Result: Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0])
 *
 * // Round-trip conversion
 * const originalRaw = new Uint8Array([128, 64, 192, 255, 128, 0]);
 * const converted = paletteToColors(originalRaw);
 * const backToRaw = colorsToPalette(converted);
 * // backToRaw should equal originalRaw
 *
 * // Use in GIF creation
 * const customPalette = colorsToPalette([
 *   { red: 34, green: 139, blue: 34 },   // Forest green
 *   { red: 255, green: 215, blue: 0 },   // Gold
 *   { red: 220, green: 20, blue: 60 }    // Crimson
 * ]);
 * ```
 */
export function colorsToPalette(colors: RGBColor[]): Uint8Array {
  const palette = new Uint8Array(colors.length * 3);

  for (let i = 0; i < colors.length; i++) {
    validateRGBColor(colors[i]);
    const offset = i * 3;
    palette[offset] = colors[i].red;
    palette[offset + 1] = colors[i].green;
    palette[offset + 2] = colors[i].blue;
  }

  return palette;
}
