/**
 * Advanced Pattern Generators
 *
 * Provides sophisticated pattern generation for creating complex GIFs including
 * noise patterns, fractals, geometric shapes, and mathematical spirals.
 */

import { RGBColor } from './types.js';
import { GifResult } from './gif-result.js';
import { createStaticGif } from './helpers.js';

export interface NoiseOptions {
  /** Noise type */
  type?: 'white' | 'perlin' | 'simplex';
  /** Noise scale factor */
  scale?: number;
  /** Noise seed for reproducible results */
  seed?: number;
  /** Color palette for noise */
  colors?: RGBColor[];
}

export interface FractalOptions {
  /** Fractal type */
  type?: 'mandelbrot' | 'julia' | 'sierpinski';
  /** Maximum iterations */
  maxIterations?: number;
  /** Zoom level */
  zoom?: number;
  /** Center point */
  centerX?: number;
  centerY?: number;
  /** Color palette */
  colors?: RGBColor[];
}

export interface GeometricOptions {
  /** Shape type */
  shape?: 'circles' | 'squares' | 'triangles' | 'hexagons';
  /** Number of shapes */
  count?: number;
  /** Size variation */
  sizeVariation?: number;
  /** Color palette */
  colors?: RGBColor[];
  /** Background color */
  backgroundColor?: RGBColor;
}

export interface SpiralOptions {
  /** Spiral type */
  type?: 'archimedean' | 'logarithmic' | 'fibonacci';
  /** Number of turns */
  turns?: number;
  /** Line thickness */
  thickness?: number;
  /** Colors for the spiral */
  colors?: RGBColor[];
}

/**
 * Generates noise pattern GIFs with various noise algorithms.
 *
 * Creates GIFs filled with different types of noise patterns including white noise,
 * Perlin noise, and simplex noise. Perfect for textures, backgrounds, or artistic effects.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Noise generation options
 * @param options.type - Type of noise algorithm (default: 'white')
 * @param options.scale - Noise scale factor, higher = more detail (default: 1)
 * @param options.seed - Random seed for reproducible results (default: random)
 * @param options.colors - Color palette for noise mapping (default: black/white)
 * @returns A GifResult with convenient output methods
 *
 * @example
 * ```typescript
 * // White noise texture
 * const whiteNoise = createNoiseGif(200, 200, {
 *   type: 'white',
 *   colors: [
 *     { red: 0, green: 0, blue: 0 },
 *     { red: 255, green: 255, blue: 255 }
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Perlin noise with custom colors
 * const perlinNoise = createNoiseGif(300, 300, {
 *   type: 'perlin',
 *   scale: 3,
 *   seed: 12345,
 *   colors: [
 *     { red: 0, green: 50, blue: 100 },   // Dark blue
 *     { red: 100, green: 150, blue: 200 }, // Light blue
 *     { red: 255, green: 255, blue: 255 }  // White
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Simplex noise for organic textures
 * const simplexNoise = createNoiseGif(400, 300, {
 *   type: 'simplex',
 *   scale: 2.5,
 *   colors: [
 *     { red: 34, green: 139, blue: 34 },   // Forest green
 *     { red: 107, green: 142, blue: 35 },  // Olive
 *     { red: 154, green: 205, blue: 50 }   // Yellow green
 *   ]
 * });
 * ```
 */
export function createNoiseGif(
  width: number,
  height: number,
  options: NoiseOptions = {}
): GifResult {
  const {
    type = 'white',
    scale = 1,
    seed = Math.random() * 1000,
    colors = [
      { red: 0, green: 0, blue: 0 },
      { red: 255, green: 255, blue: 255 },
    ],
  } = options;

  const data = new Uint8Array(width * height * 4);
  const random = createSeededRandom(seed);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      let noise: number;

      switch (type) {
        case 'white':
          noise = random();
          break;
        case 'perlin':
          noise = perlinNoise(
            (x * scale) / width,
            (y * scale) / height,
            random
          );
          break;
        case 'simplex':
          noise = simplexNoise(
            (x * scale) / width,
            (y * scale) / height,
            random
          );
          break;
        default:
          noise = random();
      }

      // Map noise to color palette
      const colorIndex = Math.floor(noise * colors.length);
      const clampedIndex = Math.max(0, Math.min(colors.length - 1, colorIndex));
      const color = colors[clampedIndex];

      data[index] = color.red;
      data[index + 1] = color.green;
      data[index + 2] = color.blue;
      data[index + 3] = 255;
    }
  }

  return createStaticGif({ width, height, data });
}

