/**
 * CLI command implementations.
 *
 * Each command takes the already-parsed argv tail (everything after the
 * top-level command name) and performs its work. Commands write to stdout/
 * stderr for status and exit non-zero by throwing CliError.
 */

import {
  CliError,
  ParsedArgs,
  ensureParentDir,
  formatBytes,
  getBool,
  getChoice,
  getColor,
  getColorList,
  getInt,
  getNumber,
  getString,
  parseArgs,
  processGifFrames,
  readGifFile,
  requireInt,
  requireString,
} from './utils.js';

import {
  adjustColors,
  blurImage,
  cropImage,
  flipImage,
  manipulateGif,
  resizeImage,
  rotateImage,
} from '../frame-utils.js';

import {
  createAnimatedGif,
  createAnimatedGradientGif,
  createCheckerboardGif,
  createGradientGif,
  createSolidColorGif,
  createStaticGif,
} from '../helpers.js';

import {
  createFractalGif,
  createGeometricGif,
  createNoiseGif,
  createSpiralGif,
} from '../patterns.js';

import { GifReader } from '../reader.js';
import { GifResult } from '../gif-result.js';

const ROTATE_ANGLES = [90, 180, 270] as const;
const RESIZE_ALGORITHMS = ['nearest', 'bilinear'] as const;
const GRADIENT_DIRECTIONS = ['horizontal', 'vertical', 'diagonal'] as const;
const ANIMATION_TYPES = ['shift', 'rotate', 'pulse', 'wave'] as const;
const NOISE_TYPES = ['white', 'perlin', 'simplex'] as const;
const FRACTAL_TYPES = ['mandelbrot', 'julia', 'sierpinski'] as const;
const GEOMETRIC_SHAPES = [
  'circles',
  'squares',
  'triangles',
  'hexagons',
] as const;
const SPIRAL_TYPES = ['archimedean', 'logarithmic', 'fibonacci'] as const;

interface CommandContext {
  quiet: boolean;
}

function log(ctx: CommandContext, msg: string): void {
  if (!ctx.quiet) process.stdout.write(msg + '\n');
}

function reportResult(
  ctx: CommandContext,
  outputPath: string,
  result: GifResult
): void {
  log(ctx, `Wrote ${outputPath} (${result.sizeFormatted})`);
}

// ─── info ──────────────────────────────────────────────────────────────────

export async function infoCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input) throw new CliError('Usage: gif-tools info <input.gif>');

  const showColors = getBool(args, 'colors');
  const dominantCount = getInt(args, 'dominant') ?? 0;

  const data = await readGifFile(input);
  const reader = new GifReader(data);
  const info = reader.getInfo();

  const lines: string[] = [];
  lines.push(`File:        ${input}`);
  lines.push(`Size:        ${formatBytes(info.size)} (${info.size} bytes)`);
  lines.push(`Version:     GIF${info.version}`);
  lines.push(`Dimensions:  ${info.width} × ${info.height}`);
  lines.push(`Frames:      ${info.frameCount}`);
  lines.push(`Animated:    ${reader.isAnimated() ? 'yes' : 'no'}`);
  lines.push(
    `Duration:    ${info.duration}ms${
      info.frameCount > 1
        ? ` (avg ${Math.round(info.duration / info.frameCount)}ms/frame)`
        : ''
    }`
  );
  lines.push(`Loops:       ${info.loops === 0 ? 'infinite' : info.loops}`);
  lines.push(`Color res:   ${info.colorResolution} bits`);
  lines.push(`Bg index:    ${info.backgroundColorIndex}`);
  lines.push(`Aspect:      ${info.pixelAspectRatio}`);

  const md = info.metadata;
  lines.push('');
  lines.push('Metadata:');
  lines.push(`  Transparency:        ${md.hasTransparency ? 'yes' : 'no'}`);
  lines.push(`  Interlaced frames:   ${md.hasInterlacedFrames ? 'yes' : 'no'}`);
  lines.push(`  Local color tables:  ${md.hasLocalColorTables ? 'yes' : 'no'}`);
  if (md.extensions.length) {
    lines.push(`  Extensions:          ${md.extensions.join(', ')}`);
  }
  if (md.comments.length) {
    lines.push('  Comments:');
    md.comments.forEach(c => lines.push(`    - ${c}`));
  }
  if (md.xmpData) {
    lines.push(`  XMP metadata:        ${md.xmpData.length} bytes`);
  }

  if (dominantCount > 0) {
    const dominant = reader.getDominantColors(dominantCount);
    lines.push('');
    lines.push(`Dominant colors (top ${dominant.length}):`);
    dominant.forEach((c, i) => {
      const hex = `#${[c.red, c.green, c.blue]
        .map(n => n.toString(16).padStart(2, '0'))
        .join('')}`;
      lines.push(`  ${i + 1}. ${hex}  rgb(${c.red}, ${c.green}, ${c.blue})`);
    });
  }

  if (showColors) {
    const all = reader.getAllColors();
    lines.push('');
    lines.push(`Unique colors: ${all.length}`);
  }

  log(ctx, lines.join('\n'));
}

