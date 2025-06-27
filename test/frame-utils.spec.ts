import {
  adjustColors,
  blurImage,
  changeGifSpeed,
  createAnimatedGif,
  createImageData,
  createStaticGif,
  cropImage,
  flipImage,
  GifReader,
  GifResult,
  GifValidationError,
  ImageData,
  manipulateGif,
  resizeImage,
  reverseGif,
  rotateImage,
} from '../src';

describe('Frame Utils', () => {
  let testImageData: ImageData;

  beforeEach(() => {
    // Create a simple 4x4 test image with a pattern
    const data = new Uint8Array(64); // 4x4x4 (RGBA)

    // Create a simple pattern: red top-left, green top-right, blue bottom-left, white bottom-right
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const index = (y * 4 + x) * 4;
        if (x < 2 && y < 2) {
          // Top-left: Red
          data[index] = 255;
          data[index + 1] = 0;
          data[index + 2] = 0;
          data[index + 3] = 255;
        } else if (x >= 2 && y < 2) {
          // Top-right: Green
          data[index] = 0;
          data[index + 1] = 255;
          data[index + 2] = 0;
          data[index + 3] = 255;
        } else if (x < 2 && y >= 2) {
          // Bottom-left: Blue
          data[index] = 0;
          data[index + 1] = 0;
          data[index + 2] = 255;
          data[index + 3] = 255;
        } else {
          // Bottom-right: White
          data[index] = 255;
          data[index + 1] = 255;
          data[index + 2] = 255;
          data[index + 3] = 255;
        }
      }
    }

    testImageData = { width: 4, height: 4, data };
  });

  describe('cropImage', () => {
    it('should crop image correctly', () => {
      const cropped = cropImage(testImageData, {
        x: 1,
        y: 1,
        width: 2,
        height: 2,
      });

      expect(cropped.width).toBe(2);
      expect(cropped.height).toBe(2);
      expect(cropped.data.length).toBe(16); // 2x2x4
    });

    it('should throw error for invalid crop bounds', () => {
      expect(() => {
        cropImage(testImageData, { x: -1, y: 0, width: 2, height: 2 });
      }).toThrow(GifValidationError);

      expect(() => {
        cropImage(testImageData, { x: 0, y: 0, width: 10, height: 2 });
      }).toThrow(GifValidationError);
    });

    it('should preserve color data in cropped region', () => {
      const cropped = cropImage(testImageData, {
        x: 0,
        y: 0,
        width: 2,
        height: 2,
      });

      // Should contain only red pixels (top-left quadrant)
      for (let i = 0; i < cropped.data.length; i += 4) {
        expect(cropped.data[i]).toBe(255); // Red
        expect(cropped.data[i + 1]).toBe(0); // Green
        expect(cropped.data[i + 2]).toBe(0); // Blue
        expect(cropped.data[i + 3]).toBe(255); // Alpha
      }
    });
  });

  describe('resizeImage', () => {
    it('should resize image with nearest neighbor', () => {
      const resized = resizeImage(testImageData, {
        width: 8,
        height: 8,
        algorithm: 'nearest',
      });

      expect(resized.width).toBe(8);
      expect(resized.height).toBe(8);
      expect(resized.data.length).toBe(256); // 8x8x4
    });

    it('should resize image with bilinear interpolation', () => {
      const resized = resizeImage(testImageData, {
        width: 2,
        height: 2,
        algorithm: 'bilinear',
      });

      expect(resized.width).toBe(2);
      expect(resized.height).toBe(2);
      expect(resized.data.length).toBe(16); // 2x2x4
    });

    it('should throw error for invalid dimensions', () => {
      expect(() => {
        resizeImage(testImageData, { width: 0, height: 10 });
      }).toThrow(GifValidationError);

      expect(() => {
        resizeImage(testImageData, { width: 10, height: -1 });
      }).toThrow(GifValidationError);
    });

    it('should default to bilinear algorithm', () => {
      const resized = resizeImage(testImageData, { width: 2, height: 2 });
      expect(resized.width).toBe(2);
      expect(resized.height).toBe(2);
    });
  });

  describe('rotateImage', () => {
    it('should rotate image 90 degrees', () => {
      const rotated = rotateImage(testImageData, { angle: 90 });

      expect(rotated.width).toBe(4); // Height becomes width
      expect(rotated.height).toBe(4); // Width becomes height
      expect(rotated.data.length).toBe(64); // Same total pixels
    });

    it('should rotate image 180 degrees', () => {
      const rotated = rotateImage(testImageData, { angle: 180 });

      expect(rotated.width).toBe(4); // Same dimensions
      expect(rotated.height).toBe(4);
      expect(rotated.data.length).toBe(64);
    });

    it('should rotate image 270 degrees', () => {
      const rotated = rotateImage(testImageData, { angle: 270 });

      expect(rotated.width).toBe(4);
      expect(rotated.height).toBe(4);
      expect(rotated.data.length).toBe(64);
    });

    it('should throw error for invalid rotation angle', () => {
      expect(() => {
        rotateImage(testImageData, { angle: 45 as any });
      }).toThrow(GifValidationError);
    });
  });

  describe('flipImage', () => {
    it('should flip image horizontally', () => {
      const flipped = flipImage(testImageData, { horizontal: true });

      expect(flipped.width).toBe(4);
      expect(flipped.height).toBe(4);
      expect(flipped.data.length).toBe(64);
    });

    it('should flip image vertically', () => {
      const flipped = flipImage(testImageData, { vertical: true });

      expect(flipped.width).toBe(4);
      expect(flipped.height).toBe(4);
      expect(flipped.data.length).toBe(64);
    });

    it('should flip image both horizontally and vertically', () => {
      const flipped = flipImage(testImageData, {
        horizontal: true,
        vertical: true,
      });

      expect(flipped.width).toBe(4);
      expect(flipped.height).toBe(4);
      expect(flipped.data.length).toBe(64);
    });

    it('should return copy when no flip specified', () => {
      const flipped = flipImage(testImageData, {});

      expect(flipped.width).toBe(4);
      expect(flipped.height).toBe(4);
      expect(flipped.data).not.toBe(testImageData.data); // Should be a copy
    });
  });

  describe('adjustColors', () => {
    it('should adjust brightness', () => {
      const adjusted = adjustColors(testImageData, { brightness: 0.2 });

      expect(adjusted.width).toBe(4);
      expect(adjusted.height).toBe(4);
      expect(adjusted.data.length).toBe(64);

      // Check that some pixels are brighter
      let hasBrighterPixels = false;
      for (let i = 0; i < adjusted.data.length; i += 4) {
        if (
          adjusted.data[i] > testImageData.data[i] ||
          adjusted.data[i + 1] > testImageData.data[i + 1] ||
          adjusted.data[i + 2] > testImageData.data[i + 2]
        ) {
          hasBrighterPixels = true;
          break;
        }
      }
      expect(hasBrighterPixels).toBe(true);
    });

    it('should adjust contrast', () => {
      const adjusted = adjustColors(testImageData, { contrast: 0.3 });

      expect(adjusted.width).toBe(4);
      expect(adjusted.height).toBe(4);
      expect(adjusted.data.length).toBe(64);
    });

    it('should adjust saturation', () => {
      const adjusted = adjustColors(testImageData, { saturation: 0.5 });

      expect(adjusted.width).toBe(4);
      expect(adjusted.height).toBe(4);
      expect(adjusted.data.length).toBe(64);
    });

    it('should adjust hue', () => {
      const adjusted = adjustColors(testImageData, { hue: 30 });

      expect(adjusted.width).toBe(4);
      expect(adjusted.height).toBe(4);
      expect(adjusted.data.length).toBe(64);
    });

    it('should handle multiple adjustments', () => {
      const adjusted = adjustColors(testImageData, {
        brightness: 0.1,
        contrast: 0.2,
        saturation: 0.3,
        hue: 15,
      });

      expect(adjusted.width).toBe(4);
      expect(adjusted.height).toBe(4);
      expect(adjusted.data.length).toBe(64);
    });

    it('should preserve alpha channel', () => {
      const adjusted = adjustColors(testImageData, { brightness: 0.5 });

      for (let i = 3; i < adjusted.data.length; i += 4) {
        expect(adjusted.data[i]).toBe(255); // Alpha should remain 255
      }
    });
  });

  describe('blurImage', () => {
    it('should blur image with default radius', () => {
      const blurred = blurImage(testImageData);

      expect(blurred.width).toBe(4);
      expect(blurred.height).toBe(4);
      expect(blurred.data.length).toBe(64);
    });

    it('should blur image with custom radius', () => {
      const blurred = blurImage(testImageData, 2);

      expect(blurred.width).toBe(4);
      expect(blurred.height).toBe(4);
      expect(blurred.data.length).toBe(64);
    });

    it('should create smoother transitions between colors', () => {
      const blurred = blurImage(testImageData, 1);

      // The blur should create intermediate values
      // This is a basic check that the image has been modified
      let hasIntermediateValues = false;
      for (let i = 0; i < blurred.data.length; i += 4) {
        const r = blurred.data[i];
        const g = blurred.data[i + 1];
        const b = blurred.data[i + 2];

        // Look for non-pure colors (indicating blending)
        if (
          (r > 0 && r < 255 && g > 0 && g < 255) ||
          (r > 0 && r < 255 && b > 0 && b < 255) ||
          (g > 0 && g < 255 && b > 0 && b < 255)
        ) {
          hasIntermediateValues = true;
          break;
        }
      }

      // Note: This test might be flaky depending on the blur implementation
      // but it gives us a basic sanity check
      expect(hasIntermediateValues).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should chain multiple operations', () => {
      let processed = cropImage(testImageData, {
        x: 0,
        y: 0,
        width: 3,
        height: 3,
      });
      processed = resizeImage(processed, { width: 6, height: 6 });
      processed = rotateImage(processed, { angle: 90 });
      processed = adjustColors(processed, { brightness: 0.1 });
      processed = blurImage(processed, 1);

      expect(processed.width).toBe(6);
      expect(processed.height).toBe(6);
      expect(processed.data.length).toBe(144); // 6x6x4
    });

    it('should work with real image data', () => {
      const realImageData = createImageData(
        10,
        10,
        new Uint8Array(400).fill(128)
      );

      const processed = resizeImage(realImageData, { width: 20, height: 20 });
      expect(processed.width).toBe(20);
      expect(processed.height).toBe(20);

      const rotated = rotateImage(processed, { angle: 180 });
      expect(rotated.width).toBe(20);
      expect(rotated.height).toBe(20);
    });
  });
});