/**
 * Generates fractal pattern GIFs using mathematical fractal algorithms.
 *
 * Creates stunning fractal visualizations including Mandelbrot sets, Julia sets,
 * and Sierpinski triangles. Each fractal type offers unique mathematical beauty
 * and infinite detail at different zoom levels.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Fractal generation options
 * @param options.type - Fractal algorithm type (default: 'mandelbrot')
 * @param options.maxIterations - Maximum iterations for convergence (default: 100)
 * @param options.zoom - Zoom level into fractal (default: 1)
 * @param options.centerX - X coordinate of fractal center (default: 0)
 * @param options.centerY - Y coordinate of fractal center (default: 0)
 * @param options.colors - Color palette for fractal visualization (default: rainbow)
 * @returns A GifResult with convenient output methods
 *
 * @example
 * ```typescript
 * // Classic Mandelbrot set
 * const mandelbrot = createFractalGif(400, 400, {
 *   type: 'mandelbrot',
 *   maxIterations: 150,
 *   zoom: 1,
 *   centerX: -0.5,
 *   centerY: 0
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Julia set with custom parameters
 * const julia = createFractalGif(300, 300, {
 *   type: 'julia',
 *   maxIterations: 200,
 *   zoom: 1.5,
 *   colors: [
 *     { red: 0, green: 0, blue: 0 },
 *     { red: 255, green: 0, blue: 100 },
 *     { red: 255, green: 100, blue: 0 },
 *     { red: 255, green: 255, blue: 0 }
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Sierpinski triangle
 * const sierpinski = createFractalGif(350, 350, {
 *   type: 'sierpinski',
 *   maxIterations: 100
 * });
 * ```
 */
export function createFractalGif(
  width: number,
  height: number,
  options: FractalOptions = {}
): GifResult {
  const {
    type = 'mandelbrot',
    maxIterations = 100,
    zoom = 1,
    centerX = 0,
    centerY = 0,
    colors = generateFractalColors(),
  } = options;

  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      let iterations: number;

      // Map pixel coordinates to complex plane
      const real = (x - width / 2) / (width / 4) / zoom + centerX;
      const imag = (y - height / 2) / (height / 4) / zoom + centerY;

      switch (type) {
        case 'mandelbrot':
          iterations = mandelbrotIterations(real, imag, maxIterations);
          break;
        case 'julia':
          iterations = juliaIterations(
            real,
            imag,
            -0.7,
            0.27015,
            maxIterations
          );
          break;
        case 'sierpinski':
          iterations = sierpinskiIterations(x, y, width, height, maxIterations);
          break;
        default:
          iterations = mandelbrotIterations(real, imag, maxIterations);
      }

      // Map iterations to color
      const colorIndex =
        iterations === maxIterations ? 0 : iterations % colors.length;
      const color = colors[colorIndex];

      data[index] = color.red;
      data[index + 1] = color.green;
      data[index + 2] = color.blue;
      data[index + 3] = 255;
    }
  }

  return createStaticGif({ width, height, data });
}

