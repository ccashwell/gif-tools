/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  GifWriter,
  ByteArrayOutputStream,
  MedianCutQuantizer,
  createStaticGif,
  createAnimatedGif,
  createSolidColorGif,
  createCheckerboardGif,
  createGradientGif,
  ImageData,
  IndexedImage,
  RGBColor,
  GifResult,
} from '../src/index';

describe('GIF Writer', () => {
  describe('ByteArrayOutputStream', () => {
    it('should write bytes correctly', () => {
      const stream = new ByteArrayOutputStream();
      stream.writeByte(0x47);
      stream.writeByte(0x49);
      stream.writeByte(0x46);

      const result = stream.toUint8Array();
      expect(result).toEqual(new Uint8Array([0x47, 0x49, 0x46]));
    });

    it('should write byte arrays correctly', () => {
      const stream = new ByteArrayOutputStream();
      stream.writeBytes(new Uint8Array([1, 2, 3]));
      stream.writeBytes([4, 5, 6]);

      const result = stream.toUint8Array();
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it('should validate byte values', () => {
      const stream = new ByteArrayOutputStream();
      expect(() => stream.writeByte(-1)).toThrow();
      expect(() => stream.writeByte(256)).toThrow();
      expect(() => stream.writeByte(1.5)).toThrow();
    });
  });

  describe('GifWriter', () => {
    it('should write a basic static GIF', () => {
      const indexedImage: IndexedImage = {
        width: 2,
        height: 2,
        data: new Uint8Array([0, 1, 1, 0]),
        palette: new Uint8Array([255, 0, 0, 0, 255, 0]), // Red, Green
      };

      const writer = new GifWriter();
      writer.writeStaticGif(indexedImage);

      const result = writer.toUint8Array();

      // Check GIF signature
      expect(result[0]).toBe(0x47); // 'G'
      expect(result[1]).toBe(0x49); // 'I'
      expect(result[2]).toBe(0x46); // 'F'

      // Check version
      expect(result[3]).toBe(0x38); // '8'
      expect(result[4]).toBe(0x39); // '9'
      expect(result[5]).toBe(0x61); // 'a'

      // Check trailer at the end
      expect(result[result.length - 1]).toBe(0x3b);
    });

    it('should write animated GIF with multiple frames', () => {
      const frame1: IndexedImage = {
        width: 2,
        height: 2,
        data: new Uint8Array([0, 0, 0, 0]),
        palette: new Uint8Array([255, 0, 0]), // Red
      };

      const frame2: IndexedImage = {
        width: 2,
        height: 2,
        data: new Uint8Array([0, 0, 0, 0]),
        palette: new Uint8Array([0, 255, 0]), // Green
      };

      const writer = new GifWriter();
      writer.writeAnimatedGif([frame1, frame2], {}, { loops: 0 }, [
        { delay: 100 },
        { delay: 100 },
      ]);

      const result = writer.toUint8Array();
      expect(result.length).toBeGreaterThan(50); // Should be substantial
      expect(result[result.length - 1]).toBe(0x3b); // Trailer
    });

    it('should handle transparency', () => {
      const indexedImage: IndexedImage = {
        width: 2,
        height: 2,
        data: new Uint8Array([0, 1, 1, 0]),
        palette: new Uint8Array([255, 0, 0, 0, 255, 0]),
      };

      const writer = new GifWriter();
      writer.writeStaticGif(indexedImage, {}, { transparentIndex: 0 });

      const result = writer.toUint8Array();
      expect(result.length).toBeGreaterThan(20);
    });
  });

  describe('MedianCutQuantizer', () => {
    it('should quantize colors correctly', () => {
      const imageData: ImageData = {
        width: 2,
        height: 2,
        data: new Uint8Array([
          255,
          0,
          0,
          255, // Red
          0,
          255,
          0,
          255, // Green
          0,
          0,
          255,
          255, // Blue
          255,
          255,
          0,
          255, // Yellow
        ]),
      };

      const quantizer = new MedianCutQuantizer(4);
      const result = quantizer.quantize(imageData);

      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.data.length).toBe(4);
      expect(result.palette.length).toBe(12); // 4 colors * 3 components
    });

    it('should handle single color images', () => {
      const imageData: ImageData = {
        width: 2,
        height: 2,
        data: new Uint8Array([
          255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255,
        ]),
      };

      const quantizer = new MedianCutQuantizer(256);
      const result = quantizer.quantize(imageData);

      expect(result.palette.length).toBe(3); // Single color
      expect(Array.from(result.data)).toEqual([0, 0, 0, 0]);
    });
  });

  describe('Helper Functions', () => {
    it('should create solid color GIF', () => {
      const color: RGBColor = { red: 255, green: 0, blue: 0 };
      const gif = createSolidColorGif(10, 10, color);

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(20);

      // Check GIF signature
      const data = gif.toUint8Array();
      expect(data[0]).toBe(0x47);
      expect(data[1]).toBe(0x49);
      expect(data[2]).toBe(0x46);
    });

    it('should create checkerboard GIF', () => {
      const color1: RGBColor = { red: 255, green: 0, blue: 0 };
      const color2: RGBColor = { red: 0, green: 255, blue: 0 };
      const gif = createCheckerboardGif(20, 20, color1, color2, 5);

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(50);
    });

    it('should create gradient GIF', () => {
      const startColor: RGBColor = { red: 255, green: 0, blue: 0 };
      const endColor: RGBColor = { red: 0, green: 0, blue: 255 };
      const gif = createGradientGif(50, 20, startColor, endColor, 'horizontal');

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(100);
    });

    it('should create static GIF from ImageData', () => {
      const imageData: ImageData = {
        width: 10,
        height: 10,
        data: new Uint8Array(400).fill(128), // Fill with gray
      };

      const gif = createStaticGif(imageData);

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(30);
    });

    it('should create animated GIF from multiple frames', () => {
      const frame1: ImageData = {
        width: 5,
        height: 5,
        data: new Uint8Array(100).fill(255), // White
      };

      const frame2: ImageData = {
        width: 5,
        height: 5,
        data: new Uint8Array(100).fill(0), // Black
      };

      const gif = createAnimatedGif([frame1, frame2], {
        delay: 500,
        loops: 3,
      });

      expect(gif).toBeInstanceOf(GifResult);
      expect(gif.size).toBeGreaterThan(80);
    });
  });

  describe('Error Handling', () => {
    it('should validate image dimensions', () => {
      const writer = new GifWriter();
      expect(() => {
        writer.writeLogicalScreen(0, 10);
      }).toThrow();

      expect(() => {
        writer.writeLogicalScreen(70000, 10);
      }).toThrow();
    });

    it('should validate color values', () => {
      expect(() => {
        createSolidColorGif(10, 10, { red: -1, green: 0, blue: 0 });
      }).toThrow();

      expect(() => {
        createSolidColorGif(10, 10, { red: 0, green: 256, blue: 0 });
      }).toThrow();
    });

    it('should validate empty animation frames', () => {
      expect(() => {
        createAnimatedGif([]);
      }).toThrow();
    });

    it('should validate quantizer parameters', () => {
      expect(() => {
        new MedianCutQuantizer(0);
      }).toThrow();

      expect(() => {
        new MedianCutQuantizer(300);
      }).toThrow();
    });
  });

  describe('Writer State Management', () => {
    it('should enforce proper writing order', () => {
      const writer = new GifWriter();
      const indexedImage: IndexedImage = {
        width: 2,
        height: 2,
        data: new Uint8Array([0, 0, 0, 0]),
        palette: new Uint8Array([255, 0, 0]),
      };

      // Should not allow writing image before header and logical screen
      expect(() => {
        writer.writeImage(indexedImage);
      }).toThrow();

      // Should not allow writing logical screen before header
      expect(() => {
        writer.writeLogicalScreen(2, 2);
      }).toThrow();

      // Proper order should work
      expect(() => {
        writer
          .writeHeader()
          .writeLogicalScreen(2, 2)
          .writeImage(indexedImage)
          .writeTrailer();
      }).not.toThrow();
    });

    it('should prevent duplicate operations', () => {
      const writer = new GifWriter();

      writer.writeHeader();
      expect(() => {
        writer.writeHeader();
      }).toThrow();

      writer.writeLogicalScreen(2, 2);
      expect(() => {
        writer.writeLogicalScreen(2, 2);
      }).toThrow();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work without Buffer (browser environment)', () => {
      // Temporarily hide Buffer to simulate browser environment
      const originalBuffer = (globalThis as any).Buffer;
      delete (globalThis as any).Buffer;

      try {
        const stream = new ByteArrayOutputStream();
        stream.writeByte(0x47);
        stream.writeByte(0x49);
        stream.writeByte(0x46);

        // toBuffer should fallback to Uint8Array when Buffer is not available
        const result = stream.toBuffer();
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(new Uint8Array([0x47, 0x49, 0x46]));

        // toUint8Array should always work
        const uintResult = stream.toUint8Array();
        expect(uintResult).toBeInstanceOf(Uint8Array);
        expect(uintResult).toEqual(new Uint8Array([0x47, 0x49, 0x46]));
      } finally {
        // Restore Buffer if it existed
        if (originalBuffer) {
          (globalThis as any).Buffer = originalBuffer;
        }
      }
    });

    it('should create GIFs in browser-like environment', () => {
      // Temporarily hide Buffer to simulate browser environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalBuffer = (globalThis as any).Buffer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).Buffer;

      try {
        const color: RGBColor = { red: 255, green: 0, blue: 0 };
        const gif = createSolidColorGif(10, 10, color);

        expect(gif).toBeInstanceOf(GifResult);
        expect(gif.size).toBeGreaterThan(20);

        // Check GIF signature works without Buffer
        const data = gif.toUint8Array();
        expect(data[0]).toBe(0x47);
        expect(data[1]).toBe(0x49);
        expect(data[2]).toBe(0x46);
      } finally {
        // Restore Buffer if it existed
        if (originalBuffer) {
          (globalThis as any).Buffer = originalBuffer;
        }
      }
    });
  });
});