// ─── frame transforms ──────────────────────────────────────────────────────

function commonOutputAndMaxColors(args: ParsedArgs): {
  output: string;
  maxColors?: number;
} {
  const output = requireString(args, 'output', 'o');
  const maxColors = getInt(args, 'max-colors');
  return { output, maxColors };
}

export async function resizeCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools resize <input.gif> --output <file> [...]'
    );

  const { output, maxColors } = commonOutputAndMaxColors(args);
  const width = getInt(args, 'width', 'w');
  const height = getInt(args, 'height', 'h');
  const scale = getNumber(args, 'scale', 's');
  const algorithm = getChoice(args, ['algorithm', 'a'], RESIZE_ALGORITHMS);

  if (scale === undefined && width === undefined && height === undefined) {
    throw new CliError('Provide --width, --height, and/or --scale');
  }

  // Need source dimensions to compute targets if not all given explicitly.
  const data = await readGifFile(input);
  const reader = new GifReader(data);
  const info = reader.getInfo();

  let targetW: number;
  let targetH: number;
  if (scale !== undefined) {
    if (scale <= 0) throw new CliError('--scale must be > 0');
    targetW = Math.max(1, Math.round(info.width * scale));
    targetH = Math.max(1, Math.round(info.height * scale));
  } else if (width !== undefined && height !== undefined) {
    targetW = width;
    targetH = height;
  } else if (width !== undefined) {
    targetW = width;
    targetH = Math.max(1, Math.round((width / info.width) * info.height));
  } else if (height !== undefined) {
    targetH = height;
    targetW = Math.max(1, Math.round((height / info.height) * info.width));
  } else {
    // Unreachable: guarded above. Re-thrown for type-narrowing.
    throw new CliError('Provide --width, --height, and/or --scale');
  }

  const result = await processGifFrames(
    input,
    output,
    f => resizeImage(f, { width: targetW, height: targetH, algorithm }),
    { maxColors }
  );
  log(ctx, `Resized ${info.width}×${info.height} → ${targetW}×${targetH}`);
  reportResult(ctx, output, result);
}

export async function cropCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools crop <input.gif> --output <file> --x N --y N --width N --height N'
    );

  const { output, maxColors } = commonOutputAndMaxColors(args);
  const x = requireInt(args, 'x');
  const y = requireInt(args, 'y');
  const width = requireInt(args, 'width', 'w');
  const height = requireInt(args, 'height', 'h');

  const result = await processGifFrames(
    input,
    output,
    f => cropImage(f, { x, y, width, height }),
    { maxColors }
  );
  reportResult(ctx, output, result);
}

export async function rotateCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools rotate <input.gif> --output <file> --angle 90|180|270'
    );

  const { output, maxColors } = commonOutputAndMaxColors(args);
  const angleNum = requireInt(args, 'angle');
  if (!(ROTATE_ANGLES as readonly number[]).includes(angleNum)) {
    throw new CliError(`--angle must be one of ${ROTATE_ANGLES.join(', ')}`);
  }
  const angle = angleNum as (typeof ROTATE_ANGLES)[number];

  const result = await processGifFrames(
    input,
    output,
    f => rotateImage(f, { angle }),
    { maxColors }
  );
  reportResult(ctx, output, result);
}

export async function flipCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools flip <input.gif> --output <file> [--horizontal] [--vertical]'
    );

  const { output, maxColors } = commonOutputAndMaxColors(args);
  const horizontal = getBool(args, 'horizontal', 'H');
  const vertical = getBool(args, 'vertical', 'V');
  if (!horizontal && !vertical) {
    throw new CliError('Pass --horizontal and/or --vertical');
  }

  const result = await processGifFrames(
    input,
    output,
    f => flipImage(f, { horizontal, vertical }),
    { maxColors }
  );
  reportResult(ctx, output, result);
}

export async function adjustCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools adjust <input.gif> --output <file> [--brightness N] [--contrast N] [--saturation N] [--hue N]'
    );

  const { output, maxColors } = commonOutputAndMaxColors(args);
  const brightness = getNumber(args, 'brightness', 'b');
  const contrast = getNumber(args, 'contrast', 'c');
  const saturation = getNumber(args, 'saturation', 's');
  const hue = getNumber(args, 'hue');

  if (
    brightness === undefined &&
    contrast === undefined &&
    saturation === undefined &&
    hue === undefined
  ) {
    throw new CliError(
      'Provide at least one of --brightness, --contrast, --saturation, --hue'
    );
  }

  const result = await processGifFrames(
    input,
    output,
    f => adjustColors(f, { brightness, contrast, saturation, hue }),
    { maxColors }
  );
  reportResult(ctx, output, result);
}