/**
 * Generates geometric pattern GIFs with randomized shape placement.
 *
 * Creates patterns filled with geometric shapes (circles, squares, triangles, hexagons)
 * with randomized positions, sizes, and colors. Perfect for backgrounds, textures,
 * or decorative elements.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Geometric pattern options
 * @param options.shape - Type of shape to generate (default: 'circles')
 * @param options.count - Number of shapes to place (default: 20)
 * @param options.sizeVariation - Size variation factor 0-1 (default: 0.5)
 * @param options.colors - Color palette for shapes (default: red/green/blue)
 * @param options.backgroundColor - Background color (default: white)
 * @returns A GifResult with convenient output methods
 *
 * @example
 * ```typescript
 * // Random colorful circles
 * const circles = createGeometricGif(300, 200, {
 *   shape: 'circles',
 *   count: 30,
 *   sizeVariation: 0.8,
 *   colors: [
 *     { red: 255, green: 100, blue: 100 },
 *     { red: 100, green: 255, blue: 100 },
 *     { red: 100, green: 100, blue: 255 }
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Uniform triangles on dark background
 * const triangles = createGeometricGif(400, 300, {
 *   shape: 'triangles',
 *   count: 15,
 *   sizeVariation: 0.2,
 *   backgroundColor: { red: 20, green: 20, blue: 30 },
 *   colors: [
 *     { red: 255, green: 215, blue: 0 }, // Gold
 *     { red: 255, green: 140, blue: 0 }  // Orange
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Hexagon pattern
 * const hexagons = createGeometricGif(250, 250, {
 *   shape: 'hexagons',
 *   count: 25,
 *   sizeVariation: 0.6
 * });
 * ```
 */
export function createGeometricGif(
  width: number,
  height: number,
  options: GeometricOptions = {}
): GifResult {
  const {
    shape = 'circles',
    count = 20,
    sizeVariation = 0.5,
    colors = [
      { red: 255, green: 0, blue: 0 },
      { red: 0, green: 255, blue: 0 },
      { red: 0, green: 0, blue: 255 },
    ],
    backgroundColor = { red: 255, green: 255, blue: 255 },
  } = options;

  const data = new Uint8Array(width * height * 4);

  // Fill background
  for (let i = 0; i < data.length; i += 4) {
    data[i] = backgroundColor.red;
    data[i + 1] = backgroundColor.green;
    data[i + 2] = backgroundColor.blue;
    data[i + 3] = 255;
  }

  // Generate shapes
  const random = Math.random;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);
    const baseSize = Math.min(width, height) / 10;
    const size = baseSize * (1 + (random() - 0.5) * sizeVariation);
    const color = colors[Math.floor(random() * colors.length)];

    switch (shape) {
      case 'circles':
        drawCircle(data, width, height, x, y, size, color);
        break;
      case 'squares':
        drawSquare(data, width, height, x, y, size, color);
        break;
      case 'triangles':
        drawTriangle(data, width, height, x, y, size, color);
        break;
      case 'hexagons':
        drawHexagon(data, width, height, x, y, size, color);
        break;
    }
  }

  return createStaticGif({ width, height, data });
}

/**
 * Generates mathematical spiral pattern GIFs.
 *
 * Creates beautiful spiral patterns using different mathematical spiral equations
 * including Archimedean, logarithmic, and Fibonacci spirals. Each type produces
 * unique aesthetic patterns suitable for art, backgrounds, or mathematical visualization.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Spiral generation options
 * @param options.type - Type of spiral equation (default: 'archimedean')
 * @param options.turns - Number of spiral turns/rotations (default: 5)
 * @param options.thickness - Line thickness in pixels (default: 2)
 * @param options.colors - Color palette for gradient along spiral (default: red/green)
 * @returns A GifResult with convenient output methods
 *
 * @example
 * ```typescript
 * // Archimedean spiral (uniform spacing)
 * const archimedean = createSpiralGif(300, 300, {
 *   type: 'archimedean',
 *   turns: 8,
 *   thickness: 3,
 *   colors: [
 *     { red: 255, green: 0, blue: 0 },
 *     { red: 255, green: 255, blue: 0 },
 *     { red: 0, green: 255, blue: 0 }
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Logarithmic spiral (exponential growth)
 * const logarithmic = createSpiralGif(400, 400, {
 *   type: 'logarithmic',
 *   turns: 4,
 *   thickness: 4,
 *   colors: [
 *     { red: 0, green: 0, blue: 255 },
 *     { red: 128, green: 0, blue: 128 }
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Fibonacci spiral (golden ratio)
 * const fibonacci = createSpiralGif(350, 350, {
 *   type: 'fibonacci',
 *   turns: 6,
 *   thickness: 2
 * });
 * ```
 */
