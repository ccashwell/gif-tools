# Modern TypeScript GIF Tools

A robust, zero-dependency TypeScript library for creating GIF files with support
for both static and animated GIFs. Built with modern TypeScript features and
designed to work in both Node.js and browser environments.

## Features

- 🎨 **Static and Animated GIFs**: Create both single-frame and multi-frame GIFs
- 📖 **GIF Reading & Analysis**: Read, parse, and extract frames from existing
  GIF files
- 🔍 **Metadata Extraction**: Parse GIF extensions, comments, and embedded data
- 🎞️ **Frame Extraction**: Extract individual frames as ImageData objects
- 🌈 **Color Quantization**: Advanced median-cut algorithm for optimal color
  reduction
- 🔧 **Modern TypeScript**: Full type safety with comprehensive error handling
- 📦 **Zero Dependencies**: No external dependencies, works everywhere
- 🏃‍♂️ **Performance**: Efficient LZW compression and decompression algorithms
- 🎯 **Cross-Platform**: Works in Node.js, browsers, and other JavaScript
  environments

## Installation

```bash
npm install gif-tools
```

## Quick Start

### Creating a Static GIF

```typescript
import { createSolidColorGif } from 'gif-tools';

// Create a 100x100 red GIF (returns a GifResult)
const gif = createSolidColorGif(100, 100, {
  red: 255,
  green: 0,
  blue: 0,
});

// In Node.js, you can save the GIF to a file
gif.saveToFile('red-square.gif');

// In the browser, you can download the GIF:
gif.download('red-square.gif');

// Or you can get the GIF as a data URL:
const dataUrl = gif.toDataURL();

// Or you can get the GIF as a blob:
const blob = gif.toBlob();
```

### Creating an Animated GIF

```typescript
import { createAnimatedGif, createImageData } from 'gif-tools';

// Build a couple of solid color frames
const frame1 = createImageData(
  50,
  50,
  new Uint8Array(10000).fill(255) // White
);
const frame2 = createImageData(
  50,
  50,
  new Uint8Array(10000).fill(0) // Black
);

// Create animated GIF (returns a GifResult)
const gif = createAnimatedGif([frame1, frame2], {
  // 500ms between frames (default is 100ms)
  delay: 500,

  // Loop forever (number of loops, 0 = infinite)
  loops: 0,

  // Use up to 256 colors (recommended for animations)
  maxColors: 256,
});
```

### Working with Canvas (Browser)

```typescript
import { canvasToImageData, createStaticGif } from 'gif-tools';

// Get canvas element
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;

// Convert canvas content to GIF
const imageData = canvasToImageData(canvas);
const gif = createStaticGif(imageData);

// The GifResult object offers convenience functions:
gif.download('awesome.gif'); // Trigger save dialog (browser only)
const dataUrl = gif.toDataURL(); // For <img> src attributes
const blob = gif.toBlob(); // For fetch requests
const objectUrl = gif.toObjectURL(); // For custom links

// Display in an image element
const img = document.createElement('img');
img.src = gif.toDataURL();
document.body.appendChild(img);

// Get file info
console.log(`Created ${gif.sizeFormatted} GIF`);
```

## Advanced Usage

### Using the Low-Level API

You can use the low-level API to create and manipulate GIFs with full control
over the format. This allows you to do things like compose GIFs dynamically from
multiple image sources, adjust the delay between frames, add transparency, manage
global color tables, and more.

```typescript
import {
  ByteArrayOutputStream,
  GifWriter,
  IndexedImage,
  MedianCutQuantizer,
} from 'gif-tools';

// Create a custom GIF with full control
const writer = new GifWriter();

// Create indexed image with quantization
const quantizer = new MedianCutQuantizer(16); // Reduce to 16 colors
const indexedImage = quantizer.quantize(imageData);

// Write GIF with custom options
writer
  .writeHeader()
  .writeLogicalScreen(imageData.width, imageData.height, {
    colors: indexedImage.palette,
    backgroundColorIndex: 0,
  })
  .writeImage(indexedImage, {
    left: 0,
    top: 0,
    delay: 100,
    transparentIndex: 0, // Make color 0 transparent
  })
  .writeTrailer();

// Get the raw data as Uint8Array
const gif = writer.toUint8Array();
```

