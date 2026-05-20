/**
 * CLI utilities — argument parsing, color parsing, and frame processing helpers.
 *
 * These helpers are intentionally framework-free so the CLI inherits the
 * zero-dependency posture of the library itself.
 */

import { RGBColor, ImageData } from '../types.js';
import { GifReader } from '../reader.js';
import { createAnimatedGif, createStaticGif } from '../helpers.js';
import { GifResult } from '../gif-result.js';

/** Error class for user-facing CLI failures (bad flags, missing input, etc). */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/** Result of parsing CLI argv. */
export interface ParsedArgs {
  positional: string[];
  options: Map<string, string | boolean>;
}

/**
 * Minimal argv parser supporting:
 *   --flag             → boolean true
 *   --key value        → string
 *   --key=value        → string
 *   -k value / -k      → same, single-char aliases
 *   anything else      → positional
 *
 * Negative numbers (`-0.5`, `-3`) are treated as values, not as flags, so
 * `--brightness -0.3` works as expected.
 */
function looksLikeFlag(arg: string): boolean {
  if (!arg.startsWith('-') || arg === '-') return false;
  // Negative numbers like -0.5 or -3 are values, not flags.
  if (/^-\.?\d/.test(arg)) return false;
  return true;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const options = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--') {
      // Everything after `--` is positional
      positional.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        options.set(body.slice(0, eq), body.slice(eq + 1));
        continue;
      }
      const next = argv[i + 1];
      if (next === undefined || looksLikeFlag(next)) {
        options.set(body, true);
      } else {
        options.set(body, next);
        i++;
      }
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      const body = arg.slice(1);
      const next = argv[i + 1];
      if (next === undefined || looksLikeFlag(next)) {
        options.set(body, true);
      } else {
        options.set(body, next);
        i++;
      }
      continue;
    }

    positional.push(arg);
  }

  return { positional, options };
}

function getRaw(
  args: ParsedArgs,
  keys: string[]
): string | boolean | undefined {
  for (const k of keys) {
    if (args.options.has(k)) return args.options.get(k);
  }
  return undefined;
}

export function getString(
  args: ParsedArgs,
  ...keys: string[]
): string | undefined {
  const v = getRaw(args, keys);
  if (v === undefined) return undefined;
  if (typeof v !== 'string') {
    throw new CliError(`Option --${keys[0]} requires a value`);
  }
  return v;
}

export function requireString(args: ParsedArgs, ...keys: string[]): string {
  const v = getString(args, ...keys);
  if (v === undefined)
    throw new CliError(`Missing required option --${keys[0]}`);
  return v;
}

export function getNumber(
  args: ParsedArgs,
  ...keys: string[]
): number | undefined {
  const v = getString(args, ...keys);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new CliError(`Option --${keys[0]} must be numeric, got: ${v}`);
  }
  return n;
}

export function requireNumber(args: ParsedArgs, ...keys: string[]): number {
  const v = getNumber(args, ...keys);
  if (v === undefined)
    throw new CliError(`Missing required option --${keys[0]}`);
  return v;
}

export function getInt(
  args: ParsedArgs,
  ...keys: string[]
): number | undefined {
  const v = getNumber(args, ...keys);
  if (v === undefined) return undefined;
  if (!Number.isInteger(v)) {
    throw new CliError(`Option --${keys[0]} must be an integer, got: ${v}`);
  }
  return v;
}

export function requireInt(args: ParsedArgs, ...keys: string[]): number {
  const v = getInt(args, ...keys);
  if (v === undefined)
    throw new CliError(`Missing required option --${keys[0]}`);
  return v;
}

export function getBool(args: ParsedArgs, ...keys: string[]): boolean {
  const v = getRaw(args, keys);
  if (v === undefined) return false;
  if (typeof v === 'boolean') return v;
  const lower = v.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  if (lower === 'false' || lower === '0' || lower === 'no') return false;
  throw new CliError(`Option --${keys[0]} expects a boolean, got: ${v}`);
}