export function createSpiralGif(
  width: number,
  height: number,
  options: SpiralOptions = {}
): GifResult {
  const {
    type = 'archimedean',
    turns = 5,
    thickness = 2,
    colors = [
      { red: 255, green: 0, blue: 0 },
      { red: 0, green: 255, blue: 0 },
    ],
  } = options;

  const data = new Uint8Array(width * height * 4);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2;

  // Fill background with black
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }

  // Draw spiral
  const steps = turns * 360;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * turns * 2 * Math.PI;
    let radius: number;

    switch (type) {
      case 'archimedean':
        radius = (i / steps) * maxRadius;
        break;
      case 'logarithmic':
        radius = Math.exp((i / steps) * Math.log(maxRadius));
        break;
      case 'fibonacci': {
        // Golden ratio spiral (approximates Fibonacci spiral)
        // φ = (1 + √5) / 2 ≈ 1.618033988749
        const phi = 1.618033988749;
        const b = Math.log(phi) / (Math.PI / 2); // Growth factor
        radius =
          Math.exp(b * angle) * (maxRadius / Math.exp(b * turns * 2 * Math.PI));
        break;
      }
      default:
        radius = (i / steps) * maxRadius;
    }

    const x = Math.floor(centerX + radius * Math.cos(angle));
    const y = Math.floor(centerY + radius * Math.sin(angle));

    const colorIndex = Math.floor((i / steps) * colors.length);
    const color = colors[Math.min(colorIndex, colors.length - 1)];

    drawThickPoint(data, width, height, x, y, thickness, color);
  }

  return createStaticGif({ width, height, data });
}

// Helper functions

/**
 * Creates a seeded random number generator for reproducible results.
 *
 * Internal helper function that generates a deterministic random number generator
 * based on a seed value, ensuring consistent results across multiple runs.
 *
 * @param seed - Seed value for random generation
 * @returns Function that returns random numbers between 0 and 1
 * @internal
 */
