import {
  GifWriter,
  createSolidColorGif,
  MedianCutQuantizer,
  GifResult,
  createGradientGif,
  createAnimatedGradientGif,
} from '../src';

describe('GIF Tools Index', () => {
  describe('Exports', () => {
    it('should export GifWriter', () => {
      expect(GifWriter).toBeDefined();
      expect(typeof GifWriter).toBe('function');
    });

    it('should export helper functions', () => {
      expect(createSolidColorGif).toBeDefined();
      expect(typeof createSolidColorGif).toBe('function');
    });

    it('should export MedianCutQuantizer', () => {
      expect(MedianCutQuantizer).toBeDefined();
      expect(typeof MedianCutQuantizer).toBe('function');
    });

    it('should create a basic GIF using exported functions', () => {
      const gif = createSolidColorGif(10, 10, { red: 255, green: 0, blue: 0 });
      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(0);
      expect(gif.mimeType).toBe('image/gif');
      expect(gif.extension).toBe('gif');
      expect(gif.isValidGif()).toBe(true);
      expect(gif.toUint8Array()).toBeInstanceOf(Uint8Array);
      expect(gif.toBuffer()).toBeInstanceOf(Uint8Array);
      expect(typeof gif.toDataURL()).toBe('string');
    });
  });

  describe('createGradientGif', () => {
    it('should create a gradient GIF', async () => {
      const gif = createGradientGif(
        200,
        200,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 255 },
        'diagonal'
      );
      await gif.saveToFile('gradient.gif');
      expect(gif).toBeInstanceOf(GifResult);
    });

    it('should create gradient GIF', () => {
      const gif = createGradientGif(
        100,
        100,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 255 },
        'diagonal'
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(1000);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should create animated gradient GIF with shift animation', () => {
      const gif = createAnimatedGradientGif(
        256,
        256,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 255, blue: 0 },
        {
          animationType: 'shift',
          frames: 20,
          delay: 50,
          intensity: 0.8,
          loops: 2,
        }
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(2000);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should create animated gradient GIF with pulse animation', () => {
      const gif = createAnimatedGradientGif(
        256,
        256,
        { red: 0, green: 0, blue: 255 },
        { red: 255, green: 255, blue: 0 },
        {
          direction: 'diagonal',
          animationType: 'pulse',
          frames: 20,
          delay: 100,
          maxColors: 64,
        }
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(1500);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should create animated gradient GIF with wave animation', async () => {
      const gif = createAnimatedGradientGif(
        128,
        128,
        { red: 255, green: 0, blue: 255 },
        { red: 0, green: 255, blue: 255 },
        {
          direction: 'diagonal',
          animationType: 'wave',
          frames: 20,
          intensity: 0.8,
          maxColors: 64,
        }
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(2000);
      expect(gif.isValidGif()).toBe(true);
      await gif.saveToFile('wave.gif');
    });

    it('should create animated gradient GIF with rotate animation', () => {
      const gif = createAnimatedGradientGif(
        30,
        30,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 255 },
        {
          animationType: 'rotate',
          frames: 20,
          delay: 75,
          intensity: 1.0,
        }
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(1000);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should validate animated gradient parameters', () => {
      expect(() =>
        createAnimatedGradientGif(
          0,
          50,
          { red: 255, green: 0, blue: 0 },
          { red: 0, green: 255, blue: 0 }
        )
      ).toThrow('Invalid width');

      expect(() =>
        createAnimatedGradientGif(
          50,
          50,
          { red: 255, green: 0, blue: 0 },
          { red: 0, green: 255, blue: 0 },
          { frames: 0 }
        )
      ).toThrow('Invalid frame count');

      expect(() =>
        createAnimatedGradientGif(
          50,
          50,
          { red: 255, green: 0, blue: 0 },
          { red: 0, green: 255, blue: 0 },
          { intensity: 1.5 }
        )
      ).toThrow('Invalid intensity');
    });
  });
});