### Creating Pattern GIFs

You can also create GIFs with customized pattern and gradient presets easily.

```typescript
import { createCheckerboardGif, createGradientGif } from 'gif-tools';

// Checkerboard pattern
const checkerboard = createCheckerboardGif(
  200,
  200,
  { red: 255, green: 0, blue: 0 }, // Red
  { red: 0, green: 0, blue: 255 }, // Blue
  20 // 20px squares
);

// Gradient
const gradient = createGradientGif(
  300,
  100,
  { red: 255, green: 0, blue: 0 }, // Start: Red
  { red: 0, green: 0, blue: 255 }, // End: Blue
  'horizontal'
);
```

### Creating Animated Gradients

Create stunning animated gradients with various effects:

```typescript
import { createAnimatedGradientGif } from 'gif-tools';

// Shifting gradient - slides across the image
const shiftGradient = createAnimatedGradientGif(
  200,
  100,
  { red: 255, green: 0, blue: 0 },
  { red: 0, green: 0, blue: 255 },
  {
    direction: 'horizontal',
    animationType: 'shift',
    frames: 20,
    delay: 100,
    loops: 0,
    intensity: 1.0,
  }
);

// Pulsing gradient - pulses in and out
const pulseGradient = createAnimatedGradientGif(
  150,
  150,
  { red: 0, green: 255, blue: 0 },
  { red: 255, green: 0, blue: 255 },
  {
    direction: 'diagonal',
    animationType: 'pulse',
    frames: 30,
    delay: 80,
    intensity: 0.8,
  }
);

// Wave gradient - wavy distortion effect
const waveGradient = createAnimatedGradientGif(
  200,
  100,
  { red: 255, green: 255, blue: 0 },
  { red: 0, green: 255, blue: 255 },
  {
    direction: 'vertical',
    animationType: 'wave',
    frames: 25,
    delay: 120,
    intensity: 0.6,
  }
);

// Rotating colors - cycles through color spectrum
const rotateGradient = createAnimatedGradientGif(
  150,
  150,
  { red: 255, green: 0, blue: 0 },
  { red: 0, green: 0, blue: 255 },
  {
    animationType: 'rotate',
    frames: 40,
    delay: 75,
    intensity: 1.0,
  }
);
```

## Reading and Analyzing GIFs

The library provides powerful capabilities for reading, analyzing, and
extracting data from existing GIF files, including metadata, frames, and color
information.

### Reading GIF Information

```typescript
import { GifReader, isValidGif, readGifInfo } from 'gif-tools';

// Load GIF data (Node.js example)
import { readFileSync } from 'fs';
const gifData = readFileSync('animated.gif');

// Quick validation
if (isValidGif(gifData)) {
  console.log('Valid GIF file!');
}

// Get basic information
const info = readGifInfo(gifData);
console.log(`Dimensions: ${info.width}×${info.height}`);
console.log(`Frames: ${info.frameCount}`);
console.log(`Duration: ${info.duration}ms`);
console.log(`File size: ${info.size} bytes`);
console.log(`Version: GIF${info.version}`);
console.log(`Loops: ${info.loops === 0 ? 'infinite' : info.loops}`);
```

### Extracting Frames

```typescript
// Create a reader instance for advanced operations
const reader = new GifReader(gifData);

// Extract all frames
const frames = reader.getFrames();

frames.forEach((frame, index) => {
  console.log(`Frame ${index + 1}:`);
  console.log(`  Size: ${frame.imageData.width}×${frame.imageData.height}`);
  console.log(`  Delay: ${frame.delay}ms`);
  console.log(`  Position: (${frame.left}, ${frame.top})`);
  console.log(`  Disposal: ${frame.disposal}`);

  // Convert frame to canvas (browser)
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = frame.imageData.width;
    canvas.height = frame.imageData.height;

    const ctx = canvas.getContext('2d');
    ctx.putImageData(frame.imageData, 0, 0);

    // Now you can save or display the frame
    document.body.appendChild(canvas);
  }
});

// Check if the GIF is animated
if (reader.isAnimated()) {
  console.log('This is an animated GIF!');
}
```