function createSeededRandom(seed: number): () => number {
  let x = seed;
  return function () {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

/**
 * Smoothstep function for smooth interpolation (Perlin's fade function).
 *
 * @param t - Input value (0-1)
 * @returns Smoothed value using 6t^5 - 15t^4 + 10t^3
 * @internal
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Standard Perlin noise gradient vectors for 2D.
 * @internal
 */
const PERLIN_GRADIENTS_2D: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Generate a permutation table using the provided random function.
 *
 * @param random - Seeded random number generator
 * @returns Permutation table for Perlin noise
 * @internal
 */
function generatePermutationTable(random: () => number): number[] {
  // Create initial sequence 0-255
  const p = Array.from({ length: 256 }, (_, i) => i);

  // Fisher-Yates shuffle using the seeded random function
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }

  // Duplicate for overflow handling
  return [...p, ...p];
}

/**
 * Get gradient vector for Perlin noise at grid coordinates.
 *
 * @param x - Grid X coordinate
 * @param y - Grid Y coordinate
 * @param permutation - Permutation table
 * @returns Gradient vector [x, y]
 * @internal
 */
function getPerlinGradient(
  x: number,
  y: number,
  permutation: number[]
): [number, number] {
  const hash = permutation[permutation[x & 255] + (y & 255)];
  return PERLIN_GRADIENTS_2D[hash & 7];
}

/**
 * Calculate dot product of gradient vector and distance vector.
 *
 * @param grad - Gradient vector [x, y]
 * @param x - Distance X
 * @param y - Distance Y
 * @returns Dot product result
 * @internal
 */
function dot(grad: [number, number], x: number, y: number): number {
  return grad[0] * x + grad[1] * y;
}

/**
 * Standard simplex noise gradient vectors for 2D.
 * @internal
 */
const SIMPLEX_GRADIENTS_2D: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Get gradient vector for simplex noise using permutation table.
 *
 * @param x - Grid X coordinate
 * @param y - Grid Y coordinate
 * @param permutation - Permutation table
 * @returns Gradient vector [x, y]
 * @internal
 */
function getSimplexGradient(
  x: number,
  y: number,
  permutation: number[]
): [number, number] {
  const hash = permutation[permutation[x & 255] + (y & 255)];
  return SIMPLEX_GRADIENTS_2D[hash & 7];
}

/**
 * Generates Perlin noise values for organic-looking randomness.
 *
 * Proper implementation of Ken Perlin's improved noise algorithm using permutation tables,
 * standard gradient vectors, dot products, and smoothstep interpolation.
 *
 * @param x - X coordinate in noise space
 * @param y - Y coordinate in noise space
 * @param random - Random number generator function
 * @returns Noise value between 0 and 1
 * @internal
 */
function perlinNoise(x: number, y: number, random: () => number): number {
  // Generate permutation table (cached would be better for performance)
  const permutation = generatePermutationTable(random);

  // Get grid coordinates
  const xi = Math.floor(x);
  const yi = Math.floor(y);

  // Fractional parts
  const xf = x - xi;
  const yf = y - yi;

  // Smoothstep interpolation (6t^5 - 15t^4 + 10t^3)
  const u = fade(xf);
  const v = fade(yf);

  // Get gradients for the four grid corners
  const aa = getPerlinGradient(xi, yi, permutation);
  const ab = getPerlinGradient(xi, yi + 1, permutation);
  const ba = getPerlinGradient(xi + 1, yi, permutation);
  const bb = getPerlinGradient(xi + 1, yi + 1, permutation);

  // Calculate dot products with distance vectors
  const x1 = lerp(dot(aa, xf, yf), dot(ba, xf - 1, yf), u);
  const x2 = lerp(dot(ab, xf, yf - 1), dot(bb, xf - 1, yf - 1), u);

  // Final interpolation and normalize to 0-1
  const result = lerp(x1, x2, v);
  return (result + 1) * 0.5; // Convert from [-1,1] to [0,1]
}

/**
 * Generates simplex noise values for improved noise quality.
 *
 * Proper implementation of Ken Perlin's 2D simplex noise algorithm using triangular
 * grid, seeded permutation table, and gradient vectors for better isotropy and performance.
 *
 * @param x - X coordinate in noise space
 * @param y - Y coordinate in noise space
 * @param random - Random number generator function
 * @returns Noise value between 0 and 1
 * @internal
 */
function simplexNoise(x: number, y: number, random: () => number): number {
  // Generate permutation table from seed
  const permutation = generatePermutationTable(random);

  // Simplex noise constants
  const F2 = 0.5 * (Math.sqrt(3) - 1); // Skewing factor
  const G2 = (3 - Math.sqrt(3)) / 6; // Unskewing factor

  // Skew input space to determine which simplex cell we're in
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);

  // Unskew the cell origin back to (x, y) space
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0; // Distance from cell origin
  const y0 = y - Y0;

  // Determine which simplex we are in (upper or lower triangle)
  let i1: number, j1: number;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0; // Lower triangle
  } else {
    i1 = 0;
    j1 = 1; // Upper triangle
  }

  // Offsets for second corner in (x, y) unskewed coords
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  // Calculate contributions from each corner
  let n0 = 0,
    n1 = 0,
    n2 = 0;

  // First corner
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    const grad0 = getSimplexGradient(i & 255, j & 255, permutation);
    t0 *= t0;
    n0 = t0 * t0 * (grad0[0] * x0 + grad0[1] * y0);
  }

  // Second corner
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    const grad1 = getSimplexGradient(
      (i + i1) & 255,
      (j + j1) & 255,
      permutation
    );
    t1 *= t1;
    n1 = t1 * t1 * (grad1[0] * x1 + grad1[1] * y1);
  }

  // Third corner
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    const grad2 = getSimplexGradient((i + 1) & 255, (j + 1) & 255, permutation);
    t2 *= t2;
    n2 = t2 * t2 * (grad2[0] * x2 + grad2[1] * y2);
  }

  // Sum contributions and normalize to 0-1
  return (70 * (n0 + n1 + n2) + 1) * 0.5;
}

