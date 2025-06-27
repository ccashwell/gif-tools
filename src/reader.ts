/**
 * GIF Reader Implementation
 *
 * Parses existing GIF files and extracts frames, metadata, and color information.
 */

import {
  ImageData,
  RGBColor,
  GifValidationError,
  DisposalMethod,
} from './types.js';
import { decompressLZW } from './lzw.js';

export interface GifFrame {
  /** Frame image data */
  imageData: ImageData;
  /** Frame delay in milliseconds */
  delay: number;
  /** Frame disposal method */
  disposal: DisposalMethod;
  /** Frame position */
  left: number;
  top: number;
  /** Transparent color index (-1 if none) */
  transparentIndex: number;
}

export interface GifMetadata {
  /** Extensions found in the GIF */
  extensions: string[];
  /** Comments from comment extensions */
  comments: string[];
  /** Whether any frames use interlacing */
  hasInterlacedFrames: boolean;
  /** Whether local color tables are used */
  hasLocalColorTables: boolean;
  /** Transparent frames detected */
  hasTransparency: boolean;
  /** XMP metadata if present */
  xmpData?: string;
  /** Technical details discovered during parsing */
  technicalDetails: {
    totalDataSize: number;
    compressionRatio?: number;
    averageFrameSize: number;
  };
}

export interface GifInfo {
  /** GIF dimensions */
  width: number;
  height: number;
  /** Number of frames */
  frameCount: number;
  /** Loop count (0 = infinite) */
  loops: number;
  /** Global color table */
  globalColorTable?: Uint8Array;
  /** Background color index */
  backgroundColorIndex: number;
  /** Pixel aspect ratio */
  pixelAspectRatio: number;
  /** Color resolution */
  colorResolution: number;
  /** Sort flag */
  sortFlag: boolean;
  /** Total duration in milliseconds */
  duration: number;
  /** File size in bytes */
  size: number;
  /** GIF version (87a or 89a) */
  version: string;
  /** Metadata and extension information */
  metadata: GifMetadata;
}

/**
 * Reads and parses GIF files
 */
export class GifReader {
  private data: Uint8Array;
  private position = 0;
  private info: GifInfo | null = null;
  private frames: GifFrame[] = [];
  private metadata: GifMetadata = {
    extensions: [],
    comments: [],
    hasInterlacedFrames: false,
    hasLocalColorTables: false,
    hasTransparency: false,
    technicalDetails: {
      totalDataSize: 0,
      averageFrameSize: 0,
    },
  };

  constructor(data: Uint8Array) {
    this.data = data;
    this.validateHeader();
  }

  /**
   * Validates GIF header
   */
  private validateHeader(): void {
    if (this.data.length < 6) {
      throw new GifValidationError('Invalid GIF: too short');
    }

    // Check for common non-GIF file types
    const firstBytes = this.data.slice(0, 4);
    const firstChars = String.fromCharCode(...firstBytes);

    if (firstChars.startsWith('<')) {
      throw new GifValidationError('File appears to be HTML/XML, not a GIF');
    }

    if (firstChars.includes('PNG')) {
      throw new GifValidationError('File appears to be a PNG, not a GIF');
    }

    if (firstBytes[0] === 0xff && firstBytes[1] === 0xd8) {
      throw new GifValidationError('File appears to be a JPEG, not a GIF');
    }

    const signature = String.fromCharCode(...this.data.slice(0, 3));
    const version = String.fromCharCode(...this.data.slice(3, 6));

    if (signature !== 'GIF') {
      // Provide more diagnostic information
      const hexBytes = Array.from(
        this.data.slice(0, Math.min(16, this.data.length))
      )
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(' ');

      throw new GifValidationError(
        `Invalid GIF signature: expected 'GIF', got '${signature}'. ` +
          `First 16 bytes: ${hexBytes}`
      );
    }

    if (version !== '87a' && version !== '89a') {
      throw new GifValidationError(`Unsupported GIF version: ${version}`);
    }

    this.position = 6;
  }

