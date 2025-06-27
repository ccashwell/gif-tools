import {
  createNoiseGif,
  createFractalGif,
  createGeometricGif,
  createSpiralGif,
  GifResult,
} from '../src';

const IMAGE_SIZE = 200;

describe('Pattern Generators', () => {
  describe('createNoiseGif', () => {
    it('should create white noise GIF', async () => {
      const gif = createNoiseGif(IMAGE_SIZE, IMAGE_SIZE, { type: 'white' });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      expect(gif.size).toBeGreaterThan(0);
      await gif.saveToFile('white-noise.gif');
    });

    it('should create Perlin noise GIF', async () => {
      const gif = createNoiseGif(IMAGE_SIZE, IMAGE_SIZE, {
        type: 'perlin',
        scale: 2,
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('perlin-noise.gif');
    });

    it('should create simplex noise GIF', async () => {
      const gif = createNoiseGif(IMAGE_SIZE, IMAGE_SIZE, {
        type: 'simplex',
        scale: 1.5,
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('simplex-noise.gif');
    });

    it('should use custom colors', async () => {
      const colors = [
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 255, blue: 0 },
        { red: 0, green: 0, blue: 255 },
      ];

      const gif = createNoiseGif(IMAGE_SIZE, IMAGE_SIZE, { colors });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('custom-colors.gif');
    });

    it('should use seeded random for reproducible results', () => {
      const gif1 = createNoiseGif(10, 10, { seed: 12345 });
      const gif2 = createNoiseGif(10, 10, { seed: 12345 });

      expect(gif1.toUint8Array()).toEqual(gif2.toUint8Array());
    });

    it('should create different results with different seeds', () => {
      const gif1 = createNoiseGif(10, 10, { seed: 1 });
      const gif2 = createNoiseGif(10, 10, { seed: 2 });

      expect(gif1.toUint8Array()).not.toEqual(gif2.toUint8Array());
    });
  });

  describe('createFractalGif', () => {
    it('should create Mandelbrot fractal', async () => {
      const gif = createFractalGif(IMAGE_SIZE, IMAGE_SIZE, {
        type: 'mandelbrot',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      expect(gif.size).toBeGreaterThan(0);
      await gif.saveToFile('mandelbrot-fractal.gif');
    });

    it('should create Julia set fractal', async () => {
      const gif = createFractalGif(IMAGE_SIZE, IMAGE_SIZE, { type: 'julia' });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('julia-fractal.gif');
    });

    it('should create Sierpinski triangle', async () => {
      const gif = createFractalGif(IMAGE_SIZE, IMAGE_SIZE, {
        type: 'sierpinski',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('sierpinski-triangle.gif');
    });

    it('should handle custom parameters', () => {
      const gif = createFractalGif(15, 15, {
        type: 'mandelbrot',
        maxIterations: 50,
        zoom: 2,
        centerX: -0.5,
        centerY: 0,
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should use custom color palette', () => {
      const colors = [
        { red: 255, green: 0, blue: 0 },
        { red: 255, green: 255, blue: 0 },
        { red: 0, green: 255, blue: 255 },
      ];

      const gif = createFractalGif(20, 20, { colors });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
    });
  });

  describe('createGeometricGif', () => {
    it('should create circles pattern', async () => {
      const gif = createGeometricGif(IMAGE_SIZE, IMAGE_SIZE, {
        shape: 'circles',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      expect(gif.size).toBeGreaterThan(0);
      await gif.saveToFile('circles-pattern.gif');
    });

    it('should create squares pattern', async () => {
      const gif = createGeometricGif(IMAGE_SIZE, IMAGE_SIZE, {
        shape: 'squares',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('squares-pattern.gif');
    });

    it('should create triangles pattern', async () => {
      const gif = createGeometricGif(IMAGE_SIZE, IMAGE_SIZE, {
        shape: 'triangles',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('triangles-pattern.gif');
    });

    it('should create hexagons pattern', async () => {
      const gif = createGeometricGif(IMAGE_SIZE, IMAGE_SIZE, {
        shape: 'hexagons',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('hexagons-pattern.gif');
    });

    it('should handle custom parameters', () => {
      const gif = createGeometricGif(50, 50, {
        shape: 'circles',
        count: 10,
        sizeVariation: 0.8,
        backgroundColor: { red: 100, green: 100, blue: 100 },
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should use custom colors', () => {
      const colors = [
        { red: 255, green: 100, blue: 100 },
        { red: 100, green: 255, blue: 100 },
      ];

      const gif = createGeometricGif(30, 30, { colors });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
    });
  });

  describe('createSpiralGif', () => {
    it('should create Archimedean spiral', async () => {
      const gif = createSpiralGif(IMAGE_SIZE, IMAGE_SIZE, {
        type: 'archimedean',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      expect(gif.size).toBeGreaterThan(0);
      await gif.saveToFile('archimedean-spiral.gif');
    });

    it('should create logarithmic spiral', async () => {
      const gif = createSpiralGif(IMAGE_SIZE, IMAGE_SIZE, {
        type: 'logarithmic',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('logarithmic-spiral.gif');
    });

    it('should create Fibonacci spiral', async () => {
      const gif = createSpiralGif(IMAGE_SIZE, IMAGE_SIZE, {
        type: 'fibonacci',
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('fibonacci-spiral.gif');
    });

    it('should handle custom parameters', async () => {
      const gif = createSpiralGif(50, 50, {
        type: 'archimedean',
        turns: 3,
        thickness: 3,
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('custom-spiral.gif');
    });

    it('should use custom colors', () => {
      const colors = [
        { red: 255, green: 0, blue: 255 },
        { red: 0, green: 255, blue: 255 },
        { red: 255, green: 255, blue: 0 },
      ];

      const gif = createSpiralGif(40, 40, { colors });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle small dimensions', () => {
      const noiseGif = createNoiseGif(5, 5);
      const fractalGif = createFractalGif(5, 5);
      const geometricGif = createGeometricGif(5, 5);
      const spiralGif = createSpiralGif(5, 5);

      expect(noiseGif.isValidGif()).toBe(true);
      expect(fractalGif.isValidGif()).toBe(true);
      expect(geometricGif.isValidGif()).toBe(true);
      expect(spiralGif.isValidGif()).toBe(true);
    });

    it('should handle rectangular dimensions', () => {
      const noiseGif = createNoiseGif(30, 10);
      const fractalGif = createFractalGif(10, 30);
      const geometricGif = createGeometricGif(40, 20);
      const spiralGif = createSpiralGif(20, 40);

      expect(noiseGif.isValidGif()).toBe(true);
      expect(fractalGif.isValidGif()).toBe(true);
      expect(geometricGif.isValidGif()).toBe(true);
      expect(spiralGif.isValidGif()).toBe(true);
    });

    it('should create reasonable file sizes', () => {
      const gif = createNoiseGif(50, 50);

      // Should be less than 100KB for a 50x50 noise image
      expect(gif.size).toBeLessThan(100000);
      expect(gif.size).toBeGreaterThan(100); // But not too small
    });

    it('should handle zero shape count gracefully', () => {
      const gif = createGeometricGif(20, 20, { count: 0 });

      expect(gif.isValidGif()).toBe(true);
      // Should just be a solid background
    });

    it('should handle zero spiral turns', () => {
      const gif = createSpiralGif(20, 20, { turns: 0 });

      expect(gif.isValidGif()).toBe(true);
      // Should just be a black background
    });
  });

  describe('visual consistency', () => {
    it('should create deterministic fractals', () => {
      const gif1 = createFractalGif(20, 20, {
        type: 'mandelbrot',
        maxIterations: 50,
        centerX: 0,
        centerY: 0,
        zoom: 1,
      });

      const gif2 = createFractalGif(20, 20, {
        type: 'mandelbrot',
        maxIterations: 50,
        centerX: 0,
        centerY: 0,
        zoom: 1,
      });

      // Fractals should be deterministic
      expect(gif1.toUint8Array()).toEqual(gif2.toUint8Array());
    });

    it('should create different patterns for different parameters', () => {
      const spiral1 = createSpiralGif(30, 30, { turns: 2 });
      const spiral2 = createSpiralGif(30, 30, { turns: 5 });

      // Different turn counts should create different patterns
      expect(spiral1.toUint8Array()).not.toEqual(spiral2.toUint8Array());
    });

    it('should respect color palettes', () => {
      const redColors = [{ red: 255, green: 0, blue: 0 }];
      const blueColors = [{ red: 0, green: 0, blue: 255 }];

      const redGif = createNoiseGif(10, 10, { colors: redColors });
      const blueGif = createNoiseGif(10, 10, { colors: blueColors });

      // Different color palettes should create different results
      expect(redGif.toUint8Array()).not.toEqual(blueGif.toUint8Array());
    });
  });
});
