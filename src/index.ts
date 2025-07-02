/**
 * Modern TypeScript GIF Tools
 *
 * A robust, zero-dependency library for creating GIF files
 * with support for both static and animated GIFs.
 */

// Core types and interfaces
export * from './types.js';

// Utility functions
export * from './utils.js';

// GIF writer implementation
export { GifWriter, ByteArrayOutputStream } from './writer.js';

// LZW compression
export { compressLZW, validateLZWParams } from './lzw.js';

// Color quantization
export { MedianCutQuantizer, quantizeImage } from './quantizer.js';

// Convenience functions for common use cases
export {
  createStaticGif,
  createAnimatedGif,
  createSolidColorGif,
  createCheckerboardGif,
  createGradientGif,
  createAnimatedGradientGif,
  canvasToImageData,
  createImageData,
} from './helpers.js';

// GIF reading capabilities
export { GifReader, readGifInfo, isValidGif } from './reader.js';

export type { GifFrame, GifInfo, GifMetadata } from './reader.js';

// Frame manipulation utilities
export {
  cropImage,
  resizeImage,
  rotateImage,
  flipImage,
  adjustColors,
  blurImage,
  reverseGif,
  changeGifSpeed,
  manipulateGif,
} from './frame-utils.js';

export type {
  CropOptions,
  ResizeOptions,
  RotateOptions,
  FlipOptions,
  ColorAdjustOptions,
  GifSpeedOptions,
  GifManipulationOptions,
} from './frame-utils.js';

// Advanced pattern generators
export {
  createNoiseGif,
  createFractalGif,
  createGeometricGif,
  createSpiralGif,
} from './patterns.js';

export type {
  NoiseOptions,
  FractalOptions,
  GeometricOptions,
  SpiralOptions,
} from './patterns.js';

// GIF result wrapper for convenient output formats
export { GifResult } from './gif-result.js';