  /**
   * Reads a byte from the data
   */
  private readByte(): number {
    if (this.position >= this.data.length) {
      throw new GifValidationError('Unexpected end of GIF data');
    }
    return this.data[this.position++];
  }

  /**
   * Reads a 16-bit little-endian value
   */
  private read16(): number {
    const low = this.readByte();
    const high = this.readByte();
    return low | (high << 8);
  }

  /**
   * Reads multiple bytes
   */
  private readBytes(count: number): Uint8Array {
    if (this.position + count > this.data.length) {
      throw new GifValidationError('Unexpected end of GIF data');
    }
    const result = this.data.slice(this.position, this.position + count);
    this.position += count;
    return result;
  }

  /**
   * Skips data sub-blocks
   */
  private skipDataSubBlocks(): void {
    let blockSize = this.readByte();
    while (blockSize > 0) {
      this.position += blockSize;
      blockSize = this.readByte();
    }
  }

  /**
   * Reads data sub-blocks and returns combined data
   */
  private readDataSubBlocks(): Uint8Array {
    const blocks: Uint8Array[] = [];
    let totalLength = 0;

    let blockSize = this.readByte();
    while (blockSize > 0) {
      const blockData = this.readBytes(blockSize);
      blocks.push(blockData);
      totalLength += blockSize;
      blockSize = this.readByte();
    }

    // Combine all blocks
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const block of blocks) {
      result.set(block, offset);
      offset += block.length;
    }