export async function blurCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools blur <input.gif> --output <file> [--radius N]'
    );

  const { output, maxColors } = commonOutputAndMaxColors(args);
  const radius = getInt(args, 'radius', 'r') ?? 1;
  if (radius < 1) throw new CliError('--radius must be >= 1');

  const result = await processGifFrames(
    input,
    output,
    f => blurImage(f, radius),
    { maxColors }
  );
  reportResult(ctx, output, result);
}

// ─── animation manipulation ────────────────────────────────────────────────

export async function reverseCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError('Usage: gif-tools reverse <input.gif> --output <file>');

  const output = requireString(args, 'output', 'o');
  const data = await readGifFile(input);
  const result = manipulateGif(data, { reverse: true });
  await ensureParentDir(output);
  await result.saveToFile(output);
  reportResult(ctx, output, result);
}

export async function speedCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools speed <input.gif> --output <file> --multiplier N'
    );

  const output = requireString(args, 'output', 'o');
  const multiplier = getNumber(args, 'multiplier', 'm');
  if (multiplier === undefined)
    throw new CliError(
      '--multiplier is required (e.g. 2 for 2× speed, 0.5 for half)'
    );
  const minDelay = getInt(args, 'min-delay');
  const maxDelay = getInt(args, 'max-delay');
  const reverse = getBool(args, 'reverse');

  const data = await readGifFile(input);
  const result = manipulateGif(data, {
    reverse,
    speed: { speedMultiplier: multiplier, minDelay, maxDelay },
  });
  await ensureParentDir(output);
  await result.saveToFile(output);
  reportResult(ctx, output, result);
}

// ─── optimize / re-encode ──────────────────────────────────────────────────

export async function optimizeCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools optimize <input.gif> --output <file> [--max-colors N] [--scale F]'
    );

  const output = requireString(args, 'output', 'o');
  const maxColors = getInt(args, 'max-colors') ?? 256;
  const scale = getNumber(args, 'scale');

  const data = await readGifFile(input);
  const reader = new GifReader(data);
  const info = reader.getInfo();
  const frames = reader.getFrames();

  const transformed = frames.map(f => {
    if (scale === undefined) return f.imageData;
    const w = Math.max(1, Math.round(f.imageData.width * scale));
    const h = Math.max(1, Math.round(f.imageData.height * scale));
    return resizeImage(f.imageData, {
      width: w,
      height: h,
      algorithm: 'bilinear',
    });
  });

  let result: GifResult;
  if (transformed.length === 1) {
    result = createStaticGif(transformed[0], { maxColors });
  } else {
    result = createAnimatedGif(transformed, {
      maxColors,
      loops: info.loops,
      imageOptions: frames.map(f => ({ delay: f.delay })),
    });
  }

  await ensureParentDir(output);
  await result.saveToFile(output);

  const before = info.size;
  const after = result.size;
  const delta = before === 0 ? 0 : ((after - before) / before) * 100;
  log(
    ctx,
    `Re-encoded ${formatBytes(before)} → ${formatBytes(after)} (${
      delta >= 0 ? '+' : ''
    }${delta.toFixed(1)}%) with ${maxColors} colors${
      scale !== undefined ? `, scale ${scale}` : ''
    }`
  );
  reportResult(ctx, output, result);
}

// ─── extract frames ────────────────────────────────────────────────────────

export async function extractCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const args = parseArgs(argv);
  const input = args.positional[0];
  if (!input)
    throw new CliError(
      'Usage: gif-tools extract <input.gif> --output-dir <dir> [--prefix frame]'
    );

  const outDir = requireString(args, 'output-dir', 'd');
  const prefix = getString(args, 'prefix') ?? 'frame';
  const maxColors = getInt(args, 'max-colors');

  const data = await readGifFile(input);
  const reader = new GifReader(data);
  const frames = reader.getFrames();
  if (frames.length === 0) throw new CliError('Input GIF has no frames');

  const fs = await import('fs');
  await fs.promises.mkdir(outDir, { recursive: true });

  const normalizedDir = outDir.replace(/\/+$/, '');
  const pad = String(frames.length - 1).length;
  for (let i = 0; i < frames.length; i++) {
    const filename = `${normalizedDir}/${prefix}-${String(i).padStart(
      pad,
      '0'
    )}.gif`;
    const result = createStaticGif(frames[i].imageData, { maxColors });
    await result.saveToFile(filename);
    log(
      ctx,
      `Wrote ${filename} (${result.sizeFormatted}, delay ${frames[i].delay}ms)`
    );
  }
  log(ctx, `Extracted ${frames.length} frame(s) to ${normalizedDir}/`);
}

// ─── create ────────────────────────────────────────────────────────────────

