/**
 * CLI smoke tests.
 *
 * These exercise the command functions directly (not via subprocess) so they
 * pick up code coverage and stay fast. Each command writes through saveToFile,
 * so we redirect to a temp dir per test.
 */

import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { parseArgs, parseColor, CliError } from '../src/cli/utils.js';
import {
  createCommand,
  infoCommand,
  resizeCommand,
  rotateCommand,
  reverseCommand,
  speedCommand,
  optimizeCommand,
  extractCommand,
} from '../src/cli/commands.js';
import { isValidGif, readGifInfo } from '../src/index.js';

let tmpRoot: string;
const QUIET = { quiet: true };

beforeAll(async () => {
  tmpRoot = await fs.mkdtemp(join(tmpdir(), 'gif-tools-cli-'));
});

afterAll(async () => {
  // fs.rm isn't typed in the bundled @types/node, so fall back to rmdir.
  if (tmpRoot) await fs.rmdir(tmpRoot, { recursive: true });
});

function out(name: string): string {
  return join(tmpRoot, name);
}

async function readBytes(path: string): Promise<Uint8Array> {
  const buf = await fs.readFile(path);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe('parseArgs', () => {
  it('parses long options and positionals', () => {
    const r = parseArgs(['cmd', '--width', '100', '--flag', '--out=x.gif']);
    expect(r.positional).toEqual(['cmd']);
    expect(r.options.get('width')).toBe('100');
    expect(r.options.get('flag')).toBe(true);
    expect(r.options.get('out')).toBe('x.gif');
  });

  it('parses short aliases', () => {
    const r = parseArgs(['-o', 'file', '-h']);
    expect(r.options.get('o')).toBe('file');
    expect(r.options.get('h')).toBe(true);
  });

  it('accepts negative numbers as values', () => {
    const r = parseArgs(['--brightness', '-0.3', '--contrast', '-1']);
    expect(r.options.get('brightness')).toBe('-0.3');
    expect(r.options.get('contrast')).toBe('-1');
  });

  it('passes through arguments after --', () => {
    const r = parseArgs(['--flag', '--', '--not-a-flag']);
    expect(r.options.get('flag')).toBe(true);
    expect(r.positional).toEqual(['--not-a-flag']);
  });
});

describe('parseColor', () => {
  it('parses r,g,b', () => {
    expect(parseColor('255,0,128')).toEqual({ red: 255, green: 0, blue: 128 });
  });

  it('parses #rrggbb', () => {
    expect(parseColor('#ff0080')).toEqual({ red: 255, green: 0, blue: 128 });
  });

  it('parses #rgb', () => {
    expect(parseColor('#f08')).toEqual({ red: 255, green: 0, blue: 136 });
  });

  it('rejects malformed colors', () => {
    expect(() => parseColor('not-a-color')).toThrow(CliError);
    expect(() => parseColor('256,0,0')).toThrow(CliError);
    expect(() => parseColor('#xyz')).toThrow(CliError);
  });
});

describe('create commands', () => {
  it('creates a solid GIF', async () => {
    const path = out('solid.gif');
    await createCommand(
      ['solid', path, '--width', '16', '--height', '16', '--color', '#ff0000'],
      QUIET
    );
    const data = await readBytes(path);
    expect(isValidGif(data)).toBe(true);
    const info = readGifInfo(data);
    expect(info.width).toBe(16);
    expect(info.height).toBe(16);
  });

  it('creates an animated gradient', async () => {
    const path = out('anim.gif');
    await createCommand(
      [
        'animated-gradient',
        path,
        '-w',
        '32',
        '-h',
        '16',
        '--start',
        '#ff0000',
        '--end',
        '#0000ff',
        '--frames',
        '4',
        '--delay',
        '50',
      ],
      QUIET
    );
    const data = await readBytes(path);
    const info = readGifInfo(data);
    expect(info.frameCount).toBe(4);
    expect(info.width).toBe(32);
  });

  it('creates a checkerboard', async () => {
    const path = out('check.gif');
    await createCommand(
      [
        'checkerboard',
        path,
        '-w',
        '16',
        '-h',
        '16',
        '--color1',
        '#000',
        '--color2',
        '#fff',
        '--check-size',
        '4',
      ],
      QUIET
    );
    expect(isValidGif(await readBytes(path))).toBe(true);
  });

  it('rejects an unknown create subcommand', async () => {
    await expect(
      createCommand(['banana', out('x.gif')], QUIET)
    ).rejects.toThrow(CliError);
  });

  it('requires --color for solid', async () => {
    await expect(
      createCommand(
        ['solid', out('x.gif'), '--width', '8', '--height', '8'],
        QUIET
      )
    ).rejects.toThrow(/color is required/);
  });
});

describe('inspect & edit commands', () => {
  let source: string;

  beforeAll(async () => {
    source = out('source.gif');
    await createCommand(
      [
        'animated-gradient',
        source,
        '-w',
        '32',
        '-h',
        '16',
        '--start',
        '255,0,0',
        '--end',
        '0,0,255',
        '--frames',
        '4',
        '--delay',
        '80',
      ],
      QUIET
    );
  });

  it('info prints metadata without crashing', async () => {
    await infoCommand([source, '--dominant', '2'], QUIET);
  });

  it('info requires an input', async () => {
    await expect(infoCommand([], QUIET)).rejects.toThrow(/Usage/);
  });

  it('resize by scale', async () => {
    const target = out('resized.gif');
    await resizeCommand([source, '-o', target, '--scale', '0.5'], QUIET);
    const info = readGifInfo(await readBytes(target));
    expect(info.width).toBe(16);
    expect(info.height).toBe(8);
  });

  it('resize by explicit width preserves aspect', async () => {
    const target = out('w-only.gif');
    await resizeCommand([source, '-o', target, '--width', '16'], QUIET);
    const info = readGifInfo(await readBytes(target));
    expect(info.width).toBe(16);
    expect(info.height).toBe(8);
  });

  it('rotate 90 swaps dimensions', async () => {
    const target = out('rot.gif');
    await rotateCommand([source, '-o', target, '--angle', '90'], QUIET);
    const info = readGifInfo(await readBytes(target));
    expect(info.width).toBe(16);
    expect(info.height).toBe(32);
  });

  it('rotate rejects unsupported angles', async () => {
    await expect(
      rotateCommand([source, '-o', out('bad.gif'), '--angle', '45'], QUIET)
    ).rejects.toThrow(/angle/);
  });

  it('reverse preserves frame count', async () => {
    const target = out('rev.gif');
    await reverseCommand([source, '-o', target], QUIET);
    const info = readGifInfo(await readBytes(target));
    expect(info.frameCount).toBe(4);
  });

  it('speed accepts multiplier', async () => {
    const target = out('fast.gif');
    await speedCommand([source, '-o', target, '--multiplier', '2'], QUIET);
    expect(isValidGif(await readBytes(target))).toBe(true);
  });

  it('optimize re-encodes with custom palette', async () => {
    const target = out('opt.gif');
    await optimizeCommand(
      [source, '-o', target, '--max-colors', '16', '--scale', '0.5'],
      QUIET
    );
    const info = readGifInfo(await readBytes(target));
    expect(info.width).toBe(16);
  });

  it('extract writes one file per frame', async () => {
    const dir = out('frames');
    await extractCommand([source, '--output-dir', dir], QUIET);
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.gif'));
    expect(files).toHaveLength(4);
  });
});
