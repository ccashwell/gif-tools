#!/usr/bin/env node
/**
 * gif-tools CLI entrypoint.
 *
 * Run `gif-tools --help` for usage. Each command has its own help string in
 * the dispatcher below.
 */

import { CliError } from './utils.js';
import {
  adjustCommand,
  blurCommand,
  createCommand,
  cropCommand,
  extractCommand,
  flipCommand,
  infoCommand,
  optimizeCommand,
  reverseCommand,
  resizeCommand,
  rotateCommand,
  speedCommand,
} from './commands.js';

const HELP = `gif-tools — terminal toolkit for creating, inspecting, and editing GIFs.

USAGE
  gif-tools <command> [options]

COMMANDS
  info <input>              Show metadata for a GIF
  create <type> <output>    Create a new GIF (see "create types" below)

  resize <input>            Resize every frame
  crop <input>              Crop every frame
  rotate <input>            Rotate every frame (90 / 180 / 270)
  flip <input>              Flip horizontally and/or vertically
  adjust <input>            Adjust brightness, contrast, saturation, hue
  blur <input>              Box-blur every frame

  reverse <input>           Reverse frame order
  speed <input>             Change playback speed
  optimize <input>          Re-encode with --max-colors and/or --scale
  extract <input>           Write each frame to its own GIF

CREATE TYPES
  solid               --width N --height N --color R,G,B
  gradient            --width N --height N --start R,G,B --end R,G,B [--direction horizontal|vertical|diagonal]
  animated-gradient   --width N --height N --start R,G,B --end R,G,B
                      [--animation-type shift|rotate|pulse|wave] [--frames N] [--delay N]
                      [--loops N] [--intensity F] [--direction ...] [--max-colors N]
  checkerboard        --width N --height N --color1 R,G,B --color2 R,G,B [--check-size N]
  noise               --width N --height N [--type white|perlin|simplex] [--scale F] [--seed N]
                      [--colors "R,G,B;R,G,B"]
  fractal             --width N --height N [--type mandelbrot|julia|sierpinski] [--iterations N]
                      [--zoom F] [--center-x F] [--center-y F] [--colors "..."]
  geometric           --width N --height N [--shape circles|squares|triangles|hexagons]
                      [--count N] [--size-variation F] [--colors "..."] [--background R,G,B]
  spiral              --width N --height N [--type archimedean|logarithmic|fibonacci]
                      [--turns N] [--thickness N] [--colors "..."]

COMMON OPTIONS
  -o, --output <file>       Output path (required for edit/create commands)
  --max-colors N            Palette size for re-encoded output (default 256)
  -q, --quiet               Suppress status output
  -h, --help                Show this help
  -V, --version             Print the package version

COLOR FORMATS
  R,G,B (e.g. 255,128,0) or #rrggbb (e.g. #ff8000) or #rgb (e.g. #f80).
  Color lists use ; as the separator: "255,0,0;0,255,0;0,0,255".

EXAMPLES
  gif-tools info pic.gif --dominant 5
  gif-tools create solid red.gif --width 64 --height 64 --color #ff0000
  gif-tools create animated-gradient sweep.gif -w 200 -h 100 \\
      --start #ff0000 --end #0000ff --animation-type shift --frames 24
  gif-tools resize in.gif -o small.gif --scale 0.5
  gif-tools speed in.gif -o fast.gif --multiplier 2
  gif-tools optimize in.gif -o small.gif --max-colors 64 --scale 0.5
  gif-tools extract in.gif --output-dir frames/
`;

async function readPackageVersion(): Promise<string> {
  try {
    const fs = await import('fs');
    const url = await import('url');
    const path = await import('path');

    const here = path.dirname(url.fileURLToPath(import.meta.url));
    // Compiled location: lib/src/cli/index.js → ../../../package.json
    // Source location:   src/cli/index.ts    → ../../package.json
    for (const rel of ['../../../package.json', '../../package.json']) {
      try {
        const contents = await fs.promises.readFile(
          path.resolve(here, rel),
          'utf8'
        );
        const pkg = JSON.parse(contents) as { version?: unknown };
        if (typeof pkg.version === 'string') return pkg.version;
      } catch {
        // try next candidate
      }
    }
  } catch {
    // fall through
  }
  return 'unknown';
}

async function main(argv: string[]): Promise<number> {
  const command = argv[0];
  const rest = argv.slice(1);
  const quiet = argv.includes('-q') || argv.includes('--quiet');
  const ctx = { quiet };

  if (
    !command ||
    command === '--help' ||
    command === '-h' ||
    command === 'help'
  ) {
    process.stdout.write(HELP);
    return 0;
  }

  if (command === '--version' || command === '-V' || command === 'version') {
    const version = await readPackageVersion();
    process.stdout.write(`gif-tools ${version}\n`);
    return 0;
  }

  // Top-level --help inside a command should still print the global help.
  // Per-command usage hints come from the commands themselves on missing args.
  switch (command) {
    case 'info':
      await infoCommand(rest, ctx);
      return 0;
    case 'create':
      await createCommand(rest, ctx);
      return 0;
    case 'resize':
      await resizeCommand(rest, ctx);
      return 0;
    case 'crop':
      await cropCommand(rest, ctx);
      return 0;
    case 'rotate':
      await rotateCommand(rest, ctx);
      return 0;
    case 'flip':
      await flipCommand(rest, ctx);
      return 0;
    case 'adjust':
      await adjustCommand(rest, ctx);
      return 0;
    case 'blur':
      await blurCommand(rest, ctx);
      return 0;
    case 'reverse':
      await reverseCommand(rest, ctx);
      return 0;
    case 'speed':
      await speedCommand(rest, ctx);
      return 0;
    case 'optimize':
      await optimizeCommand(rest, ctx);
      return 0;
    case 'extract':
      await extractCommand(rest, ctx);
      return 0;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n`);
      process.stderr.write(HELP);
      return 2;
  }
}

main(process.argv.slice(2))
  .then(code => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    if (err instanceof CliError) {
      process.stderr.write(`error: ${err.message}\n`);
    } else if (err instanceof Error) {
      process.stderr.write(`error: ${err.message}\n`);
      if (process.env.DEBUG) process.stderr.write((err.stack ?? '') + '\n');
    } else {
      process.stderr.write(`error: ${String(err)}\n`);
    }
    process.exitCode = 1;
  });