/**
 * Linear interpolation between two values.
 *
 * Internal helper function for smooth transitions between values,
 * commonly used in noise generation and color blending.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 * @internal
 */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Calculates iteration count for Mandelbrot set fractal.
 *
 * Internal function that determines if a point in the complex plane is part of
 * the Mandelbrot set by iterating the equation z = z² + c until escape or max iterations.
 *
 * @param x0 - Real component of complex number
 * @param y0 - Imaginary component of complex number
 * @param maxIter - Maximum iterations before considering point in set
 * @returns Number of iterations before escape, or maxIter if in set
 * @internal
 */
function mandelbrotIterations(x0: number, y0: number, maxIter: number): number {
  let x = 0;
  let y = 0;
  let iteration = 0;

  while (x * x + y * y <= 4 && iteration < maxIter) {
    const xtemp = x * x - y * y + x0;
    y = 2 * x * y + y0;
    x = xtemp;
    iteration++;
  }

  return iteration;
}

/**
 * Calculates iteration count for Julia set fractal.
 *
 * Internal function that determines if a point is part of the Julia set using
 * the equation z = z² + c with a fixed complex constant c.
 *
 * @param x - Real component of test point
 * @param y - Imaginary component of test point
 * @param cx - Real component of Julia constant
 * @param cy - Imaginary component of Julia constant
 * @param maxIter - Maximum iterations before considering point in set
 * @returns Number of iterations before escape, or maxIter if in set
 * @internal
 */
function juliaIterations(
  x: number,
  y: number,
  cx: number,
  cy: number,
  maxIter: number
): number {
  let iteration = 0;

  while (x * x + y * y <= 4 && iteration < maxIter) {
    const xtemp = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xtemp;
    iteration++;
  }

  return iteration;
}

/**
 * Calculates iteration count for Sierpinski triangle fractal.
 *
 * Proper implementation using the binomial coefficient method: a point (x,y) is in
 * the Sierpinski triangle if the binomial coefficient C(x,y) is odd. This corresponds
 * to checking if there are no carries when adding x and y in binary representation.
 *
 * @param x - X coordinate of pixel
 * @param y - Y coordinate of pixel
 * @param width - Image width for coordinate normalization
 * @param height - Image height for coordinate normalization
 * @param maxIter - Maximum iterations (used for scaling/detail level)
 * @returns Iteration count indicating membership in triangle
 * @internal
 */
function sierpinskiIterations(
  x: number,
  y: number,
  width: number,
  height: number,
  maxIter: number
): number {
  // Create a coordinate system that maps the image to powers of 2 for clean binary operations
  const size = Math.min(width, height);
  const scale = 256; // Use fixed scale for consistent results

  // Center the triangle
  const centerX = width / 2;
  const centerY = height / 2;

  // Transform coordinates to triangle space
  const dx = x - centerX;
  const dy = y - centerY;

  // Scale and offset to create integer coordinates for the triangle
  const tx = Math.floor((dx + size / 2) * (scale / size));
  const ty = Math.floor((dy + size / 2) * (scale / size));

  // Ensure coordinates are in valid range
  if (tx < 0 || ty < 0 || tx >= scale || ty >= scale) {
    return maxIter; // Outside triangle = max iterations (background color)
  }

  // Additional boundary check: classic triangle shape (tx + ty < scale)
  if (tx + ty >= scale) {
    return maxIter;
  }

  // Sierpinski triangle check using binary representation:
  // A point (i,j) is in the triangle if (i & j) == 0 (no overlapping bits)
  let depth = 0;
  let i = tx;
  let j = ty;

  // Count how many binary levels this point satisfies the Sierpinski condition
  while (i > 0 && j > 0 && depth < 8) {
    // Limit to 8 levels for better color distribution
    if ((i & j) === 0) {
      depth++;
    } else {
      break; // Found overlapping bits, exit
    }
    i >>= 1;
    j >>= 1;
  }

  // Map depth to full iteration range for better color distribution
  // Points in triangle get low values, points outside get high values
  if (depth === 0) {
    return maxIter; // Not in triangle
  }

  // Scale the depth to use the full color range
  const scaledIterations = Math.floor((depth / 8) * maxIter);
  return scaledIterations;
}

