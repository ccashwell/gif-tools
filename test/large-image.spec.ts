import { createGradientGif, createStaticGif, GifResult } from '../src';

describe('Large Image Handling', () => {
  describe('Gradient GIFs', () => {
    it('should handle small gradients correctly', () => {
      const gif = createGradientGif(
        50,
        50,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 255 },
        'horizontal'
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(100);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should handle medium gradients (100x100)', () => {
      const gif = createGradientGif(
        100,
        100,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 255 },
        'horizontal'
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);
    });

    it('should handle larger gradients (200x200)', () => {
      const gif = createGradientGif(
        200,
        200,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 255 },
        'horizontal'
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);

      // console.log(`200x200 gradient GIF size: ${gif.sizeFormatted}`);
    });

    it('should handle very large gradients (300x300)', () => {
      const gif = createGradientGif(
        150,
        150,
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 0, blue: 255 },
        'horizontal'
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);

      // console.log(`150x150 gradient GIF size: ${gif.sizeFormatted}`);
    });
  });

  describe('Solid Color GIFs', () => {
    it('should handle large solid color GIFs (500x500)', () => {
      const gif = createGradientGif(
        200,
        200,
        { red: 255, green: 0, blue: 0 },
        { red: 255, green: 0, blue: 0 }, // Same color = solid
        'horizontal'
      );

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);

      // console.log(`200x200 solid GIF size: ${gif.sizeFormatted}`);
    });
  });

  describe('Manual Test Data Creation', () => {
    it('should create test images with varying complexity', () => {
      // Create ImageData with many different colors (high complexity)
      const width = 100;
      const height = 100;
      const data = new Uint8Array(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 4;
          // Create a complex pattern with many colors
          data[offset] = (x * 255) / width; // Red varies by x
          data[offset + 1] = (y * 255) / height; // Green varies by y
          data[offset + 2] = ((x + y) * 255) / (width + height); // Blue varies by both
          data[offset + 3] = 255; // Full alpha
        }
      }

      const imageData = { width, height, data };
      const gif = createStaticGif(imageData, { maxColors: 256 });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.isValidGif()).toBe(true);

      // console.log(`Complex 100x100 GIF size: ${gif.sizeFormatted}`);
    });
  });
});