export function getChoice<T extends string>(
  args: ParsedArgs,
  keys: string[],
  choices: readonly T[]
): T | undefined {
  const v = getString(args, ...keys);
  if (v === undefined) return undefined;
  if (!(choices as readonly string[]).includes(v)) {
    throw new CliError(
      `Option --${keys[0]} must be one of: ${choices.join(', ')} (got: ${v})`
    );
  }
  return v as T;
}

/**
 * Parses a color string. Accepts:
 *   - "r,g,b"   e.g. "255,0,0"
 *   - "#rrggbb" e.g. "#ff0000"
 *   - "#rgb"    e.g. "#f00"
 */
export function parseColor(input: string): RGBColor {
  const trimmed = input.trim();

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new CliError(`Invalid hex color: ${input}`);
    }
    if (hex.length === 3) {
      return {
        red: parseInt(hex[0] + hex[0], 16),
        green: parseInt(hex[1] + hex[1], 16),
        blue: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        red: parseInt(hex.slice(0, 2), 16),
        green: parseInt(hex.slice(2, 4), 16),
        blue: parseInt(hex.slice(4, 6), 16),
      };
    }
    throw new CliError(`Hex color must be #rgb or #rrggbb: ${input}`);
  }

  const parts = trimmed.split(',').map(s => s.trim());
  if (parts.length !== 3) {
    throw new CliError(`Color must be "r,g,b" or "#rrggbb", got: ${input}`);
  }

  const components = parts.map((p, idx) => {
    const n = Number(p);
    const label = ['red', 'green', 'blue'][idx];
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      throw new CliError(`Invalid ${label} component "${p}" (must be 0-255)`);
    }
    return n;
  });

  return { red: components[0], green: components[1], blue: components[2] };
}

export function getColor(
  args: ParsedArgs,
  ...keys: string[]
): RGBColor | undefined {
  const v = getString(args, ...keys);
  return v === undefined ? undefined : parseColor(v);
}

/** Parses "color1;color2;..." (semicolons because commas separate RGB). */
export function getColorList(
  args: ParsedArgs,
  ...keys: string[]
): RGBColor[] | undefined {
  const v = getString(args, ...keys);
  if (v === undefined) return undefined;
  return v.split(';').map(s => parseColor(s));
}

/** Reads a file into a Uint8Array, surfacing a friendly error if it's missing. */
export async function readGifFile(path: string): Promise<Uint8Array> {
  const fs = await import('fs');
  try {
    const buf = await fs.promises.readFile(path);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new CliError(`Failed to read ${path}: ${message}`);
  }
}

/** Ensures the parent directory of `outputPath` exists before writing. */
export async function ensureParentDir(outputPath: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.dirname(outputPath);
  if (dir && dir !== '.' && dir !== '/') {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

/**
 * Reads a GIF, applies a per-frame transform, and writes the result.
 *
 * For single-frame GIFs the output is a static GIF; for animated GIFs the
 * original delays and loop count are preserved.
 */
export async function processGifFrames(
  inputPath: string,
  outputPath: string,
  transform: (frame: ImageData) => ImageData,
  options: { maxColors?: number } = {}
): Promise<GifResult> {
  const data = await readGifFile(inputPath);
  const reader = new GifReader(data);
  const info = reader.getInfo();
  const frames = reader.getFrames();

  if (frames.length === 0) {
    throw new CliError('Input GIF contains no frames');
  }

  const transformed = frames.map(f => transform(f.imageData));

  let result: GifResult;
  if (transformed.length === 1) {
    result = createStaticGif(transformed[0], { maxColors: options.maxColors });
  } else {
    result = createAnimatedGif(transformed, {
      maxColors: options.maxColors,
      loops: info.loops,
      imageOptions: frames.map(f => ({ delay: f.delay })),
    });
  }

  await ensureParentDir(outputPath);
  await result.saveToFile(outputPath);
  return result;
}

/** Formats a byte count for human display ("1.5 KB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k))
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}
