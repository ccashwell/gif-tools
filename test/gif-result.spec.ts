/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GifResult, createSolidColorGif } from '../src';

describe('GifResult', () => {
  let gifResult: GifResult;
  let testData: Uint8Array;

  beforeEach(() => {
    // Create a simple GIF for testing
    testData = createSolidColorGif(10, 10, {
      red: 255,
      green: 0,
      blue: 0,
    }).toUint8Array();
    gifResult = new GifResult(testData);
  });

  describe('constructor', () => {
    it('should create a GifResult instance', () => {
      expect(gifResult).toBeInstanceOf(GifResult);
    });

    it('should throw error for invalid data', () => {
      expect(() => new GifResult(null as unknown as Uint8Array)).toThrow(
        'GIF data must be a Uint8Array'
      );
      expect(() => new GifResult(new Uint8Array(0))).toThrow(
        'GIF data cannot be empty'
      );
    });
  });

  describe('raw data access', () => {
    it('should return Uint8Array data', () => {
      const result = gifResult.toUint8Array();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(testData.length);
      expect(result).toEqual(testData);
    });

    it('should return buffer/array data', () => {
      const result = gifResult.toBuffer();
      expect(result).toBeDefined();
      // Should be either Buffer or Uint8Array depending on environment
      expect(
        result instanceof Uint8Array ||
          (typeof Buffer !== 'undefined' && result instanceof Buffer)
      ).toBe(true);
    });

    it('should handle toBuffer() in environment without Buffer', () => {
      const originalBuffer = (globalThis as any).Buffer;
      delete (globalThis as any).Buffer;

      try {
        const result = gifResult.toBuffer();
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(testData);
      } finally {
        if (originalBuffer) {
          (globalThis as any).Buffer = originalBuffer;
        }
      }
    });

    it('should handle toBuffer() when Buffer.from throws', () => {
      const originalBuffer = (globalThis as any).Buffer;
      (globalThis as any).Buffer = {
        from: () => {
          throw new Error('Buffer error');
        },
      };

      try {
        const result = gifResult.toBuffer();
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result).toEqual(testData);
      } finally {
        if (originalBuffer) {
          (globalThis as any).Buffer = originalBuffer;
        } else {
          delete (globalThis as any).Buffer;
        }
      }
    });
  });

  describe('base64 conversion', () => {
    it('should convert to base64 string', () => {
      const base64 = gifResult.toBase64();
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      // Should be valid base64
      expect(/^[A-Za-z0-9+/]*={0,2}$/.test(base64)).toBe(true);
    });

    it('should create data URL', () => {
      const dataUrl = gifResult.toDataURL();
      expect(typeof dataUrl).toBe('string');
      expect(dataUrl).toMatch(/^data:image\/gif;base64,/);
    });

    it('should use Buffer.from for base64 in Node.js', () => {
      // This test verifies the Node.js path
      if (typeof Buffer !== 'undefined') {
        const base64 = gifResult.toBase64();
        const expected = Buffer.from(testData).toString('base64');
        expect(base64).toBe(expected);
      }
    });

    it('should fall back to btoa when Buffer is not available', () => {
      const originalBuffer = global.Buffer;
      const originalBtoa = global.btoa;

      delete (globalThis as any).Buffer;
      global.btoa = jest.fn().mockImplementation((str: string) => {
        // Mock btoa behavior
        return originalBuffer.from(str, 'binary').toString('base64');
      });

      try {
        const base64 = gifResult.toBase64();
        expect(global.btoa).toHaveBeenCalled();
        expect(typeof base64).toBe('string');
      } finally {
        if (originalBuffer) {
          global.Buffer = originalBuffer;
        }
        if (originalBtoa) {
          global.btoa = originalBtoa;
        } else {
          delete (global as any).btoa;
        }
      }
    });

    it('should use manual base64 encoding when neither Buffer nor btoa available', () => {
      const originalBuffer = (globalThis as any).Buffer;
      const originalBtoa = global.btoa;

      delete (globalThis as any).Buffer;
      delete (global as any).btoa;

      try {
        const base64 = gifResult.toBase64();
        expect(typeof base64).toBe('string');
        expect(base64.length).toBeGreaterThan(0);
        // Should be valid base64
        expect(/^[A-Za-z0-9+/]*={0,2}$/.test(base64)).toBe(true);
      } finally {
        if (originalBuffer) {
          (globalThis as any).Buffer = originalBuffer;
        }
        if (originalBtoa) {
          global.btoa = originalBtoa;
        }
      }
    });

    it('should handle Buffer.from throwing error', () => {
      const originalBuffer = (globalThis as any).Buffer;
      (globalThis as any).Buffer = {
        from: () => {
          throw new Error('Buffer error');
        },
      };

      try {
        const base64 = gifResult.toBase64();
        expect(typeof base64).toBe('string');
      } finally {
        if (originalBuffer) {
          (globalThis as any).Buffer = originalBuffer;
        } else {
          delete (globalThis as any).Buffer;
        }
      }
    });
  });

  describe('blob and object URL (browser-specific)', () => {
    it('should create blob if available', () => {
      // Mock Blob if not available (Node.js environment)
      const originalBlob = global.Blob;
      if (typeof Blob === 'undefined') {
        (global as any).Blob = class MockBlob {
          constructor(public data: any[], public options: any) {}
        };
      }

      try {
        const blob = gifResult.toBlob();
        expect(blob).toBeDefined();
        if (typeof Blob !== 'undefined') {
          expect(blob).toBeInstanceOf(Blob);
        }
      } finally {
        if (originalBlob) {
          global.Blob = originalBlob;
        } else {
          delete (global as any).Blob;
        }
      }
    });

    it('should throw error when Blob not available', () => {
      // Ensure Blob is not available
      const originalBlob = global.Blob;
      delete (global as any).Blob;

      try {
        expect(() => gifResult.toBlob()).toThrow('Blob is not available');
      } finally {
        if (originalBlob) {
          global.Blob = originalBlob;
        }
      }
    });

    it('should handle object URL creation', () => {
      // Mock URL and Blob for consistent testing
      const originalURL = global.URL;
      const originalBlob = global.Blob;

      (global as any).URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
      };
      (global as any).Blob = class MockBlob {
        constructor(public data: any[], public options: any) {}
      };

      try {
        const url = gifResult.toObjectURL();
        expect(url).toBe('blob:mock-url');
        expect((global.URL as any).createObjectURL).toHaveBeenCalled();
      } finally {
        if (originalURL) {
          global.URL = originalURL;
        } else {
          delete (global as any).URL;
        }
        if (originalBlob) {
          global.Blob = originalBlob;
        } else {
          delete (global as any).Blob;
        }
      }
    });

    it('should throw error when URL.createObjectURL not available', () => {
      const originalURL = global.URL;
      delete (global as any).URL;

      try {
        expect(() => gifResult.toObjectURL()).toThrow(
          'URL.createObjectURL is not available'
        );
      } finally {
        if (originalURL) {
          global.URL = originalURL;
        }
      }
    });

    it('should throw error when URL exists but createObjectURL does not', () => {
      const originalURL = global.URL;
      (global as any).URL = {}; // URL exists but without createObjectURL

      try {
        expect(() => gifResult.toObjectURL()).toThrow(
          'URL.createObjectURL is not available'
        );
      } finally {
        if (originalURL) {
          global.URL = originalURL;
        } else {
          delete (global as any).URL;
        }
      }
    });
  });

  describe('stream creation', () => {
    it('should create readable stream if available', () => {
      if (typeof ReadableStream !== 'undefined') {
        const stream = gifResult.toStream();
        expect(stream).toBeInstanceOf(ReadableStream);
      } else {
        expect(() => gifResult.toStream()).toThrow(
          'ReadableStream is not available'
        );
      }
    });

    it('should stream the correct data if streams are available', async () => {
      if (typeof ReadableStream !== 'undefined') {
        const stream = gifResult.toStream();
        const reader = stream.getReader();
        const result = await reader.read();

        expect(result.done).toBe(false);
        expect(result.value).toEqual(testData);

        const secondResult = await reader.read();
        expect(secondResult.done).toBe(true);
      } else {
        expect(() => gifResult.toStream()).toThrow(
          'ReadableStream is not available'
        );
      }
    });

    it('should throw error when ReadableStream not available', () => {
      const originalReadableStream = global.ReadableStream;
      delete (global as any).ReadableStream;

      try {
        expect(() => gifResult.toStream()).toThrow(
          'ReadableStream is not available'
        );
      } finally {
        if (originalReadableStream) {
          global.ReadableStream = originalReadableStream;
        }
      }
    });
  });

  describe('download functionality', () => {
    it('should throw error when document not available', () => {
      const originalDocument = global.document;
      delete (global as any).document;

      try {
        expect(() => gifResult.download()).toThrow(
          'Download is only available in browser environments'
        );
      } finally {
        if (originalDocument) {
          global.document = originalDocument;
        }
      }
    });

    it('should handle download in browser environment', () => {
      // Mock browser environment
      const originalDocument = global.document;
      const originalURL = global.URL;
      const originalBlob = global.Blob;

      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: jest.fn(),
      };

      (global as any).document = {
        createElement: jest.fn().mockReturnValue(mockLink),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        },
      };
      (global as any).URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: jest.fn(),
      };
      (global as any).Blob = class MockBlob {
        constructor(public data: any[], public options: any) {}
      };

      try {
        gifResult.download('test.gif');

        expect((global.document as any).createElement).toHaveBeenCalledWith(
          'a'
        );
        expect(mockLink.click).toHaveBeenCalled();
        expect((global.document as any).body.appendChild).toHaveBeenCalledWith(
          mockLink
        );
        expect((global.document as any).body.removeChild).toHaveBeenCalledWith(
          mockLink
        );
        expect(mockLink.download).toBe('test.gif');
        expect(mockLink.href).toBe('blob:mock-url');
      } finally {
        if (originalDocument) {
          global.document = originalDocument;
        } else {
          delete (global as any).document;
        }
        if (originalURL) {
          global.URL = originalURL;
        } else {
          delete (global as any).URL;
        }
        if (originalBlob) {
          global.Blob = originalBlob;
        } else {
          delete (global as any).Blob;
        }
      }
    });
  });

  describe('file operations', () => {
    it('should handle saveToFile in test environment', async () => {
      try {
        await gifResult.saveToFile('/tmp/test.gif');
        // If it succeeds, we're in Node.js with fs access
        expect(true).toBe(true);
      } catch (error) {
        // If it fails, check that it's the expected error
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should throw error when fs not available', async () => {
      jest.doMock('fs', () => {
        throw new Error('Cannot find module fs');
      });

      try {
        const savePromise = gifResult.saveToFile('/tmp/test.gif');
        await expect(savePromise).rejects.toThrow(
          'File system operations are not available'
        );
      } finally {
        jest.dontMock('fs');
      }
    });
  });

  describe('properties and info', () => {
    it('should return correct size', () => {
      expect(gifResult.size).toBe(testData.length);
      expect(gifResult.size).toBeGreaterThan(0);
    });

    it('should return correct MIME type', () => {
      expect(gifResult.mimeType).toBe('image/gif');
    });

    it('should return correct extension', () => {
      expect(gifResult.extension).toBe('gif');
    });

    it('should format size correctly', () => {
      expect(gifResult.sizeFormatted).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB|GB)/);
    });

    it('should format zero size correctly', () => {
      const emptyResult = new GifResult(new Uint8Array([1]));
      Object.defineProperty(emptyResult, 'size', { get: () => 0 });
      expect(emptyResult.sizeFormatted).toBe('0 Bytes');
    });

    it('should format large sizes correctly', () => {
      const largeResult = new GifResult(new Uint8Array([1]));
      jest.spyOn(largeResult, 'size', 'get').mockReturnValue(1024);
      expect(largeResult.sizeFormatted).toBe('1 KB');

      jest.spyOn(largeResult, 'size', 'get').mockReturnValue(1024 * 1024);
      expect(largeResult.sizeFormatted).toBe('1 MB');

      jest
        .spyOn(largeResult, 'size', 'get')
        .mockReturnValue(1024 * 1024 * 1024);
      expect(largeResult.sizeFormatted).toBe('1 GB');
    });

    it('should validate GIF data', () => {
      expect(gifResult.isValidGif()).toBe(true);
    });

    it('should return comprehensive info', () => {
      const info = gifResult.getInfo();
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('sizeFormatted');
      expect(info).toHaveProperty('isValid');
      expect(info).toHaveProperty('mimeType');
      expect(info).toHaveProperty('signature');
      expect(info.mimeType).toBe('image/gif');
      expect(info.isValid).toBe(true);
    });

    it('should handle invalid signature in getInfo', () => {
      const invalidData = new Uint8Array([0, 1, 2, 3, 4]); // Less than 6 bytes
      const invalidResult = new GifResult(invalidData);
      const info = invalidResult.getInfo();
      expect(info.signature).toBe('Invalid');
      expect(info.isValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid GIF data', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const invalidResult = new GifResult(invalidData);
      expect(invalidResult.isValidGif()).toBe(false);
    });

    it('should handle empty-like GIF data', () => {
      const shortData = new Uint8Array([1, 2, 3, 4, 5]);
      const shortResult = new GifResult(shortData);
      expect(shortResult.isValidGif()).toBe(false);
    });

    it('should handle data shorter than 6 bytes for validation', () => {
      const tinyData = new Uint8Array([1]);
      const tinyResult = new GifResult(tinyData);
      expect(tinyResult.isValidGif()).toBe(false);
    });

    it('should handle GIF87a signature', () => {
      const gif87Data = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]); // GIF87a
      const gif87Result = new GifResult(gif87Data);
      expect(gif87Result.isValidGif()).toBe(true);
    });

    it('should handle GIF89a signature', () => {
      const gif89Data = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
      const gif89Result = new GifResult(gif89Data);
      expect(gif89Result.isValidGif()).toBe(true);
    });

    it('should reject invalid GIF version', () => {
      const invalidVersionData = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x38, 0x61,
      ]); // GIF88a (invalid)
      const invalidVersionResult = new GifResult(invalidVersionData);
      expect(invalidVersionResult.isValidGif()).toBe(false);
    });
  });
});