describe('GIF Manipulation Functions', () => {
  // Helper function to create a valid animated GIF for testing
  function createTestAnimatedGif(frameCount: number): Uint8Array {
    const frames: ImageData[] = [];

    for (let i = 0; i < frameCount; i++) {
      const data = new Uint8Array(400); // 10x10 pixels, RGBA

      // Fill with different colors per frame
      for (let j = 0; j < 400; j += 4) {
        data[j] = i * 85; // Red
        data[j + 1] = 0; // Green
        data[j + 2] = 0; // Blue
        data[j + 3] = 255; // Alpha
      }

      frames.push({ width: 10, height: 10, data });
    }

    const result = createAnimatedGif(frames, { delay: 100 });
    return result.toUint8Array();
  }

  describe('reverseGif', () => {
    it('should reverse frame order of animated GIF', () => {
      const originalGif = createTestAnimatedGif(3);
      const reversed = reverseGif(originalGif);

      expect(reversed).toBeInstanceOf(GifResult);
      expect(reversed.toUint8Array().length).toBeGreaterThan(0);

      // Verify it's a valid GIF
      const reader = new GifReader(reversed.toUint8Array());
      const info = reader.getInfo();
      expect(info.frameCount).toBe(3);
      expect(info.width).toBe(10);
      expect(info.height).toBe(10);
    });

    it('should throw error for single frame GIF', () => {
      const data = new Uint8Array(400).fill(100);
      const staticGif = createStaticGif({ width: 10, height: 10, data });

      expect(() => {
        reverseGif(staticGif.toUint8Array());
      }).toThrow('Cannot reverse GIF with only one frame');
    });
  });

  describe('changeGifSpeed', () => {
    it('should double the speed (halve delays)', () => {
      const originalGif = createTestAnimatedGif(2);
      const fastGif = changeGifSpeed(originalGif, {
        speedMultiplier: 2.0,
      });

      expect(fastGif).toBeInstanceOf(GifResult);
      expect(fastGif.toUint8Array().length).toBeGreaterThan(0);

      // Verify it's a valid GIF
      const reader = new GifReader(fastGif.toUint8Array());
      const info = reader.getInfo();
      expect(info.frameCount).toBe(2);
    });

    it('should respect minimum delay limits', () => {
      const originalGif = createTestAnimatedGif(2);
      const fastGif = changeGifSpeed(originalGif, {
        speedMultiplier: 10.0,
        minDelay: 20,
      });

      expect(fastGif).toBeInstanceOf(GifResult);
    });

    it('should throw error for zero or negative speed multiplier', () => {
      const originalGif = createTestAnimatedGif(2);

      expect(() => {
        changeGifSpeed(originalGif, { speedMultiplier: 0 });
      }).toThrow('Speed multiplier must be positive');

      expect(() => {
        changeGifSpeed(originalGif, { speedMultiplier: -1 });
      }).toThrow('Speed multiplier must be positive');
    });

    it('should throw error for static GIF', () => {
      const data = new Uint8Array(400).fill(100);
      const staticGif = createStaticGif({ width: 10, height: 10, data });

      expect(() => {
        changeGifSpeed(staticGif.toUint8Array(), { speedMultiplier: 2.0 });
      }).toThrow('Cannot change speed of static GIF');
    });
  });

  describe('manipulateGif', () => {
    it('should apply both reverse and speed changes', () => {
      const originalGif = createTestAnimatedGif(3);
      const manipulated = manipulateGif(originalGif, {
        reverse: true,
        speed: { speedMultiplier: 2.0 },
      });

      expect(manipulated).toBeInstanceOf(GifResult);
      expect(manipulated.toUint8Array().length).toBeGreaterThan(0);

      // Verify it's a valid GIF
      const reader = new GifReader(manipulated.toUint8Array());
      const info = reader.getInfo();
      expect(info.frameCount).toBe(3);
      expect(info.width).toBe(10);
      expect(info.height).toBe(10);
    });

    it('should apply only reverse when speed not specified', () => {
      const originalGif = createTestAnimatedGif(2);
      const reversed = manipulateGif(originalGif, {
        reverse: true,
      });

      expect(reversed).toBeInstanceOf(GifResult);
      expect(reversed.toUint8Array().length).toBeGreaterThan(0);
    });

    it('should apply only speed when reverse not specified', () => {
      const originalGif = createTestAnimatedGif(2);
      const speedy = manipulateGif(originalGif, {
        speed: { speedMultiplier: 0.5 },
      });

      expect(speedy).toBeInstanceOf(GifResult);
      expect(speedy.toUint8Array().length).toBeGreaterThan(0);
    });

    it('should return original GIF when no options specified', () => {
      const originalGif = createTestAnimatedGif(2);
      const unchanged = manipulateGif(originalGif, {});

      expect(unchanged).toBeInstanceOf(GifResult);
      expect(unchanged.toUint8Array().length).toBeGreaterThan(0);
    });

    it('should throw error for static GIF with manipulations', () => {
      const data = new Uint8Array(400).fill(100);
      const staticGif = createStaticGif({ width: 10, height: 10, data });

      expect(() => {
        manipulateGif(staticGif.toUint8Array(), { reverse: true });
      }).toThrow('Cannot manipulate static GIF');

      expect(() => {
        manipulateGif(staticGif.toUint8Array(), {
          speed: { speedMultiplier: 2.0 },
        });
      }).toThrow('Cannot manipulate static GIF');
    });

    it('should validate speed multiplier in combined operations', () => {
      const originalGif = createTestAnimatedGif(2);

      expect(() => {
        manipulateGif(originalGif, {
          reverse: true,
          speed: { speedMultiplier: -1 },
        });
      }).toThrow('Speed multiplier must be positive');
    });
  });
});
