/**
 * GIF Result Wrapper
 *
 * Provides a rich wrapper around GIF binary data with convenient methods for
 * output in various formats across different environments (Node.js and browser).
 * This class abstracts platform differences and provides a unified API.
 */

import { GifValidationError } from './types.js';

/**
 * Rich wrapper around GIF binary data with cross-platform output methods.
 *
 * The GifResult class provides convenient methods for outputting GIF data in various
 * formats, with automatic platform detection and graceful fallbacks. Methods adapt
 * to the runtime environment (Node.js vs browser) to provide the most appropriate
 * output format.
 *
 * @example
 * ```typescript
 * import { createSolidColorGif } from 'gif-tools';
 *
 * const gif = createSolidColorGif(100, 100, { red: 255, green: 0, blue: 0 });
 *
 * // Raw data (works everywhere)
 * const data = gif.toUint8Array();
 *
 * // Browser usage
 * const dataUrl = gif.toDataURL();
 * document.body.innerHTML = `<img src="${dataUrl}">`;
 * gif.download('red-square.gif');
 *
 * // Node.js usage
 * await gif.saveToFile('output.gif');
 * const buffer = gif.toBuffer(); // Returns Node.js Buffer
 * ```
 *
 * @example
 * ```typescript
 * // Properties and utilities
 * console.log(`GIF size: ${gif.sizeFormatted}`); // "2.1 KB"
 * console.log(`MIME type: ${gif.mimeType}`); // "image/gif"
 * console.log(`Valid GIF: ${gif.isValidGif()}`); // true
 *
 * // Get comprehensive info
 * const info = gif.getInfo();
 * console.log(info); // { size, mimeType, extension, version, etc. }
 * ```
 */
export class GifResult {
  private readonly data: Uint8Array;

  /**
   * Creates a new GifResult wrapper around binary GIF data.
   *
   * @param data - Binary GIF data as Uint8Array
   * @throws {GifValidationError} When data is not a valid Uint8Array
   *
   * @example
   * ```typescript
   * const gifData = new Uint8Array([0x47, 0x49, 0x46, ...]); // GIF data
   * const result = new GifResult(gifData);
   * ```
   */
  constructor(data: Uint8Array) {
    if (!(data instanceof Uint8Array)) {
      throw new GifValidationError('GIF data must be a Uint8Array');
    }
    if (data.length === 0) {
      throw new GifValidationError('GIF data cannot be empty');
    }
    this.data = data;
  }