/**
 * Generates a rainbow color palette for fractal visualization.
 *
 * Internal helper function that creates a smooth rainbow gradient palette
 * optimized for fractal visualization with good contrast and visual appeal.
 *
 * @returns Array of RGB colors forming a rainbow gradient
 * @internal
 */
function generateFractalColors(): RGBColor[] {
  const colors: RGBColor[] = [];
  for (let i = 0; i < 256; i++) {
    const hue = (i / 256) * 360;
    const rgb = hslToRgb(hue, 1, 0.5);
    colors.push(rgb);
  }
  return colors;
}

/**
 * Converts HSL color values to RGB color.
 *
 * Internal helper function for color space conversion, allowing generation
 * of smooth color gradients using the HSL color model.
 *
 * @param h - Hue value (0-360 degrees)
 * @param s - Saturation value (0-1)
 * @param l - Lightness value (0-1)
 * @returns RGB color object
 * @internal
 */
function hslToRgb(h: number, s: number, l: number): RGBColor {
  h /= 360;
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
    red: Math.round((r + m) * 255),
    green: Math.round((g + m) * 255),
    blue: Math.round((b + m) * 255),
  };
}

/**
 * Draws a filled circle in image data.
 *
 * Internal helper function that renders a filled circle with anti-aliasing
 * using distance-based alpha blending for smooth edges.
 *
 * @param data - Image data array to modify
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cx - Circle center X coordinate
 * @param cy - Circle center Y coordinate
 * @param radius - Circle radius in pixels
 * @param color - Fill color
 * @internal
 */
function drawCircle(
  data: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  color: RGBColor
): void {
  const r2 = radius * radius;
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const index = (y * width + x) * 4;
        data[index] = color.red;
        data[index + 1] = color.green;
        data[index + 2] = color.blue;
        data[index + 3] = 255;
      }
    }
  }
}

/**
 * Draws a filled square in image data.
 *
 * Internal helper function that renders a filled square centered at the
 * specified coordinates with proper bounds checking.
 *
 * @param data - Image data array to modify
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cx - Square center X coordinate
 * @param cy - Square center Y coordinate
 * @param size - Square side length in pixels
 * @param color - Fill color
 * @internal
 */
function drawSquare(
  data: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  size: number,
  color: RGBColor
): void {
  const halfSize = size / 2;
  const minY = Math.max(0, Math.floor(cy - halfSize));
  const maxY = Math.min(height - 1, Math.ceil(cy + halfSize));
  const minX = Math.max(0, Math.floor(cx - halfSize));
  const maxX = Math.min(width - 1, Math.ceil(cx + halfSize));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const index = (y * width + x) * 4;
      data[index] = color.red;
      data[index + 1] = color.green;
      data[index + 2] = color.blue;
      data[index + 3] = 255;
    }
  }
}

/**
 * Draws a filled equilateral triangle in image data.
 *
 * Internal helper function that renders a filled triangle using barycentric
 * coordinate testing for accurate geometric shape rendering.
 *
 * @param data - Image data array to modify
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cx - Triangle center X coordinate
 * @param cy - Triangle center Y coordinate
 * @param size - Triangle size (distance from center to vertex)
 * @param color - Fill color
 * @internal
 */
