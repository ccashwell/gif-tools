/**
 * Modern GIF Writer Implementation
 *
 * This implementation provides a clean, type-safe API for writing GIF files
 * with support for both static and animated GIFs.
 */

import {
  OutputStream,
  IndexedImage,
  ImageOptions,
  GlobalColorTableOptions,
  AnimationOptions,
  DisposalMethod,
  GifValidationError,
  GifEncodingError,
} from './types.js';

import {
  GIF_SIGNATURE,
  GIF_VERSION_89A,
  GIF_TRAILER,
  validateDimensions,
  validatePalette,
  calculateColorTableSize,
  padColorTable,
  write16BitLE,
  msToGifDelay,
  NETSCAPE_APPLICATION_IDENTIFIER,
  NETSCAPE_APPLICATION_AUTHENTICATION_CODE,
} from './utils.js';

import { compressLZW, validateLZWParams } from './lzw.js';

/**
 * Writes GIF data to a buffer or stream
 */
export class ByteArrayOutputStream implements OutputStream {
  private data: number[] = [];

  writeByte(byte: number): void {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new GifValidationError(`Invalid byte value: ${byte}`);
    }
    this.data.push(byte);
  }

  writeBytes(bytes: Uint8Array | number[]): void {
    if (bytes instanceof Uint8Array) {
      for (let i = 0; i < bytes.length; i++) {
        this.data.push(bytes[i]);
      }
    } else {
      for (const byte of bytes) {
        this.writeByte(byte);
      }
    }
  }

  /**
   * Returns the written data as Uint8Array
   */
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.data);
  }

  /**
   * Returns the written data as Buffer (Node.js) or Uint8Array (browser)
   */
  toBuffer(): Uint8Array | unknown {
    // In Node.js, return Buffer; in browser, return Uint8Array
    try {
      const globalBuffer = (
        globalThis as { Buffer?: { from: (data: number[]) => unknown } }
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
   * Clears all written data
   */
  clear(): void {
    this.data = [];
  }

  /**
   * Returns the current size in bytes
   */
  get size(): number {
    return this.data.length;
  }
}

/**
 * Main GIF Writer class
 */
export class GifWriter {
  private readonly output: OutputStream;
  private hasWrittenHeader = false;
  private hasWrittenLogicalScreen = false;
  private frameCount = 0;

  constructor(output?: OutputStream) {
    this.output = output ?? new ByteArrayOutputStream();
  }

  /**
   * Writes the GIF header (signature and version)
   */
  writeHeader(): this {
    if (this.hasWrittenHeader) {
      throw new GifEncodingError('Header already written');
    }

    this.output.writeBytes(GIF_SIGNATURE);
    this.output.writeBytes(GIF_VERSION_89A);
    this.hasWrittenHeader = true;

    return this;
  }

  /**
   * Writes the logical screen descriptor and optional global color table
   */
  writeLogicalScreen(
    width: number,
    height: number,
    options: GlobalColorTableOptions = {}
  ): this {
    if (!this.hasWrittenHeader) {
      throw new GifEncodingError('Must write header before logical screen');
    }

    if (this.hasWrittenLogicalScreen) {
      throw new GifEncodingError('Logical screen already written');
    }

    validateDimensions({ width, height });

    const {
      colors,
      sorted = false,
      backgroundColorIndex = 0,
      pixelAspectRatio = 0,
    } = options;

    // Determine color table settings
    let globalColorTableFlag = false;
    let colorTableSize = 0;
    let paddedColorTable: Uint8Array | undefined;

    if (colors && colors.length > 0) {
      validatePalette(colors);
      globalColorTableFlag = true;
      colorTableSize = calculateColorTableSize(colors.length / 3);
      paddedColorTable = padColorTable(colors, colorTableSize);
    }

    // Write logical screen descriptor
    this.output.writeBytes(write16BitLE(width));
    this.output.writeBytes(write16BitLE(height));

    // Packed fields
    const packedFields =
      (globalColorTableFlag ? 0x80 : 0x00) | // Global Color Table Flag
      0x70 | // Color Resolution (always 111)
      (sorted ? 0x08 : 0x00) | // Sort Flag
      colorTableSize; // Size of Global Color Table

    this.output.writeByte(packedFields);
    this.output.writeByte(backgroundColorIndex & 0xff);
    this.output.writeByte(pixelAspectRatio & 0xff);

    // Write global color table if present
    if (paddedColorTable) {
      this.output.writeBytes(paddedColorTable);
    }

    this.hasWrittenLogicalScreen = true;
    return this;
  }

  /**
   * Writes animation control information (Netscape extension)
   */
  writeAnimationInfo(options: AnimationOptions = {}): this {
    if (!this.hasWrittenLogicalScreen) {
      throw new GifEncodingError(
        'Must write logical screen before animation info'
      );
    }

    const { loops = 0 } = options;
    const loopCount = Math.max(0, Math.min(65535, loops));

    this.output.writeBytes([
      0x21, // Extension Introducer
      0xff, // Application Extension Label
      11, // Block Size
      ...NETSCAPE_APPLICATION_IDENTIFIER,
      ...NETSCAPE_APPLICATION_AUTHENTICATION_CODE,
      3, // Sub-block size
      0x01, // Loop indicator
      ...write16BitLE(loopCount),
      0x00, // Block terminator
    ]);

    return this;
  }

  /**
   * Writes a graphics control extension
   */
  private writeGraphicsControl(options: ImageOptions): void {
    const {
      delay = 0,
      disposal = DisposalMethod.RestoreToBackground,
      transparentIndex = -1,
    } = options;

    const delayTime = msToGifDelay(delay);
    const hasTransparency = transparentIndex >= 0 && transparentIndex <= 255;

    this.output.writeBytes([
      0x21, // Extension Introducer
      0xf9, // Graphics Control Label
      0x04, // Block Size
    ]);

    // Packed fields
    const packedFields =
      ((disposal & 0x07) << 2) | // Disposal Method
      (hasTransparency ? 0x01 : 0x00); // Transparent Color Flag

    this.output.writeByte(packedFields);
    this.output.writeBytes(write16BitLE(delayTime));
    this.output.writeByte(hasTransparency ? transparentIndex & 0xff : 0);
    this.output.writeByte(0x00); // Block terminator
  }

  /**
   * Writes image descriptor
   */
  private writeImageDescriptor(
    image: IndexedImage,
    options: ImageOptions
  ): void {
    const { left = 0, top = 0 } = options;

    validatePalette(image.palette);
    const colorTableSize = calculateColorTableSize(image.palette.length / 3);
    const useLocalColorTable = true; // Always use local color table for simplicity

    this.output.writeByte(0x2c); // Image Separator
    this.output.writeBytes(write16BitLE(left));
    this.output.writeBytes(write16BitLE(top));
    this.output.writeBytes(write16BitLE(image.width));
    this.output.writeBytes(write16BitLE(image.height));

    // Packed fields
    const packedFields =
      (useLocalColorTable ? 0x80 : 0x00) | // Local Color Table Flag
      0x00 | // Interlace Flag (not supported)
      0x00 | // Sort Flag
      colorTableSize; // Size of Local Color Table

    this.output.writeByte(packedFields);
  }

  /**
   * Writes image data with LZW compression
   */
  private writeImageData(image: IndexedImage): void {
    // Validate image data
    if (image.data.length !== image.width * image.height) {
      throw new GifValidationError(
        `Image data length mismatch: expected ${
          image.width * image.height
        }, got ${image.data.length}`
      );
    }

    const colorCount = image.palette.length / 3;
    const minCodeSize = colorCount <= 2 ? 2 : Math.ceil(Math.log2(colorCount));
    const lzwCodeSize = Math.max(2, minCodeSize); // GIF minimum is 2

    // Validate that all pixel values are within palette range
    const maxIndex = colorCount - 1;
    for (let i = 0; i < image.data.length; i++) {
      if (image.data[i] > maxIndex) {
        throw new GifValidationError(
          `Pixel value ${image.data[i]} at index ${i} exceeds palette size ${colorCount}`
        );
      }
    }

    validateLZWParams(image.data, lzwCodeSize);
    const compressedData = compressLZW(image.data, lzwCodeSize);

    // Write LZW minimum code size
    this.output.writeByte(lzwCodeSize);

    // Write compressed data in sub-blocks
    this.writeDataSubBlocks(compressedData);

    // Block terminator
    this.output.writeByte(0x00);
  }

  /**
   * Writes data in sub-blocks (max 255 bytes each)
   */
  private writeDataSubBlocks(data: Uint8Array): void {
    let offset = 0;

    while (offset < data.length) {
      const blockSize = Math.min(255, data.length - offset);
      this.output.writeByte(blockSize);

      for (let i = 0; i < blockSize; i++) {
        this.output.writeByte(data[offset + i]);
      }

      offset += blockSize;
    }
  }

  /**
   * Writes a single image frame
   */
  writeImage(image: IndexedImage, options: ImageOptions = {}): this {
    if (!this.hasWrittenLogicalScreen) {
      throw new GifEncodingError('Must write logical screen before images');
    }

    // Validate image
    validateDimensions(image);
    validatePalette(image.palette);

    // Write graphics control extension for animated GIFs or if transparency is needed
    const needsGraphicsControl =
      this.frameCount > 0 ||
      options.delay !== undefined ||
      options.disposal !== undefined ||
      options.transparentIndex !== undefined;

    if (needsGraphicsControl) {
      this.writeGraphicsControl(options);
    }

    // Write image descriptor
    this.writeImageDescriptor(image, options);

    // Write local color table
    const paddedPalette = padColorTable(
      image.palette,
      calculateColorTableSize(image.palette.length / 3)
    );
    this.output.writeBytes(paddedPalette);

    // Write image data
    this.writeImageData(image);

    this.frameCount++;
    return this;
  }

  /**
   * Writes the GIF trailer
   */
  writeTrailer(): this {
    this.output.writeByte(GIF_TRAILER);
    return this;
  }

  /**
   * Convenience method to write a complete static GIF
   */
  writeStaticGif(
    image: IndexedImage,
    globalOptions: GlobalColorTableOptions = {},
    imageOptions: ImageOptions = {}
  ): this {
    return this.writeHeader()
      .writeLogicalScreen(image.width, image.height, globalOptions)
      .writeImage(image, imageOptions)
      .writeTrailer();
  }

  /**
   * Convenience method to write a complete animated GIF
   */
  writeAnimatedGif(
    images: IndexedImage[],
    globalOptions: GlobalColorTableOptions = {},
    animationOptions: AnimationOptions = {},
    imageOptions: ImageOptions[] = []
  ): this {
    if (images.length === 0) {
      throw new GifValidationError('Cannot create animated GIF with no images');
    }

    // Use first image dimensions for logical screen
    const { width, height } = images[0];

    this.writeHeader()
      .writeLogicalScreen(width, height, globalOptions)
      .writeAnimationInfo(animationOptions);

    images.forEach((image, index) => {
      const options = imageOptions[index] || {};
      this.writeImage(image, options);
    });

    return this.writeTrailer();
  }

  /**
   * Returns the output stream (useful when using default ByteArrayOutputStream)
   */
  getOutput(): OutputStream {
    return this.output;
  }

  /**
   * Gets the written data as Uint8Array (only works with ByteArrayOutputStream)
   */
  toUint8Array(): Uint8Array {
    if (this.output instanceof ByteArrayOutputStream) {
      return this.output.toUint8Array();
    }
    throw new Error(
      'Cannot convert to Uint8Array: output stream is not ByteArrayOutputStream'
    );
  }

  /**
   * Gets the written data as Buffer (Node.js) or Uint8Array (browser)
   */
  toBuffer(): unknown {
    if (this.output instanceof ByteArrayOutputStream) {
      return this.output.toBuffer();
    }
    throw new Error(
      'Cannot convert to Buffer: output stream is not ByteArrayOutputStream'
    );
  }
}