### Color Analysis

```typescript
// Extract color information
const allColors = reader.getAllColors();
console.log(`Total colors in palette: ${allColors.length}`);

// Get dominant colors (most common)
const dominantColors = reader.getDominantColors(5);
dominantColors.forEach((color, index) => {
  console.log(
    `Color ${index + 1}: rgb(${color.red}, ${color.green}, ${color.blue})`
  );
});
```

### Metadata and Extensions

The library can parse and extract various types of metadata and extensions found
in GIF files:

```typescript
const info = readGifInfo(gifData);
const metadata = info.metadata;

// Technical flags
console.log('Technical Information:');
console.log(`  Interlaced frames: ${metadata.hasInterlacedFrames}`);
console.log(`  Transparency: ${metadata.hasTransparency}`);
console.log(`  Local color tables: ${metadata.hasLocalColorTables}`);

// Extensions found in the file
if (metadata.extensions.length > 0) {
  console.log('Extensions found:');
  metadata.extensions.forEach(ext => {
    console.log(`  • ${ext}`);
  });
}

// Embedded comments
if (metadata.comments.length > 0) {
  console.log('Comments:');
  metadata.comments.forEach((comment, index) => {
    console.log(`  ${index + 1}: "${comment}"`);
  });
}

// XMP metadata (if present)
if (metadata.xmpData) {
  console.log('XMP Metadata found:');
  console.log(metadata.xmpData);
}

// Technical details
console.log('Technical Details:');
console.log(
  `  Average frame size: ${metadata.technicalDetails.averageFrameSize} bytes`
);
console.log(
  `  Total data size: ${metadata.technicalDetails.totalDataSize} bytes`
);
```

### Supported Extensions

The library can detect and parse these common GIF extensions:

- **Netscape 2.0**: Animation control (loop count)
- **XMP Metadata**: Adobe XMP metadata
- **ICC Color Profiles**: Color management data
- **Comment Extensions**: Text comments embedded in the file
- **Plain Text Extensions**: Text overlay information
- **Application Extensions**: Various proprietary extensions (MAGPIE, Adobe,
  etc.)
- **Private Extensions**: Custom application-specific data

### Browser Usage for File Upload

```typescript
// Handle file uploads in the browser
function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const arrayBuffer = e.target?.result as ArrayBuffer;
    const uint8Array = new Uint8Array(arrayBuffer);

    if (isValidGif(uint8Array)) {
      const gifReader = new GifReader(uint8Array);
      const info = gifReader.getInfo();

      console.log('Uploaded GIF info:', info);

      // Extract and display frames
      const frames = gifReader.getFrames();
      displayFrames(frames);
    } else {
      console.error('Invalid GIF file');
    }
  };

  reader.readAsArrayBuffer(file);
}

function displayFrames(frames: GifFrame[]) {
  frames.forEach((frame, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = frame.imageData.width;
    canvas.height = frame.imageData.height;

    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(frame.imageData, 0, 0);

    // Add frame info
    const container = document.createElement('div');
    container.appendChild(canvas);
    container.appendChild(
      document.createTextNode(`Frame ${index + 1} (${frame.delay}ms)`)
    );

    document.body.appendChild(container);
  });
}
```

## API Reference

### Helper Functions

#### `createStaticGif(imageData, options?): GifResult`

Creates a static GIF from image data.

**Parameters:**

- `imageData`: `ImageData` - RGBA image data
- `options`: Optional configuration
  - `maxColors`: Maximum colors (default: 256)
  - `globalColorTable`: Global color table options
  - `imageOptions`: Image-specific options

**Returns:** `GifResult` - Rich wrapper with convenient conversion methods

#### `createAnimatedGif(frames, options?): GifResult`

Creates an animated GIF from multiple frames.

