/**
 * Tests for utility functions
 */

import {
  validateDimensions,
  validateColorIntensity,
  validateRGBColor,
  validatePalette,
  calculateColorTableSize,
  padColorTable,
  write16BitLE,
  clamp,
  msToGifDelay,
  gifDelayToMs,
  createColor,
  colorDistanceSquared,
  findClosestColorIndex,
  paletteToColors,
  colorsToPalette,
} from '../src/utils';
import { GifValidationError } from '../src/types';

describe('Utils', () => {
  describe('validateDimensions', () => {
    it('should accept valid dimensions', () => {
      expect(() =>
        validateDimensions({ width: 100, height: 100 })
      ).not.toThrow();
      expect(() => validateDimensions({ width: 1, height: 1 })).not.toThrow();
      expect(() =>
        validateDimensions({ width: 65535, height: 65535 })
      ).not.toThrow();
    });

    it('should reject invalid width', () => {
      expect(() => validateDimensions({ width: 0, height: 100 })).toThrow(
        GifValidationError
      );
      expect(() => validateDimensions({ width: -1, height: 100 })).toThrow(
        GifValidationError
      );
      expect(() => validateDimensions({ width: 65536, height: 100 })).toThrow(
        GifValidationError
      );
      expect(() => validateDimensions({ width: 1.5, height: 100 })).toThrow(
        GifValidationError
      );
    });

    it('should reject invalid height', () => {
      expect(() => validateDimensions({ width: 100, height: 0 })).toThrow(
        GifValidationError
      );
      expect(() => validateDimensions({ width: 100, height: -1 })).toThrow(
        GifValidationError
      );
      expect(() => validateDimensions({ width: 100, height: 65536 })).toThrow(
        GifValidationError
      );
      expect(() => validateDimensions({ width: 100, height: 1.5 })).toThrow(
        GifValidationError
      );
    });
  });

  describe('validateColorIntensity', () => {
    it('should accept valid color values', () => {
      expect(() => validateColorIntensity(0)).not.toThrow();
      expect(() => validateColorIntensity(128)).not.toThrow();
      expect(() => validateColorIntensity(255)).not.toThrow();
    });

    it('should reject invalid color values', () => {
      expect(() => validateColorIntensity(-1)).toThrow(GifValidationError);
      expect(() => validateColorIntensity(256)).toThrow(GifValidationError);
      expect(() => validateColorIntensity(1.5)).toThrow(GifValidationError);
      expect(() => validateColorIntensity(NaN)).toThrow(GifValidationError);
      expect(() => validateColorIntensity(Infinity)).toThrow(
        GifValidationError
      );
    });

    it('should use custom name in error message', () => {
      expect(() => validateColorIntensity(-1, 'blue')).toThrow(
        'Invalid blue: -1'
      );
    });
  });

  describe('validateRGBColor', () => {
    it('should accept valid colors', () => {
      expect(() =>
        validateRGBColor({ red: 255, green: 128, blue: 0 })
      ).not.toThrow();
      expect(() =>
        validateRGBColor({ red: 0, green: 0, blue: 0 })
      ).not.toThrow();
      expect(() =>
        validateRGBColor({ red: 255, green: 255, blue: 255 })
      ).not.toThrow();
    });

    it('should reject invalid red values', () => {
      expect(() => validateRGBColor({ red: -1, green: 128, blue: 0 })).toThrow(
        GifValidationError
      );
      expect(() => validateRGBColor({ red: 256, green: 128, blue: 0 })).toThrow(
        GifValidationError
      );
    });

    it('should reject invalid green values', () => {
      expect(() => validateRGBColor({ red: 128, green: -1, blue: 0 })).toThrow(
        GifValidationError
      );
      expect(() => validateRGBColor({ red: 128, green: 256, blue: 0 })).toThrow(
        GifValidationError
      );
    });

    it('should reject invalid blue values', () => {
      expect(() =>
        validateRGBColor({ red: 128, green: 128, blue: -1 })
      ).toThrow(GifValidationError);
      expect(() =>
        validateRGBColor({ red: 128, green: 128, blue: 256 })
      ).toThrow(GifValidationError);
    });
  });

  describe('validatePalette', () => {
    it('should accept valid palettes', () => {
      expect(() => validatePalette(new Uint8Array([255, 0, 0]))).not.toThrow(); // 1 color
      expect(() =>
        validatePalette(new Uint8Array([255, 0, 0, 0, 255, 0]))
      ).not.toThrow(); // 2 colors
    });

    it('should reject empty palette', () => {
      expect(() => validatePalette(new Uint8Array([]))).toThrow(
        GifValidationError
      );
    });

    it('should reject palette with incomplete RGB triplets', () => {
      expect(() => validatePalette(new Uint8Array([255]))).toThrow(
        GifValidationError
      );
      expect(() => validatePalette(new Uint8Array([255, 0]))).toThrow(
        GifValidationError
      );
      expect(() => validatePalette(new Uint8Array([255, 0, 0, 128]))).toThrow(
        GifValidationError
      );
    });

    it('should reject palette with too many colors', () => {
      const largePalette = new Uint8Array(257 * 3); // 257 colors > 256 max
      expect(() => validatePalette(largePalette)).toThrow(GifValidationError);
    });
  });

  describe('calculateColorTableSize', () => {
    it('should calculate correct sizes for power-of-2 values', () => {
      expect(calculateColorTableSize(1)).toBe(0); // 2^0 = 1
      expect(calculateColorTableSize(2)).toBe(0); // 2^0 = 2
      expect(calculateColorTableSize(3)).toBe(1); // 2^1 = 4
      expect(calculateColorTableSize(4)).toBe(1); // 2^1 = 4
      expect(calculateColorTableSize(5)).toBe(2); // 2^2 = 8
      expect(calculateColorTableSize(16)).toBe(3); // 2^3 = 16
      expect(calculateColorTableSize(32)).toBe(4); // 2^4 = 32
      expect(calculateColorTableSize(64)).toBe(5); // 2^5 = 64
      expect(calculateColorTableSize(128)).toBe(6); // 2^6 = 128
      expect(calculateColorTableSize(256)).toBe(7); // 2^7 = 256
    });

    it('should reject invalid color counts', () => {
      expect(() => calculateColorTableSize(0)).toThrow(GifValidationError);
      expect(() => calculateColorTableSize(-1)).toThrow(GifValidationError);
      expect(() => calculateColorTableSize(257)).toThrow(GifValidationError);
    });
  });

  describe('padColorTable', () => {
    it('should pad palette to required size', () => {
      const palette = new Uint8Array([255, 0, 0]); // 1 color
      const padded = padColorTable(palette, 1); // Required size 1 = 4 colors
      expect(padded.length).toBe(4 * 3); // 4 colors * 3 bytes each
      expect(padded.slice(0, 3)).toEqual(new Uint8Array([255, 0, 0]));
      expect(padded.slice(3)).toEqual(new Uint8Array(9)); // Rest should be zeros
    });

    it('should return original palette if already large enough', () => {
      const palette = new Uint8Array([
        255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 128,
      ]); // 4 colors
      const result = padColorTable(palette, 1); // Required size 1 = 4 colors
      expect(result).toBe(palette); // Should return same reference
    });

    it('should handle edge cases', () => {
      const palette = new Uint8Array([255, 0, 0, 0, 255, 0]); // 2 colors
      const padded = padColorTable(palette, 2); // Required size 2 = 8 colors
      expect(padded.length).toBe(8 * 3); // 8 colors * 3 bytes each
      expect(padded.slice(0, 6)).toEqual(palette);
    });
  });

  describe('write16BitLE', () => {
    it('should write 16-bit little-endian values correctly', () => {
      expect(write16BitLE(0)).toEqual(new Uint8Array([0, 0]));
      expect(write16BitLE(1)).toEqual(new Uint8Array([1, 0]));
      expect(write16BitLE(256)).toEqual(new Uint8Array([0, 1]));
      expect(write16BitLE(257)).toEqual(new Uint8Array([1, 1]));
      expect(write16BitLE(65535)).toEqual(new Uint8Array([255, 255]));
    });

    it('should reject invalid values', () => {
      expect(() => write16BitLE(-1)).toThrow(GifValidationError);
      expect(() => write16BitLE(65536)).toThrow(GifValidationError);
      expect(() => write16BitLE(1.5)).toThrow(GifValidationError);
      expect(() => write16BitLE(NaN)).toThrow(GifValidationError);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(5, 5, 5)).toBe(5);
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(-0.5, -1, 1)).toBe(-0.5);
    });
  });

  describe('msToGifDelay', () => {
    it('should convert milliseconds to GIF delay units', () => {
      expect(msToGifDelay(0)).toBe(0);
      expect(msToGifDelay(10)).toBe(1);
      expect(msToGifDelay(100)).toBe(10);
      expect(msToGifDelay(1000)).toBe(100);
      expect(msToGifDelay(15)).toBe(2); // Rounds to 2
    });

    it('should handle negative values', () => {
      expect(msToGifDelay(-100)).toBe(0);
    });
  });

  describe('gifDelayToMs', () => {
    it('should convert GIF delay units to milliseconds', () => {
      expect(gifDelayToMs(0)).toBe(0);
      expect(gifDelayToMs(1)).toBe(10);
      expect(gifDelayToMs(10)).toBe(100);
      expect(gifDelayToMs(100)).toBe(1000);
    });
  });

  describe('createColor', () => {
    it('should create valid colors', () => {
      const color = createColor(255, 128, 0);
      expect(color).toEqual({ red: 255, green: 128, blue: 0 });
    });

    it('should validate color values', () => {
      expect(() => createColor(-1, 128, 0)).toThrow(GifValidationError);
      expect(() => createColor(255, 256, 0)).toThrow(GifValidationError);
      expect(() => createColor(255, 128, 1.5)).toThrow(GifValidationError);
    });
  });

  describe('colorDistanceSquared', () => {
    it('should calculate color distance correctly', () => {
      const black = { red: 0, green: 0, blue: 0 };
      const white = { red: 255, green: 255, blue: 255 };
      const red = { red: 255, green: 0, blue: 0 };

      expect(colorDistanceSquared(black, black)).toBe(0);
      expect(colorDistanceSquared(white, white)).toBe(0);
      expect(colorDistanceSquared(black, white)).toBe(255 * 255 * 3); // 195075
      expect(colorDistanceSquared(black, red)).toBe(255 * 255); // 65025
    });
  });

  describe('findClosestColorIndex', () => {
    const palette = [
      { red: 0, green: 0, blue: 0 }, // black
      { red: 255, green: 0, blue: 0 }, // red
      { red: 0, green: 255, blue: 0 }, // green
      { red: 255, green: 255, blue: 255 }, // white
    ];

    it('should find exact matches', () => {
      expect(
        findClosestColorIndex({ red: 0, green: 0, blue: 0 }, palette)
      ).toBe(0);
      expect(
        findClosestColorIndex({ red: 255, green: 0, blue: 0 }, palette)
      ).toBe(1);
      expect(
        findClosestColorIndex({ red: 0, green: 255, blue: 0 }, palette)
      ).toBe(2);
      expect(
        findClosestColorIndex({ red: 255, green: 255, blue: 255 }, palette)
      ).toBe(3);
    });

    it('should find closest matches', () => {
      expect(
        findClosestColorIndex({ red: 10, green: 10, blue: 10 }, palette)
      ).toBe(0); // Closest to black
      expect(
        findClosestColorIndex({ red: 200, green: 50, blue: 50 }, palette)
      ).toBe(1); // Closest to red
      expect(
        findClosestColorIndex({ red: 200, green: 200, blue: 200 }, palette)
      ).toBe(3); // Closest to white
    });

    it('should reject empty palette', () => {
      expect(() =>
        findClosestColorIndex({ red: 0, green: 0, blue: 0 }, [])
      ).toThrow(GifValidationError);
    });

    it('should handle single color palette', () => {
      const singlePalette = [{ red: 128, green: 128, blue: 128 }];
      expect(
        findClosestColorIndex({ red: 0, green: 0, blue: 0 }, singlePalette)
      ).toBe(0);
      expect(
        findClosestColorIndex(
          { red: 255, green: 255, blue: 255 },
          singlePalette
        )
      ).toBe(0);
    });
  });

  describe('paletteToColors', () => {
    it('should convert palette to colors array', () => {
      const palette = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]);
      const colors = paletteToColors(palette);
      expect(colors).toEqual([
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 255, blue: 0 },
        { red: 0, green: 0, blue: 255 },
      ]);
    });

    it('should validate palette before conversion', () => {
      const invalidPalette = new Uint8Array([255, 0]); // Incomplete RGB triplet
      expect(() => paletteToColors(invalidPalette)).toThrow(GifValidationError);
    });

    it('should handle empty valid palette', () => {
      const emptyPalette = new Uint8Array([255, 0, 0]); // Minimal valid palette
      const colors = paletteToColors(emptyPalette);
      expect(colors).toEqual([{ red: 255, green: 0, blue: 0 }]);
    });
  });

  describe('colorsToPalette', () => {
    it('should convert colors array to palette', () => {
      const colors = [
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 255, blue: 0 },
        { red: 0, green: 0, blue: 255 },
      ];
      const palette = colorsToPalette(colors);
      expect(palette).toEqual(
        new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255])
      );
    });

    it('should validate colors before conversion', () => {
      const invalidColors = [{ red: -1, green: 0, blue: 0 }];
      expect(() => colorsToPalette(invalidColors)).toThrow(GifValidationError);
    });

    it('should handle empty colors array', () => {
      const palette = colorsToPalette([]);
      expect(palette).toEqual(new Uint8Array([]));
    });

    it('should handle single color', () => {
      const colors = [{ red: 128, green: 64, blue: 192 }];
      const palette = colorsToPalette(colors);
      expect(palette).toEqual(new Uint8Array([128, 64, 192]));
    });
  });
});
