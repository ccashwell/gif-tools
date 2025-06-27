import {
  ImageData,
  GifReader,
  readGifInfo,
  isValidGif,
  createSolidColorGif,
  createAnimatedGif,
  createImageData,
} from '../src';

describe('GifReader', () => {
  let testGifData: Uint8Array;
  let animatedGifData: Uint8Array;

  beforeAll(() => {
    // Create test GIF data
    const staticGif = createSolidColorGif(10, 10, {
      red: 255,
      green: 0,
      blue: 0,
    });
    testGifData = staticGif.toUint8Array();

    // Create animated GIF data
    const frame1 = createImageData(5, 5, new Uint8Array(100).fill(255));
    const frame2 = createImageData(5, 5, new Uint8Array(100).fill(0));
    const animatedGif = createAnimatedGif([frame1, frame2], { delay: 100 });
    animatedGifData = animatedGif.toUint8Array();
  });

  describe('constructor and validation', () => {
    it('should create GifReader with valid GIF data', () => {
      expect(() => new GifReader(testGifData)).not.toThrow();
    });

    it('should throw error for invalid GIF data', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5, 6]);
      expect(() => new GifReader(invalidData)).toThrow('Invalid GIF signature');
    });

    it('should throw error for too short data', () => {
      const shortData = new Uint8Array([1, 2, 3]);
      expect(() => new GifReader(shortData)).toThrow('Invalid GIF: too short');
    });
  });

  describe('parsing GIF info', () => {
    it('should parse basic GIF info', () => {
      const reader = new GifReader(testGifData);
      const info = reader.getInfo();

      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);
      expect(info.frameCount).toBeGreaterThan(0);
      expect(info.size).toBe(testGifData.length);
      expect(info.version).toMatch(/^8[79]a$/);
    });

    it('should detect static vs animated GIFs', () => {
      const staticReader = new GifReader(testGifData);
      const animatedReader = new GifReader(animatedGifData);

      expect(staticReader.isAnimated()).toBe(false);
      expect(animatedReader.isAnimated()).toBe(true);
    });

    it('should parse animated GIF properties', () => {
      const reader = new GifReader(animatedGifData);
      const info = reader.getInfo();

      expect(info.frameCount).toBeGreaterThan(1);
      expect(info.duration).toBeGreaterThan(0);
    });
  });

  describe('color extraction', () => {
    it('should extract dominant colors', () => {
      const reader = new GifReader(testGifData);
      const colors = reader.getDominantColors(3);

      expect(Array.isArray(colors)).toBe(true);
      // Colors array might be empty if no global color table
      if (colors.length > 0) {
        expect(colors[0]).toHaveProperty('red');
        expect(colors[0]).toHaveProperty('green');
        expect(colors[0]).toHaveProperty('blue');
      }
    });
  });

  describe('frame extraction', () => {
    it('should extract frames from static GIF', () => {
      const reader = new GifReader(testGifData);
      const frames = reader.getFrames();

      expect(Array.isArray(frames)).toBe(true);
      expect(frames.length).toBe(1);

      const frame = frames[0];
      expect(frame).toHaveProperty('imageData');
      expect(frame).toHaveProperty('delay');
      expect(frame).toHaveProperty('disposal');
      expect(frame).toHaveProperty('left');
      expect(frame).toHaveProperty('top');
      expect(frame).toHaveProperty('transparentIndex');

      expect(frame.imageData.width).toBeGreaterThan(0);
      expect(frame.imageData.height).toBeGreaterThan(0);
      expect(frame.delay).toBeGreaterThanOrEqual(0);
    });

    it('should extract frames from animated GIF', () => {
      const reader = new GifReader(animatedGifData);
      const frames = reader.getFrames();

      expect(frames.length).toBeGreaterThan(1);

      frames.forEach(frame => {
        expect(frame.imageData.width).toBeGreaterThan(0);
        expect(frame.imageData.height).toBeGreaterThan(0);
        expect(frame.delay).toBeGreaterThanOrEqual(0);
        expect(typeof frame.left).toBe('number');
        expect(typeof frame.top).toBe('number');
        expect(typeof frame.transparentIndex).toBe('number');
      });
    });

    it('should handle extraction errors gracefully', () => {
      // Create a minimally valid GIF that might have parsing issues
      const reader = new GifReader(testGifData);
      expect(() => reader.getFrames()).not.toThrow();
    });
  });

  describe('metadata parsing', () => {
    it('should parse metadata from GIF', () => {
      const reader = new GifReader(testGifData);
      const info = reader.getInfo();

      expect(info.metadata).toBeDefined();
      expect(info.metadata).toHaveProperty('extensions');
      expect(info.metadata).toHaveProperty('comments');
      expect(info.metadata).toHaveProperty('hasInterlacedFrames');
      expect(info.metadata).toHaveProperty('hasLocalColorTables');
      expect(info.metadata).toHaveProperty('hasTransparency');
      expect(info.metadata).toHaveProperty('technicalDetails');

      expect(Array.isArray(info.metadata.extensions)).toBe(true);
      expect(Array.isArray(info.metadata.comments)).toBe(true);
      expect(typeof info.metadata.hasInterlacedFrames).toBe('boolean');
      expect(typeof info.metadata.hasLocalColorTables).toBe('boolean');
      expect(typeof info.metadata.hasTransparency).toBe('boolean');

      expect(info.metadata.technicalDetails).toHaveProperty('totalDataSize');
      expect(info.metadata.technicalDetails).toHaveProperty('averageFrameSize');
      expect(info.metadata.technicalDetails.totalDataSize).toBeGreaterThan(0);
      expect(info.metadata.technicalDetails.averageFrameSize).toBeGreaterThan(
        0
      );
    });

    it('should detect Netscape animation extensions', () => {
      const reader = new GifReader(animatedGifData);
      const info = reader.getInfo();

      // Animated GIFs should have Netscape extension
      expect(
        info.metadata.extensions.some(ext => ext.includes('Netscape'))
      ).toBe(true);
    });

    it('should handle GIFs without metadata gracefully', () => {
      const reader = new GifReader(testGifData);
      const info = reader.getInfo();

      // Should have empty arrays for no metadata, not undefined
      expect(info.metadata.extensions).toBeDefined();
      expect(info.metadata.comments).toBeDefined();
    });
  });
});

describe('convenience functions', () => {
  let testGifData: Uint8Array;

  beforeAll(() => {
    const gif = createSolidColorGif(10, 10, { red: 255, green: 0, blue: 0 });
    testGifData = gif.toUint8Array();
  });

  describe('readGifInfo', () => {
    it('should read GIF info from buffer', () => {
      const info = readGifInfo(testGifData);

      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);
      expect(info.size).toBe(testGifData.length);
    });
  });

  describe('isValidGif', () => {
    it('should return true for valid GIF', () => {
      expect(isValidGif(testGifData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5, 6]);
      expect(isValidGif(invalidData)).toBe(false);
    });

    it('should return false for empty data', () => {
      const emptyData = new Uint8Array(0);
      expect(isValidGif(emptyData)).toBe(false);
    });
  });
});