**Parameters:**

- `frames`: `ImageData[]` - Array of image frames
- `options`: Optional configuration
  - `maxColors`: Maximum colors (default: 256)
  - `delay`: Delay between frames in ms (default: 100)
  - `loops`: Number of loops, 0 for infinite (default: 0)

**Returns:** `GifResult` - Rich wrapper with convenient conversion methods

#### `createSolidColorGif(width, height, color): GifResult`

Creates a solid color GIF.

**Returns:** `GifResult` - Rich wrapper with convenient conversion methods

#### `createAnimatedGradientGif(width, height, startColor, endColor, options?): GifResult`

Creates an animated gradient GIF with various animation effects.

**Parameters:**

- `width`: `number` - Image width in pixels
- `height`: `number` - Image height in pixels
- `startColor`: `RGBColor` - Starting color `{red, green, blue}`
- `endColor`: `RGBColor` - Ending color `{red, green, blue}`
- `options`: Optional configuration
  - `direction`: `'horizontal' | 'vertical' | 'diagonal'` (default:
    'horizontal')
  - `animationType`: `'shift' | 'rotate' | 'pulse' | 'wave'` (default: 'shift')
  - `frames`: Number of animation frames (default: 20)
  - `delay`: Delay between frames in ms (default: 100)
  - `loops`: Number of loops, 0 for infinite (default: 0)
  - `intensity`: Animation strength, 0-1 (default: 1.0)

**Animation Types:**

- `shift`: Gradient slides/shifts across the image
- `rotate`: Colors rotate through the color spectrum
- `pulse`: Gradient pulses in and out with sine wave
- `wave`: Wave-like distortion creates flowing effect

**Returns:** `GifResult` - Rich wrapper with convenient conversion methods

#### `readGifInfo(data: Uint8Array): GifInfo`

Reads and parses GIF file information without extracting frames.

**Parameters:**

- `data`: `Uint8Array` - Raw GIF file data

**Returns:** `GifInfo` - Comprehensive information object with metadata

#### `isValidGif(data: Uint8Array): boolean`

Validates whether the data represents a valid GIF file.

**Parameters:**

- `data`: `Uint8Array` - Raw data to validate

**Returns:** `boolean` - True if valid GIF format

### Core Classes

#### `GifReader`

Advanced GIF reading and analysis class:

```typescript
const reader = new GifReader(gifData);

// Basic information
const info = reader.getInfo(); // Complete GIF information
const isAnimated = reader.isAnimated(); // Check if animated

// Frame extraction
const frames = reader.getFrames(); // Extract all frames
// frames[0].imageData // ImageData for frame 0
// frames[0].delay // Frame delay in milliseconds
// frames[0].disposal // Disposal method
// frames[0].left, frames[0].top // Frame position
// frames[0].transparentIndex // Transparent color index

// Color analysis
const allColors = reader.getAllColors(); // Complete color palette
const dominant = reader.getDominantColors(5); // Top N colors by usage
```

**Types:**

```typescript
interface GifInfo {
  width: number; // Image dimensions
  height: number;
  frameCount: number; // Number of frames
  loops: number; // Loop count (0 = infinite)
  globalColorTable?: Uint8Array; // Global color palette
  backgroundColorIndex: number; // Background color
  duration: number; // Total duration in milliseconds
  size: number; // File size in bytes
  version: string; // GIF version ('87a' or '89a')
  metadata: GifMetadata; // Comprehensive metadata
}

interface GifMetadata {
  extensions: string[]; // List of extensions found
  comments: string[]; // Embedded comments
  hasInterlacedFrames: boolean; // Uses interlacing
  hasLocalColorTables: boolean; // Has local color tables
  hasTransparency: boolean; // Uses transparency
  xmpData?: string; // XMP metadata if present
  technicalDetails: {
    totalDataSize: number; // File size
    averageFrameSize: number; // Average bytes per frame
    compressionRatio?: number; // Compression efficiency
  };
}

interface GifFrame {
  imageData: ImageData; // Frame pixel data
  delay: number; // Display duration in milliseconds
  disposal: DisposalMethod; // How to handle this frame
  left: number; // X position within GIF canvas
  top: number; // Y position within GIF canvas
  transparentIndex: number; // Transparent color (-1 if none)
}

enum DisposalMethod {
  DoNotDispose = 0, // Keep frame on screen
  RestoreToBackground = 1, // Clear frame area
  RestoreToPrevious = 2, // Restore to previous frame
}
```