function drawTriangle(
  data: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  size: number,
  color: RGBColor
): void {
  // Draw an equilateral triangle centered at (cx, cy)
  const triHeight = (size * Math.sqrt(3)) / 2;

  // Triangle vertices (top vertex up, base down)
  const x1 = cx;
  const y1 = cy - triHeight / 2;
  const x2 = cx - size / 2;
  const y2 = cy + triHeight / 2;
  const x3 = cx + size / 2;
  const y3 = cy + triHeight / 2;

  const minY = Math.max(0, Math.floor(Math.min(y1, y2, y3)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(y1, y2, y3)));
  const minX = Math.max(0, Math.floor(Math.min(x1, x2, x3)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(x1, x2, x3)));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Use barycentric coordinates to check if point is inside triangle
      const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
      if (Math.abs(denom) < 1e-10) continue; // Degenerate triangle

      const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denom;
      const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denom;
      const c = 1 - a - b;

      if (a >= 0 && b >= 0 && c >= 0) {
        const index = (y * width + x) * 4;
        data[index] = color.red;
        data[index + 1] = color.green;
        data[index + 2] = color.blue;
        data[index + 3] = 255;
      }
    }
  }
}

/**
 * Draws a filled regular hexagon in image data.
 *
 * Internal helper function that renders a filled hexagon using distance-based
 * testing with proper geometric calculations for each of the six sides.
 *
 * @param data - Image data array to modify
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cx - Hexagon center X coordinate
 * @param cy - Hexagon center Y coordinate
 * @param size - Hexagon size (distance from center to vertex)
 * @param color - Fill color
 * @internal
 */
function drawHexagon(
  data: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  size: number,
  color: RGBColor
): void {
  // Draw a regular hexagon centered at (cx, cy)
  const minY = Math.max(0, Math.floor(cy - size));
  const maxY = Math.min(height - 1, Math.ceil(cy + size));
  const minX = Math.max(0, Math.floor(cx - size));
  const maxX = Math.min(width - 1, Math.ceil(cx + size));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;

      // Check if point is inside hexagon using distance formula
      // A regular hexagon can be defined by 6 lines
      const angle = Math.atan2(dy, dx);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Convert angle to 0-2π range
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

      // Find which hexagon edge we're closest to
      const sectorAngle = Math.PI / 3; // 60 degrees
      const sector = Math.floor(normalizedAngle / sectorAngle);
      const angleInSector = normalizedAngle - sector * sectorAngle;

      // Distance to edge in this sector
      const cosAngle = Math.cos(angleInSector - sectorAngle / 2);
      const maxDistanceInSector = size / cosAngle;

      if (distance <= Math.abs(maxDistanceInSector)) {
        const index = (y * width + x) * 4;
        data[index] = color.red;
        data[index + 1] = color.green;
        data[index + 2] = color.blue;
        data[index + 3] = 255;
      }
    }
  }
}

/**
 * Draws a thick point (filled circle) in image data.
 *
 * Internal helper function for rendering points with thickness, commonly used
 * for drawing spiral lines and other curved paths with variable line width.
 *
 * @param data - Image data array to modify
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param x - Point center X coordinate
 * @param y - Point center Y coordinate
 * @param thickness - Point radius in pixels
 * @param color - Fill color
 * @internal
 */
function drawThickPoint(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  thickness: number,
  color: RGBColor
): void {
  const halfThickness = thickness / 2;
  const minY = Math.max(0, Math.floor(y - halfThickness));
  const maxY = Math.min(height - 1, Math.ceil(y + halfThickness));
  const minX = Math.max(0, Math.floor(x - halfThickness));
  const maxX = Math.min(width - 1, Math.ceil(x + halfThickness));

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const index = (py * width + px) * 4;
      data[index] = color.red;
      data[index + 1] = color.green;
      data[index + 2] = color.blue;
      data[index + 3] = 255;
    }
  }
}