function commonDimensions(args: ParsedArgs): { width: number; height: number } {
  const width = requireInt(args, 'width', 'w');
  const height = requireInt(args, 'height', 'h');
  if (width <= 0 || height <= 0)
    throw new CliError('--width and --height must be positive');
  return { width, height };
}

export async function createCommand(
  argv: string[],
  ctx: CommandContext
): Promise<void> {
  const subcommand = argv[0];
  if (!subcommand || subcommand.startsWith('-')) {
    throw new CliError(
      'Usage: gif-tools create <solid|gradient|animated-gradient|checkerboard|noise|fractal|geometric|spiral> <output.gif> [...]'
    );
  }

  const rest = argv.slice(1);
  const args = parseArgs(rest);
  const output = args.positional[0];
  if (!output) {
    throw new CliError(
      `Usage: gif-tools create ${subcommand} <output.gif> [...]`
    );
  }

  let result: GifResult;
  switch (subcommand) {
    case 'solid': {
      const { width, height } = commonDimensions(args);
      const color = getColor(args, 'color', 'c');
      if (!color)
        throw new CliError(
          '--color is required (e.g. --color 255,0,0 or --color #ff0000)'
        );
      result = createSolidColorGif(width, height, color);
      break;
    }
    case 'gradient': {
      const { width, height } = commonDimensions(args);
      const start = getColor(args, 'start', 's');
      const end = getColor(args, 'end', 'e');
      if (!start || !end)
        throw new CliError('--start and --end colors are required');
      const direction =
        getChoice(args, ['direction', 'd'], GRADIENT_DIRECTIONS) ??
        'horizontal';
      result = createGradientGif(width, height, start, end, direction);
      break;
    }
    case 'animated-gradient': {
      const { width, height } = commonDimensions(args);
      const start = getColor(args, 'start', 's');
      const end = getColor(args, 'end', 'e');
      if (!start || !end)
        throw new CliError('--start and --end colors are required');
      const direction = getChoice(
        args,
        ['direction', 'd'],
        GRADIENT_DIRECTIONS
      );
      const animationType = getChoice(
        args,
        ['animation-type', 'type'],
        ANIMATION_TYPES
      );
      const frames = getInt(args, 'frames');
      const delay = getInt(args, 'delay');
      const loops = getInt(args, 'loops');
      const intensity = getNumber(args, 'intensity');
      const maxColors = getInt(args, 'max-colors');
      result = createAnimatedGradientGif(width, height, start, end, {
        direction,
        animationType,
        frames,
        delay,
        loops,
        intensity,
        maxColors,
      });
      break;
    }
    case 'checkerboard': {
      const { width, height } = commonDimensions(args);
      const color1 = getColor(args, 'color1', 'a');
      const color2 = getColor(args, 'color2', 'b');
      if (!color1 || !color2)
        throw new CliError('--color1 and --color2 are required');
      const checkSize = getInt(args, 'check-size') ?? 10;
      result = createCheckerboardGif(width, height, color1, color2, checkSize);
      break;
    }
    case 'noise': {
      const { width, height } = commonDimensions(args);
      result = createNoiseGif(width, height, {
        type: getChoice(args, ['type', 't'], NOISE_TYPES),
        scale: getNumber(args, 'scale'),
        seed: getNumber(args, 'seed'),
        colors: getColorList(args, 'colors'),
      });
      break;
    }
    case 'fractal': {
      const { width, height } = commonDimensions(args);
      result = createFractalGif(width, height, {
        type: getChoice(args, ['type', 't'], FRACTAL_TYPES),
        maxIterations: getInt(args, 'iterations'),
        zoom: getNumber(args, 'zoom'),
        centerX: getNumber(args, 'center-x'),
        centerY: getNumber(args, 'center-y'),
        colors: getColorList(args, 'colors'),
      });
      break;
    }
    case 'geometric': {
      const { width, height } = commonDimensions(args);
      result = createGeometricGif(width, height, {
        shape: getChoice(args, ['shape', 's'], GEOMETRIC_SHAPES),
        count: getInt(args, 'count'),
        sizeVariation: getNumber(args, 'size-variation'),
        colors: getColorList(args, 'colors'),
        backgroundColor: getColor(args, 'background', 'bg'),
      });
      break;
    }
    case 'spiral': {
      const { width, height } = commonDimensions(args);
      result = createSpiralGif(width, height, {
        type: getChoice(args, ['type', 't'], SPIRAL_TYPES),
        turns: getInt(args, 'turns'),
        thickness: getInt(args, 'thickness'),
        colors: getColorList(args, 'colors'),
      });
      break;
    }
    default:
      throw new CliError(`Unknown create type: ${subcommand}`);
  }

  await ensureParentDir(output);
  await result.saveToFile(output);
  reportResult(ctx, output, result);
}