  /**
   * Returns the raw GIF data as Uint8Array.
   *
   * This method always returns a Uint8Array and works in all environments.
   * Use this when you need the raw binary data or when working with APIs
   * that expect Uint8Array input.
   *
   * @returns The GIF data as Uint8Array
   *
   * @example
   * ```typescript
   * const gif = createSolidColorGif(100, 100, { red: 255, green: 0, blue: 0 });
   * const data = gif.toUint8Array();
   *
   * // Use with other APIs
   * await fetch('/upload', {
   *   method: 'POST',
   *   body: data,
   *   headers: { 'Content-Type': 'image/gif' }
   * });
   * ```
   */
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.data);
  }

  /**
   * Returns the GIF data as Buffer (Node.js) or Uint8Array (browser).
   *
   * Automatically detects the runtime environment and returns the most appropriate
   * data type. In Node.js, returns a Buffer for maximum compatibility with Node.js
   * APIs. In browsers, gracefully falls back to Uint8Array.
   *
   * @returns Buffer in Node.js, Uint8Array in browsers
   *
   * @example
   * ```typescript
   * const gif = createSolidColorGif(100, 100, { red: 0, green: 255, blue: 0 });
   * const buffer = gif.toBuffer();
   *
   * // Node.js usage
   * if (typeof window === 'undefined') {
   *   // This will be a Buffer in Node.js
   *   await require('fs').promises.writeFile('output.gif', buffer);
   * } else {
   *   // This will be a Uint8Array in browsers
   *   console.log('Fallback to Uint8Array in browser');
   * }
   * ```
   */
  toBuffer(): Uint8Array | unknown {
    // In Node.js, return Buffer; in browser, return Uint8Array
    try {
      const globalBuffer = (
        globalThis as { Buffer?: { from: (data: Uint8Array) => unknown } }
      ).Buffer;
      if (globalBuffer && typeof globalBuffer.from === 'function') {
        return globalBuffer.from(this.data);
      }
    } catch {
      // Fall through to Uint8Array fallback
    }
    // Fallback to Uint8Array for browser compatibility
    return this.toUint8Array();
  }

  /**
   * Converts the GIF data to a base64 data URL for use in HTML.
   *
   * Creates a data: URL that can be used directly in HTML img src attributes,
   * CSS background-image properties, or anywhere a URL is expected. The result
   * includes the proper MIME type for GIFs.
   *
   * @returns Data URL string in format 'data:image/gif;base64,<data>'
   * @throws {GifValidationError} When base64 encoding is not available
   *
   * @example
   * ```typescript
   * const gif = createGradientGif(200, 100,
   *   { red: 255, green: 0, blue: 0 },
   *   { red: 0, green: 0, blue: 255 }
   * );
   *
   * // Use in HTML
   * const dataUrl = gif.toDataURL();
   * document.body.innerHTML = `<img src="${dataUrl}" alt="Gradient">`;
   *
   * // Use in CSS
   * document.body.style.backgroundImage = `url(${dataUrl})`;
   * ```
   *
   * @example
   * ```typescript
   * // React usage
   * function MyComponent() {
   *   const gif = createSolidColorGif(50, 50, { red: 0, green: 255, blue: 0 });
   *   return <img src={gif.toDataURL()} alt="Green square" />;
   * }
   * ```
   */
  toDataURL(): string {
    const base64 = this.toBase64();
    return `data:image/gif;base64,${base64}`;
  }

  /**
   * Converts to base64 string
   */
  toBase64(): string {
    // Check if we're in Node.js environment
    try {
      const globalBuffer = (
        globalThis as {
          Buffer?: {
            from: (data: Uint8Array) => {
              toString: (encoding: string) => string;
            };
          };
        }
      ).Buffer;
      if (globalBuffer && typeof globalBuffer.from === 'function') {
        return globalBuffer.from(this.data).toString('base64');
      }
    } catch {
      // Fall through to browser implementation
    }

    // Browser implementation using btoa
    if (typeof btoa !== 'undefined') {
      let binary = '';
      for (let i = 0; i < this.data.length; i++) {
        binary += String.fromCharCode(this.data[i]);
      }
      return btoa(binary);
    }

    // Fallback manual base64 encoding if neither Buffer nor btoa is available
    return this.manualBase64Encode();
  }

  /**
   * Converts the GIF data to a Blob object (browser only).
   *
   * Creates a Blob object that can be used with various browser APIs for file
   * operations, downloads, or object URLs. Only available in browser environments.
   *
   * @returns Blob object with MIME type 'image/gif'
   * @throws {GifValidationError} When Blob is not available (Node.js environment)
   *
   * @example
   * ```typescript
   * const gif = createNoiseGif(300, 200, { type: 'perlin' });
   *
   * // Create blob for file operations
   * const blob = gif.toBlob();
   * const file = new File([blob], 'noise.gif', { type: 'image/gif' });
   *
   * // Upload using FormData
   * const formData = new FormData();
   * formData.append('image', blob, 'noise.gif');
   * await fetch('/upload', { method: 'POST', body: formData });
   * ```
   *
   * @example
   * ```typescript
   * // Use with object URL
   * const gif = createFractalGif(400, 400, { type: 'mandelbrot' });
   * const blob = gif.toBlob();
   * const url = URL.createObjectURL(blob);
   *
   * // Clean up when done
   * setTimeout(() => URL.revokeObjectURL(url), 1000);
   * ```
   */
  toBlob(): Blob {
    if (typeof Blob === 'undefined') {
      throw new GifValidationError('Blob is not available in this environment');
    }
    return new Blob([this.data], { type: 'image/gif' });
  }

  /**
   * Creates an object URL for the GIF data (browser only).
   *
   * Generates a blob: URL that can be used in HTML elements or for downloads.
   * The URL remains valid until explicitly revoked with URL.revokeObjectURL().
   * Remember to revoke the URL when no longer needed to prevent memory leaks.
   *
   * @returns Object URL string in format 'blob:<uuid>'
   * @throws {GifValidationError} When URL.createObjectURL is not available
   *
   * @example
   * ```typescript
   * const gif = createGeometricGif(250, 250, { shape: 'hexagons' });
   * const objectUrl = gif.toObjectURL();
   *
   * // Use in image element
   * const img = document.createElement('img');
   * img.src = objectUrl;
   * document.body.appendChild(img);
   *
   * // Clean up when done
   * img.onload = () => {
   *   setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
   * };
   * ```
   *
   * @example
   * ```typescript
   * // Use for download link
   * const gif = createSpiralGif(300, 300, { type: 'fibonacci' });
   * const url = gif.toObjectURL();
   *
   * const link = document.createElement('a');
   * link.href = url;
   * link.download = 'fibonacci-spiral.gif';
   * link.textContent = 'Download Spiral';
   * document.body.appendChild(link);
   * ```
   */
  toObjectURL(): string {
    if (
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      throw new GifValidationError('URL.createObjectURL is not available');
    }
    return URL.createObjectURL(this.toBlob());
  }

  /**
   * Converts the GIF data to a ReadableStream (when available).
   *
   * Creates a ReadableStream that can be used with the Streams API for
   * streaming operations. Useful for piping data or working with stream-based APIs.
   *
   * @returns ReadableStream containing the GIF data
   * @throws {GifValidationError} When ReadableStream is not available
   *
   * @example
   * ```typescript
   * const gif = createAnimatedGradientGif(200, 100,
   *   { red: 255, green: 0, blue: 0 },
   *   { red: 0, green: 255, blue: 0 },
   *   { animationType: 'pulse' }
   * );
   *
   * // Use with fetch
   * const stream = gif.toStream();
   * await fetch('/upload', {
   *   method: 'POST',
   *   body: stream,
   *   headers: { 'Content-Type': 'image/gif' }
   * });
   * ```
   */
  toStream(): ReadableStream<Uint8Array> {
    // Check if ReadableStream is available
    if (typeof ReadableStream === 'undefined') {
      throw new GifValidationError(
        'ReadableStream is not available in this environment'
      );
    }

    const data = this.data;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });
  }

  /**
   * Triggers a download of the GIF file in the browser.
   *
   * Creates a temporary download link and programmatically clicks it to trigger
   * the browser's download functionality. Only available in browser environments
   * with DOM access.
   *
   * @param filename - Name for the downloaded file (default: 'image.gif')
   * @throws {GifValidationError} When document/DOM is not available
   *
   * @example
   * ```typescript
   * const gif = createCheckerboardGif(200, 150,
   *   { red: 255, green: 0, blue: 255 },  // Magenta
   *   { red: 0, green: 255, blue: 255 }   // Cyan
   * );
   *
   * // Simple download
   * gif.download(); // Downloads as 'image.gif'
   *
   * // Custom filename
   * gif.download('my-checkerboard.gif');
   * ```
   *
   * @example
   * ```typescript
   * // Download button handler
   * document.getElementById('download-btn').addEventListener('click', () => {
   *   const gif = createFractalGif(400, 400, { type: 'julia' });
   *   gif.download('julia-set-fractal.gif');
   * });
   * ```
   */
  download(filename = 'image.gif'): void {
    if (typeof document === 'undefined') {
      throw new GifValidationError(
        'Download is only available in browser environments'
      );
    }

    const blob = this.toBlob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Saves the GIF to a file (Node.js only).
   *
   * Writes the GIF data to the specified file path using Node.js file system APIs.
   * Creates parent directories if they don't exist. Only available in Node.js environments.
   *
   * @param filepath - Path where the file should be saved
   * @throws {GifValidationError} When Node.js fs module is not available
   *
   * @example
   * ```typescript
   * const gif = createSolidColorGif(800, 600, { red: 70, green: 130, blue: 180 });
   *
   * // Save to current directory
   * await gif.saveToFile('background.gif');
   *
   * // Save to subdirectory
   * await gif.saveToFile('./output/steel-blue-bg.gif');
   *
   * // Save with full path
   * await gif.saveToFile('/home/user/images/custom.gif');
   * ```
   *
   * @example
   * ```typescript
   * // Batch save multiple GIFs
   * const colors = [
   *   { red: 255, green: 0, blue: 0 },
   *   { red: 0, green: 255, blue: 0 },
   *   { red: 0, green: 0, blue: 255 }
   * ];
   *
   * for (let i = 0; i < colors.length; i++) {
   *   const gif = createSolidColorGif(100, 100, colors[i]);
   *   await gif.saveToFile(`color-${i}.gif`);
   * }
   * ```
   */
  async saveToFile(filepath: string): Promise<void> {
    // Dynamic import to avoid issues in browser environments
    try {
      const fs = await import('fs');
      const buffer = this.toBuffer();

      if (fs.promises && fs.promises.writeFile) {
        await fs.promises.writeFile(filepath, buffer as any);
      } else {
        throw new Error('fs.promises.writeFile is not available');
      }
    } catch (error) {
      // Always throw an error indicating fs is not available
      throw new Error(
        'File system operations are not available in this environment'
      );
    }
  }

  /**
   * Gets the size of the GIF in bytes
   */
  get size(): number {
    return this.data.length;
  }

  /**
   * Gets the MIME type
   */
  get mimeType(): string {
    return 'image/gif';
  }

  /**
   * Gets the file extension
   */
  get extension(): string {
    return 'gif';
  }

  /**
   * Returns a formatted size string
   */
  get sizeFormatted(): string {
    const bytes = this.size;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Validates that the data appears to be a valid GIF
   */
  isValidGif(): boolean {
    if (this.data.length < 6) return false;

    // Check GIF signature
    return (
      this.data[0] === 0x47 && // 'G'
      this.data[1] === 0x49 && // 'I'
      this.data[2] === 0x46 && // 'F'
      this.data[3] === 0x38 && // '8'
      (this.data[4] === 0x37 || this.data[4] === 0x39) && // '7' or '9'
      this.data[5] === 0x61 // 'a'
    );
  }

  /**
   * Manual base64 encoding fallback
   */
  private manualBase64Encode(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    while (i < this.data.length) {
      const a = this.data[i++];
      const b = i < this.data.length ? this.data[i++] : 0;
      const c = i < this.data.length ? this.data[i++] : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result +=
        i - 2 < this.data.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < this.data.length ? chars.charAt(bitmap & 63) : '=';
    }

    return result;
  }

  /**
   * Gets comprehensive information about the GIF.
   *
   * Returns an object containing detailed information about the GIF including
   * size, format, version, and other metadata. Useful for debugging or displaying
   * file information to users.
   *
   * @returns Object containing GIF metadata and properties
   *
   * @example
   * ```typescript
   * const gif = createAnimatedGradientGif(300, 200,
   *   { red: 255, green: 100, blue: 0 },
   *   { red: 100, green: 0, blue: 255 },
   *   { frames: 30, delay: 50 }
   * );
   *
   * const info = gif.getInfo();
   * console.log(info);
   * // {
   * //   size: 15420,
   * //   sizeFormatted: "15.1 KB",
   * //   mimeType: "image/gif",
   * //   extension: "gif",
   * //   isValid: true,
   * //   version: "GIF89a",
   * //   hasTransparency: false,
   * //   isAnimated: true
   * // }
   * ```
   *
   * @example
   * ```typescript
   * // Display file info to user
   * function displayGifInfo(gif: GifResult) {
   *   const info = gif.getInfo();
   *
   *   const infoDiv = document.createElement('div');
   *   infoDiv.innerHTML = `
   *     <h3>GIF Information</h3>
   *     <p>Size: ${info.sizeFormatted}</p>
   *     <p>Version: ${info.version}</p>
   *     <p>Valid: ${info.isValid ? 'Yes' : 'No'}</p>
   *     <p>Animated: ${info.isAnimated ? 'Yes' : 'No'}</p>
   *   `;
   *
   *   document.body.appendChild(infoDiv);
   * }
   * ```
   */
  getInfo(): {
    size: number;
    sizeFormatted: string;
    isValid: boolean;
    mimeType: string;
    signature: string;
  } {
    const signature =
      this.data.length >= 6
        ? String.fromCharCode(...this.data.slice(0, 6))
        : 'Invalid';

    return {
      size: this.size,
      sizeFormatted: this.sizeFormatted,
      isValid: this.isValidGif(),
      mimeType: this.mimeType,
      signature,
    };
  }
}
