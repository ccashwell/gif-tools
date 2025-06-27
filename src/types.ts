/**
 * Core types and interfaces for GIF tools
 */

/** RGB color component intensity (0-255) */
export type ColorIntensity = number;

/** RGB color representation */
export interface RGBColor {
  readonly red: ColorIntensity;
  readonly green: ColorIntensity;
  readonly blue: ColorIntensity;
}

/** Image dimensions */
export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

/** Indexed color image data */
export interface IndexedImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  readonly palette: Uint8Array; // RGB triplets
}

/** Full color image data (RGBA) */
export interface ImageData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray; // RGBA format
}

/** Output stream interface for writing GIF data */
export interface OutputStream {
  writeByte(byte: number): void;
  writeBytes(bytes: Uint8Array | number[]): void;
}

/** GIF disposal methods */
export enum DisposalMethod {
  /** No disposal specified */
  None = 0,
  /** Do not dispose */
  DoNotDispose = 1,
  /** Restore to background color */
  RestoreToBackground = 2,
  /** Restore to previous */
  RestoreToPrevious = 3,
}

/** Options for global color table */
export interface GlobalColorTableOptions {
  /** Color table data as RGB triplets */
  readonly colors?: Uint8Array;
  /** Whether colors are sorted by importance */
  readonly sorted?: boolean;
  /** Background color index */
  readonly backgroundColorIndex?: number;
  /** Pixel aspect ratio */
  readonly pixelAspectRatio?: number;
}

/** Options for individual image frames */
export interface ImageOptions {
  /** Left position in logical screen */
  readonly left?: number;
  /** Top position in logical screen */
  readonly top?: number;
  /** Delay time in milliseconds */
  readonly delay?: number;
  /** How to dispose of this frame */
  readonly disposal?: DisposalMethod;
  /** Transparent color index (-1 for no transparency) */
  readonly transparentIndex?: number;
}

/** Options for animated GIFs */
export interface AnimationOptions {
  /** Number of times to loop (0 for infinite) */
  readonly loops?: number;
}

/** Error types */
export class GifError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'GifError';
  }
}

export class GifValidationError extends GifError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'GifValidationError';
  }
}

export class GifEncodingError extends GifError {
  constructor(message: string) {
    super(message, 'ENCODING_ERROR');
    this.name = 'GifEncodingError';
  }
}