#### `GifResult`

Rich wrapper around GIF data with convenient conversion methods:

```typescript
const gif = createStaticGif(imageData);

// Raw data access
gif.toUint8Array(); // Always returns Uint8Array
gif.toBuffer(); // Node.js Buffer or Uint8Array in browser

// Web-friendly formats
gif.toDataURL(); // data:image/gif;base64,... for <img> src
gif.toBlob(); // Blob for file operations (browser only)
gif.toObjectURL(); // blob:... URL for links (browser only)
gif.toStream(); // ReadableStream (when available)

// File operations
gif.download('file.gif'); // Trigger download (browser only)
await gif.saveToFile('path.gif'); // Save to file (Node.js only)

// Properties and utilities
gif.size; // Size in bytes
gif.sizeFormatted; // Human-readable size (e.g., "2.5 KB")
gif.mimeType; // "image/gif"
gif.extension; // "gif"
gif.isValidGif(); // Validate GIF signature
gif.getInfo(); // Comprehensive info object
```

#### `GifWriter`

Low-level GIF writing with full control over the format.

#### `MedianCutQuantizer`

Advanced color quantization using the median cut algorithm.

#### `ByteArrayOutputStream`

Output stream for collecting GIF data.

## Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
import { GifEncodingError, GifValidationError } from 'gif-tools';

try {
  const gif = createSolidColorGif(-10, 10, { red: 256, green: 0, blue: 0 });
} catch (error) {
  if (error instanceof GifValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof GifEncodingError) {
    console.error('Encoding failed:', error.message);
  }
}
```

## Performance Tips

1. **Reduce Colors**: Use fewer colors for smaller file sizes
2. **Optimize Frames**: Remove duplicate frames in animations
3. **Size Appropriately**: Smaller dimensions = faster processing
4. **Batch Operations**: Process multiple GIFs in sequence for better
   performance

## Cross-Platform Compatibility

This library is designed to work identically in both Node.js and browser
environments:

### Output Format

- **Primary**: All helper functions return `GifResult` objects with adaptive
  methods
- **Raw Data**: `toUint8Array()` always returns `Uint8Array` (works everywhere)
- **Node.js**: `toBuffer()` returns Node.js `Buffer` when available
- **Browser**: `toBuffer()` gracefully falls back to `Uint8Array` when `Buffer`
  is not available

### Environment Detection

```typescript
const gif = createStaticGif(imageData);

// Raw data - works everywhere
const rawData = gif.toUint8Array(); // Always Uint8Array

// Adaptive - returns appropriate type for environment
const bufferOrArray = gif.toBuffer(); // Buffer in Node.js, Uint8Array in browser

// Environment-specific methods
if (typeof document !== 'undefined') {
  // Browser environment
  gif.download('image.gif');
  const dataUrl = gif.toDataURL();
} else {
  // Node.js environment
  await gif.saveToFile('image.gif');
}
```

## Browser Compatibility

This library works in all modern browsers that support:

- `Uint8Array`
- `Map` and `Set`
- ES6 features

For older browsers, use a polyfill or transpile the code. Or maybe just don't
use old browsers?

## Node.js Compatibility

Requires Node.js 12+ for full ES6 support.

## Contributing

Contributions are welcome! Please read the contributing guidelines and **ensure
all tests pass** before submitting a PR.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Prior Work and Acknowledgments

- Based on the
  [GIF89a specification](https://www.w3.org/Graphics/GIF/spec-gif89a.txt)
- Implements
  [LZW compression algorithm](https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Welch)
- Uses [median cut algorithm](https://en.wikipedia.org/wiki/Median_cut) for
  color quantization