    return result;
  }

  /**
   * Creates ImageData from index data and color table
   */
  private createFrameImageData(
    indexData: Uint8Array,
    width: number,
    height: number,
    colorTable: Uint8Array | undefined,
    transparentIndex: number,
    interlaced: boolean
  ): ImageData {
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < indexData.length && i < width * height; i++) {
      const colorIndex = indexData[i];
      const pixelIndex = interlaced
        ? this.deinterlaceIndex(i, width, height)
        : i;
      const rgbaIndex = pixelIndex * 4;

      if (colorIndex === transparentIndex) {
        // Transparent pixel
        rgba[rgbaIndex] = 0;
        rgba[rgbaIndex + 1] = 0;
        rgba[rgbaIndex + 2] = 0;
        rgba[rgbaIndex + 3] = 0;
      } else if (colorTable && colorIndex * 3 + 2 < colorTable.length) {
        // Use color from table
        rgba[rgbaIndex] = colorTable[colorIndex * 3];
        rgba[rgbaIndex + 1] = colorTable[colorIndex * 3 + 1];
        rgba[rgbaIndex + 2] = colorTable[colorIndex * 3 + 2];
        rgba[rgbaIndex + 3] = 255;
      } else {
        // Default to black
        rgba[rgbaIndex] = 0;
        rgba[rgbaIndex + 1] = 0;
        rgba[rgbaIndex + 2] = 0;
        rgba[rgbaIndex + 3] = 255;
      }
    }

    return {
      data: rgba,
      width,
      height,
    };
  }

  /**
   * Converts interlaced index to actual pixel position
   */
  private deinterlaceIndex(
    index: number,
    width: number,
    height: number
  ): number {
    const x = index % width;
    const y = Math.floor(index / width);

    // GIF interlacing pattern:
    // Pass 1: Every 8th row, starting with row 0
    // Pass 2: Every 8th row, starting with row 4
    // Pass 3: Every 4th row, starting with row 2
    // Pass 4: Every 2nd row, starting with row 1

    let actualY: number;
    if (y < Math.ceil(height / 8)) {
      actualY = y * 8;
    } else if (y < Math.ceil(height / 8) + Math.ceil((height - 4) / 8)) {
      actualY = (y - Math.ceil(height / 8)) * 8 + 4;
    } else if (
      y <
      Math.ceil(height / 8) +
        Math.ceil((height - 4) / 8) +
        Math.ceil((height - 2) / 4)
    ) {
      actualY =
        (y - Math.ceil(height / 8) - Math.ceil((height - 4) / 8)) * 4 + 2;
    } else {
      actualY =
        (y -
          Math.ceil(height / 8) -
          Math.ceil((height - 4) / 8) -
          Math.ceil((height - 2) / 4)) *
          2 +
        1;
    }

    return actualY * width + x;
  }

  /**
   * Converts interlaced Y coordinate to actual Y coordinate
   */
  private deinterlaceY(y: number, height: number): number {
    if (y < Math.ceil(height / 8)) {
      return y * 8;
    } else if (y < Math.ceil(height / 8) + Math.ceil((height - 4) / 8)) {
      return (y - Math.ceil(height / 8)) * 8 + 4;
    } else if (
      y <
      Math.ceil(height / 8) +
        Math.ceil((height - 4) / 8) +
        Math.ceil((height - 2) / 4)
    ) {
      return (y - Math.ceil(height / 8) - Math.ceil((height - 4) / 8)) * 4 + 2;
    } else {
      return (
        (y -
          Math.ceil(height / 8) -
          Math.ceil((height - 4) / 8) -
          Math.ceil((height - 2) / 4)) *
          2 +
        1
      );
    }
  }

  /**
   * Clears a frame area to background color
   */
  private clearFrameArea(
    canvas: Uint8ClampedArray,
    left: number,
    top: number,
    width: number,
    height: number,
    globalColorTable: Uint8Array | undefined,
    backgroundColorIndex: number,
    canvasWidth: number
  ): void {
    let bgR = 0,
      bgG = 0,
      bgB = 0,
      bgA = 0;

    if (
      globalColorTable &&
      backgroundColorIndex < globalColorTable.length / 3
    ) {
      bgR = globalColorTable[backgroundColorIndex * 3];
      bgG = globalColorTable[backgroundColorIndex * 3 + 1];
      bgB = globalColorTable[backgroundColorIndex * 3 + 2];
      bgA = 255;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const canvasX = left + x;
        const canvasY = top + y;
        if (canvasX >= 0 && canvasX < canvasWidth && canvasY >= 0) {
          const canvasIndex = (canvasY * canvasWidth + canvasX) * 4;
          if (canvasIndex < canvas.length) {
            canvas[canvasIndex] = bgR;
            canvas[canvasIndex + 1] = bgG;
            canvas[canvasIndex + 2] = bgB;
            canvas[canvasIndex + 3] = bgA;
          }
        }
      }
    }
  }

  /**
   * Composites a frame onto the canvas
   */
  private compositeFrame(
    canvas: Uint8ClampedArray,
    indexData: Uint8Array,
    left: number,
    top: number,
    width: number,
    height: number,
    colorTable: Uint8Array | undefined,
    transparentIndex: number,
    interlaced: boolean,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    for (let i = 0; i < indexData.length && i < width * height; i++) {
      const colorIndex = indexData[i];

      // Skip transparent pixels
      if (colorIndex === transparentIndex) {
        continue;
      }

      // Get pixel position within the frame
      const frameX = i % width;
      const frameY = Math.floor(i / width);

      // Apply interlacing if needed
      const actualY = interlaced ? this.deinterlaceY(frameY, height) : frameY;

      // Calculate canvas position
      const canvasX = left + frameX;
      const canvasY = top + actualY;

      // Check bounds
      if (
        canvasX >= 0 &&
        canvasX < canvasWidth &&
        canvasY >= 0 &&
        canvasY < canvasHeight
      ) {
        const canvasIndex = (canvasY * canvasWidth + canvasX) * 4;

        if (canvasIndex < canvas.length) {
          if (colorTable && colorIndex * 3 + 2 < colorTable.length) {
            // Use color from table
            canvas[canvasIndex] = colorTable[colorIndex * 3];
            canvas[canvasIndex + 1] = colorTable[colorIndex * 3 + 1];
            canvas[canvasIndex + 2] = colorTable[colorIndex * 3 + 2];
            canvas[canvasIndex + 3] = 255;
          } else {
            // Default to black
            canvas[canvasIndex] = 0;
            canvas[canvasIndex + 1] = 0;
            canvas[canvasIndex + 2] = 0;
            canvas[canvasIndex + 3] = 255;
          }
        }
      }
    }
  }

  /**
   * Parses the GIF and extracts all information
   */
  parse(): GifInfo {
    if (this.info) {
      return this.info;
    }

    // Read logical screen descriptor
    const width = this.read16();
    const height = this.read16();
    const packed = this.readByte();
    const backgroundColorIndex = this.readByte();
    const pixelAspectRatio = this.readByte();

    const globalColorTableFlag = (packed & 0x80) !== 0;
    const colorResolution = ((packed & 0x70) >> 4) + 1;
    const sortFlag = (packed & 0x08) !== 0;
    const globalColorTableSize = 2 << (packed & 0x07);

    let globalColorTable: Uint8Array | undefined;
    if (globalColorTableFlag) {
      globalColorTable = this.readBytes(globalColorTableSize * 3);
    }

    let loops = 0;
    let frameCount = 0;
    let totalDuration = 0;

    // Parse data stream
    while (this.position < this.data.length) {
      const separator = this.readByte();

      if (separator === 0x21) {
        // Extension
        const label = this.readByte();

        if (label === 0xff) {
          // Application extension
          const blockSize = this.readByte();
          const appData = this.readBytes(blockSize);

          // Check for Netscape extension (animation info)
          if (blockSize === 11) {
            const identifier = String.fromCharCode(...appData.slice(0, 8));
            if (identifier === 'NETSCAPE') {
              this.metadata.extensions.push('Netscape 2.0 (Animation)');
              const subBlockSize = this.readByte();
              if (subBlockSize === 3) {
                this.readByte(); // Loop indicator
                loops = this.read16();
              }
              this.readByte(); // Block terminator
              continue; // Skip the general skipDataSubBlocks call
            }
          }

          // Check for known application extensions
          if (blockSize === 11) {
            const identifier = String.fromCharCode(...appData);
            if (identifier === 'XMP DataXMP') {
              // Adobe XMP metadata
              this.metadata.extensions.push('XMP Metadata');
              const xmpData = this.readDataSubBlocks();
              if (xmpData.length > 0) {
                try {
                  this.metadata.xmpData = String.fromCharCode(...xmpData);
                } catch {
                  // If XMP data is not valid text, just note its presence
                  this.metadata.xmpData = `[Binary XMP data, ${xmpData.length} bytes]`;
                }
              }
              continue;
            } else if (
              identifier === 'ICCRGBG1012' ||
              identifier.startsWith('ICCRGBG1')
            ) {
              // ICC Color Profile
              this.metadata.extensions.push('ICC Color Profile');
              this.skipDataSubBlocks();
              continue;
            }
          }

          // Check for other common extensions
          if (blockSize >= 8) {
            const identifier = String.fromCharCode(...appData.slice(0, 8));
            if (identifier === 'MAGPIE01' || identifier === 'MAGPIE02') {
              // MAGPIE extension (some image editors)
              this.metadata.extensions.push(`MAGPIE Extension (${identifier})`);
              this.skipDataSubBlocks();
              continue;
            } else if (identifier.startsWith('ADOBE')) {
              // Various Adobe extensions
              this.metadata.extensions.push(`Adobe Extension (${identifier})`);
              this.skipDataSubBlocks();
              continue;
            }
          }

          // Check for animation extensions
          if (blockSize >= 11) {
            const identifier = String.fromCharCode(...appData.slice(0, 11));
            if (identifier === 'ANIMEXTS1.0') {
              // Animation extensions
              this.metadata.extensions.push('Animation Extensions 1.0');
              this.skipDataSubBlocks();
              continue;
            }
          }

          // Record any other application extension
          if (blockSize > 0) {
            try {
              const identifier = String.fromCharCode(
                ...appData.slice(0, Math.min(blockSize, 16))
              );
              this.metadata.extensions.push(
                `Application Extension (${identifier})`
              );
            } catch {
              this.metadata.extensions.push(
                `Application Extension (binary, ${blockSize} bytes)`
              );
            }
          }

          // For other application extensions, skip the remaining data
          this.skipDataSubBlocks();
        } else if (label === 0xf9) {
          // Graphics control extension
          const blockSize = this.readByte();
          if (blockSize === 4) {
            const packed = this.readByte();
            const delay = this.read16() * 10; // Convert to milliseconds
            const transparentIndex = this.readByte();
            this.readByte(); // Block terminator

            // Check for transparency
            if (transparentIndex !== 0 && (packed & 0x01) !== 0) {
              this.metadata.hasTransparency = true;
            }

            totalDuration += delay;
          } else {
            this.position += blockSize;
            this.readByte(); // Block terminator
          }
        } else if (label === 0xfe) {
          // Comment extension
          const commentData = this.readDataSubBlocks();
          if (commentData.length > 0) {
            try {
              const comment = String.fromCharCode(...commentData);
              this.metadata.comments.push(comment);
              this.metadata.extensions.push('Comment Extension');
            } catch {
              this.metadata.extensions.push('Comment Extension (binary data)');
            }
          }
        } else if (label === 0x01) {
          // Plain text extension
          this.metadata.extensions.push('Plain Text Extension');
          const blockSize = this.readByte();
          this.readBytes(blockSize); // Skip text grid data
          this.skipDataSubBlocks(); // Skip text data
        } else if (label === 0xfd) {
          // Unknown extension (sometimes used for metadata)
          this.metadata.extensions.push('Unknown Extension (0xFD)');
          this.skipDataSubBlocks();
        } else if (label >= 0x80 && label <= 0xfc) {
          // Private use extensions
          this.metadata.extensions.push(
            `Private Extension (0x${label.toString(16).toUpperCase()})`
          );
          this.skipDataSubBlocks();
        } else {
          // Skip any other unknown extensions gracefully
          this.metadata.extensions.push(
            `Unknown Extension (0x${label.toString(16).toUpperCase()})`
          );
          try {
            this.skipDataSubBlocks();
          } catch (error) {
            // If skipping fails, log warning and continue parsing
            console.warn(
              `Failed to skip extension with label 0x${label.toString(16)}:`,
              error
            );
            break; // Exit parsing loop to prevent infinite loops
          }
        }
      } else if (separator === 0x2c) {
        // Image descriptor
        frameCount++;

        // Skip image descriptor and local color table
        this.position += 8; // left, top, width, height
        const packed = this.readByte();
        const localColorTableFlag = (packed & 0x80) !== 0;
        const interlaceFlag = (packed & 0x40) !== 0;
        const localColorTableSize = localColorTableFlag
          ? 2 << (packed & 0x07)
          : 0;

        // Track metadata
        if (localColorTableFlag) {
          this.metadata.hasLocalColorTables = true;
          this.position += localColorTableSize * 3;
        }

        if (interlaceFlag) {
          this.metadata.hasInterlacedFrames = true;
        }

        // Skip LZW data
        this.readByte(); // LZW minimum code size
        this.skipDataSubBlocks();
      } else if (separator === 0x3b) {
        // Trailer
        break;
      } else {
        // Provide more diagnostic information
        const char = String.fromCharCode(separator);
        const context = this.data.slice(
          Math.max(0, this.position - 10),
          this.position + 10
        );
        const contextStr = Array.from(context)
          .map(b =>
            b >= 32 && b <= 126
              ? String.fromCharCode(b)
              : `\\x${b.toString(16).padStart(2, '0')}`
          )
          .join('');

        throw new GifValidationError(
          `Unknown separator: 0x${separator.toString(
            16
          )} ('${char}') at position ${this.position - 1}. ` +
            `Context: "${contextStr}". This may indicate the file is not a valid GIF or is corrupted.`
        );
      }
    }

    // Calculate technical details
    this.metadata.technicalDetails.totalDataSize = this.data.length;
    this.metadata.technicalDetails.averageFrameSize =
      frameCount > 0 ? Math.round(this.data.length / frameCount) : 0;

    this.info = {
      width,
      height,
      frameCount,
      loops,
      globalColorTable,
      backgroundColorIndex,
      pixelAspectRatio,
      colorResolution,
      sortFlag,
      duration: totalDuration,
      size: this.data.length,
      version: String.fromCharCode(...this.data.slice(3, 6)),
      metadata: { ...this.metadata },
    };

    return this.info;
  }

  /**
   * Gets basic information about the GIF
   */
  getInfo(): GifInfo {
    return this.parse();
  }

  /**
   * Extracts all frames from the GIF with proper canvas composition
   */
  getFrames(): GifFrame[] {
    if (this.frames.length > 0) {
      return this.frames;
    }

    // Reset position to parse frames
    this.position = 6;

    // Read logical screen descriptor
    const width = this.read16();
    const height = this.read16();
    const packed = this.readByte();
    const backgroundColorIndex = this.readByte();
    this.readByte(); // pixel aspect ratio

    const globalColorTableFlag = (packed & 0x80) !== 0;
    const globalColorTableSize = 2 << (packed & 0x07);

    let globalColorTable: Uint8Array | undefined;
    if (globalColorTableFlag) {
      globalColorTable = this.readBytes(globalColorTableSize * 3);
    }

    // Canvas for proper frame composition
    let canvas = new Uint8ClampedArray(width * height * 4);
    let previousCanvas: Uint8ClampedArray | null = null;

    // Initialize canvas with background color
    if (
      globalColorTable &&
      backgroundColorIndex < globalColorTable.length / 3
    ) {
      const bgR = globalColorTable[backgroundColorIndex * 3];
      const bgG = globalColorTable[backgroundColorIndex * 3 + 1];
      const bgB = globalColorTable[backgroundColorIndex * 3 + 2];
      for (let i = 0; i < canvas.length; i += 4) {
        canvas[i] = bgR;
        canvas[i + 1] = bgG;
        canvas[i + 2] = bgB;
        canvas[i + 3] = 255;
      }
    } else {
      // Default to transparent
      canvas.fill(0);
    }

    let currentDelay = 100; // Default delay
    let currentDisposal = DisposalMethod.DoNotDispose;
    let currentTransparentIndex = -1;

    // Parse data stream
    while (this.position < this.data.length) {
      const separator = this.readByte();

      if (separator === 0x21) {
        // Extension
        const label = this.readByte();

        if (label === 0xff) {
          // Application extension
          const blockSize = this.readByte();
          const appData = this.readBytes(blockSize);

          // Check for known application extensions
          if (blockSize === 11) {
            const identifier = String.fromCharCode(...appData);
            if (identifier === 'XMP DataXMP') {
              // Adobe XMP metadata
              this.skipDataSubBlocks();
              continue;
            } else if (
              identifier === 'ICCRGBG1012' ||
              identifier.startsWith('ICCRGBG1')
            ) {
              // ICC Color Profile
              this.skipDataSubBlocks();
              continue;
            }
          }

          // Check for other common extensions
          if (blockSize >= 8) {
            const identifier = String.fromCharCode(...appData.slice(0, 8));
            if (identifier === 'MAGPIE01' || identifier === 'MAGPIE02') {
              // MAGPIE extension (some image editors)
              this.skipDataSubBlocks();
              continue;
            } else if (identifier.startsWith('ADOBE')) {
              // Various Adobe extensions
              this.skipDataSubBlocks();
              continue;
            }
          }

          // Check for animation extensions
          if (blockSize >= 11) {
            const identifier = String.fromCharCode(...appData.slice(0, 11));
            if (identifier === 'ANIMEXTS1.0') {
              // Animation extensions
              this.skipDataSubBlocks();
              continue;
            }
          }

          // For other application extensions, skip the remaining data
          this.skipDataSubBlocks();
        } else if (label === 0xf9) {
          // Graphics control extension
          const blockSize = this.readByte();
          if (blockSize === 4) {
            const packedFlags = this.readByte();
            currentDelay = this.read16() * 10; // Convert to milliseconds
            currentTransparentIndex = this.readByte();

            // Parse disposal method
            const disposalFlag = (packedFlags & 0x1c) >> 2;
            switch (disposalFlag) {
              case 1:
                currentDisposal = DisposalMethod.DoNotDispose;
                break;
              case 2:
                currentDisposal = DisposalMethod.RestoreToBackground;
                break;
              case 3:
                currentDisposal = DisposalMethod.RestoreToPrevious;
                break;
              default:
                currentDisposal = DisposalMethod.DoNotDispose;
                break;
            }

            // Check for transparent color flag
            if ((packedFlags & 0x01) === 0) {
              currentTransparentIndex = -1;
            }

            this.readByte(); // Block terminator
          } else {
            this.position += blockSize;
            this.readByte(); // Block terminator
          }
        } else if (label === 0xfe) {
          // Comment extension
          this.skipDataSubBlocks();
        } else if (label === 0x01) {
          // Plain text extension
          const blockSize = this.readByte();
          this.readBytes(blockSize); // Skip text grid data
          this.skipDataSubBlocks(); // Skip text data
        } else if (label === 0xfd) {
          // Unknown extension (sometimes used for metadata)
          this.skipDataSubBlocks();
        } else if (label >= 0x80 && label <= 0xfc) {
          // Private use extensions
          this.skipDataSubBlocks();
        } else {
          // Skip any other unknown extensions gracefully
          try {
            this.skipDataSubBlocks();
          } catch (error) {
            // If skipping fails, log warning and continue parsing
            console.warn(
              `Failed to skip extension with label 0x${label.toString(16)}:`,
              error
            );
            break; // Exit parsing loop to prevent infinite loops
          }
        }
      } else if (separator === 0x2c) {
        // Image descriptor
        const frameLeft = this.read16();
        const frameTop = this.read16();
        const frameWidth = this.read16();
        const frameHeight = this.read16();
        const framePacked = this.readByte();

        const localColorTableFlag = (framePacked & 0x80) !== 0;
        const interlaceFlag = (framePacked & 0x40) !== 0;
        const localColorTableSize = localColorTableFlag
          ? 2 << (framePacked & 0x07)
          : 0;

        let localColorTable: Uint8Array | undefined;
        if (localColorTableFlag) {
          localColorTable = this.readBytes(localColorTableSize * 3);
        }

        // Use local color table if available, otherwise global
        const colorTable = localColorTable || globalColorTable;

        // Read LZW data
        const lzwMinimumCodeSize = this.readByte();
        const compressedData = this.readDataSubBlocks();

        try {
          // Handle disposal method from previous frame
          if (
            previousCanvas &&
            currentDisposal === DisposalMethod.RestoreToPrevious
          ) {
            canvas = new Uint8ClampedArray(previousCanvas);
          } else if (currentDisposal === DisposalMethod.RestoreToBackground) {
            // Clear the frame area to background
            this.clearFrameArea(
              canvas,
              frameLeft,
              frameTop,
              frameWidth,
              frameHeight,
              globalColorTable,
              backgroundColorIndex,
              width
            );
          }

          // Save current canvas state if needed for next frame
          if (currentDisposal === DisposalMethod.RestoreToPrevious) {
            previousCanvas = new Uint8ClampedArray(canvas);
          }

          // Decompress LZW data
          const indexData = decompressLZW(compressedData, lzwMinimumCodeSize);

          // Composite frame onto canvas
          this.compositeFrame(
            canvas,
            indexData,
            frameLeft,
            frameTop,
            frameWidth,
            frameHeight,
            colorTable,
            currentTransparentIndex,
            interlaceFlag,
            width,
            height
          );

          // Create frame object with full canvas
          const frameImageData: ImageData = {
            data: new Uint8ClampedArray(canvas),
            width,
            height,
          };

          const frame: GifFrame = {
            imageData: frameImageData,
            delay: currentDelay,
            disposal: currentDisposal,
            left: 0, // Always 0 since we're returning the full canvas
            top: 0, // Always 0 since we're returning the full canvas
            transparentIndex: currentTransparentIndex,
          };

          this.frames.push(frame);

          // Reset for next frame
          currentDelay = 100;
          currentDisposal = DisposalMethod.DoNotDispose;
          currentTransparentIndex = -1;
        } catch (error) {
          console.error(
            `Failed to decompress frame ${this.frames.length + 1}:`,
            error
          );
          console.log(
            `Frame details: ${frameWidth}x${frameHeight}, LZW code size: ${lzwMinimumCodeSize}, Compressed data length: ${compressedData.length}`
          );

          // Create a placeholder frame with error information
          const errorFrame: GifFrame = {
            imageData: {
              data: new Uint8ClampedArray(frameWidth * frameHeight * 4).fill(
                255
              ), // White frame
              width: frameWidth,
              height: frameHeight,
            },
            delay: currentDelay,
            disposal: currentDisposal,
            left: frameLeft,
            top: frameTop,
            transparentIndex: currentTransparentIndex,
          };

          this.frames.push(errorFrame);

          // Reset for next frame
          currentDelay = 100;
          currentDisposal = DisposalMethod.DoNotDispose;
          currentTransparentIndex = -1;
        }
      } else if (separator === 0x3b) {
        // Trailer
        break;
      } else {
        // Provide more diagnostic information
        const char = String.fromCharCode(separator);
        const context = this.data.slice(
          Math.max(0, this.position - 10),
          this.position + 10
        );
        const contextStr = Array.from(context)
          .map(b =>
            b >= 32 && b <= 126
              ? String.fromCharCode(b)
              : `\\x${b.toString(16).padStart(2, '0')}`
          )
          .join('');

        throw new GifValidationError(
          `Unknown separator: 0x${separator.toString(
            16
          )} ('${char}') at position ${this.position - 1}. ` +
            `Context: "${contextStr}". This may indicate the file is not a valid GIF or is corrupted.`
        );
      }
    }

    return this.frames;
  }

  /**
   * Checks if the GIF is animated
   */
  isAnimated(): boolean {
    const info = this.getInfo();
    return info.frameCount > 1;
  }

  /**
   * Gets the dominant colors from the global color table
   */
  getDominantColors(count = 5): RGBColor[] {
    const info = this.getInfo();
    if (!info.globalColorTable) {
      return [];
    }

    const colors: RGBColor[] = [];
    const colorTable = info.globalColorTable;

    for (let i = 0; i < Math.min(count, colorTable.length / 3); i++) {
      const offset = i * 3;
      colors.push({
        red: colorTable[offset],
        green: colorTable[offset + 1],
        blue: colorTable[offset + 2],
      });
    }

    return colors;
  }

  /**
   * Gets all colors from the global color table
   */
  getAllColors(): RGBColor[] {
    const info = this.getInfo();
    if (!info.globalColorTable) {
      return [];
    }

    const colors: RGBColor[] = [];
    const colorTable = info.globalColorTable;

    for (let i = 0; i < colorTable.length / 3; i++) {
      const offset = i * 3;
      colors.push({
        red: colorTable[offset],
        green: colorTable[offset + 1],
        blue: colorTable[offset + 2],
      });
    }

    return colors;
  }
}

/**
 * Convenience function to read GIF info from buffer
 */
export function readGifInfo(data: Uint8Array): GifInfo {
  const reader = new GifReader(data);
  return reader.getInfo();
}

/**
 * Convenience function to check if data is a valid GIF
 */
export function isValidGif(data: Uint8Array): boolean {
  try {
    new GifReader(data);
    return true;
  } catch {
    return false;
  }
}
