/**
 * LZW (Lempel-Ziv-Welch) compression for GIF encoding
 */

import { GifEncodingError } from './types.js';
import { MAX_CODE_VALUE } from './utils.js';

/**
 * Converts LZW codes to byte array with bit packing
 */
class CodeToBytesConverter {
  private output: number[] = [];
  private remainingBits = 0;
  private remainingValue = 0;

  /**
   * Pushes a code with specified bit length
   */
  push(code: number, numBits: number): void {
    if (code < 0 || numBits <= 0) {
      throw new GifEncodingError(
        `Invalid code or bit length: code=${code}, bits=${numBits}`
      );
    }

    while (numBits > 0) {
      // Calculate how many bits we can take from the code
      const bitsToTake = Math.min(numBits, 8 - this.remainingBits);

      // Extract the bits we need from the code
      const mask = (1 << bitsToTake) - 1;
      const bits = code & mask;

      // Add these bits to our remaining value
      this.remainingValue |= bits << this.remainingBits;
      this.remainingBits += bitsToTake;

      if (this.remainingBits >= 8) {
        // Output complete byte
        this.output.push(this.remainingValue & 0xff);

        // Shift remaining value and adjust bit count
        this.remainingValue >>= 8;
        this.remainingBits -= 8;
      }

      // Move to next part of the code
      code >>= bitsToTake;
      numBits -= bitsToTake;
    }
  }

  /**
   * Flushes any remaining bits and returns the byte array
   */
  flush(): Uint8Array {
    // Output any remaining bits
    if (this.remainingBits > 0) {
      this.output.push(this.remainingValue & 0xff);
    }

    const result = new Uint8Array(this.output);

    // Reset state
    this.output = [];
    this.remainingBits = 0;
    this.remainingValue = 0;

    return result;
  }
}

/**
 * LZW compression dictionary
 */
class LZWDictionary {
  private readonly dictionary = new Map<string, number>();
  private nextCode = 0;
  private readonly clearCode: number;
  private readonly endCode: number;

  constructor(private readonly initialCodeSize: number) {
    this.clearCode = 1 << initialCodeSize;
    this.endCode = this.clearCode + 1;
    this.reset();
  }

  get clear(): number {
    return this.clearCode;
  }

  get end(): number {
    return this.endCode;
  }

  get next(): number {
    return this.nextCode;
  }

  /**
   * Resets the dictionary to initial state
   */
  reset(): void {
    this.dictionary.clear();
    this.nextCode = this.endCode + 1;

    // Initialize with single-character codes
    for (let i = 0; i < this.clearCode; i++) {
      this.dictionary.set(String.fromCharCode(i), i);
    }
  }

  /**
   * Checks if a string exists in the dictionary
   */
  has(str: string): boolean {
    return this.dictionary.has(str);
  }

  /**
   * Gets the code for a string
   */
  get(str: string): number | undefined {
    return this.dictionary.get(str);
  }

  /**
   * Adds a new string to the dictionary
   */
  add(str: string): number {
    if (this.nextCode > MAX_CODE_VALUE) {
      throw new GifEncodingError('Dictionary overflow');
    }

    const code = this.nextCode++;
    this.dictionary.set(str, code);
    return code;
  }

  /**
   * Checks if dictionary needs to be reset
   */
  shouldReset(): boolean {
    return this.nextCode > MAX_CODE_VALUE;
  }
}

/**
 * Calculates the number of bits needed for a code
 */
function calculateCodeBits(maxCode: number, initialBits: number): number {
  if (maxCode < 1 << initialBits) {
    return initialBits;
  }

  let bits = initialBits;
  let max = 1 << bits;

  while (max <= maxCode && bits < 12) {
    bits++;
    max <<= 1;
  }

  return Math.min(bits, 12);
}

/**
 * Compresses data using LZW algorithm
 */
export function compressLZW(
  data: Uint8Array,
  initialCodeSize: number
): Uint8Array {
  if (data.length === 0) {
    throw new GifEncodingError('Cannot compress empty data');
  }

  if (initialCodeSize < 1 || initialCodeSize > 8) {
    throw new GifEncodingError(
      `Invalid initial code size: ${initialCodeSize}. Must be 1-8`
    );
  }

  const converter = new CodeToBytesConverter();
  const dictionary = new LZWDictionary(initialCodeSize);

  // Start with clear code
  let currentBits = initialCodeSize + 1;
  converter.push(dictionary.clear, currentBits);

  let currentString = '';

  for (let i = 0; i < data.length; i++) {
    const char = String.fromCharCode(data[i]);
    const newString = currentString + char;

    if (dictionary.has(newString)) {
      currentString = newString;
    } else {
      // Output the code for current string
      const code = dictionary.get(currentString);
      if (code === undefined) {
        throw new GifEncodingError(
          `String not found in dictionary: ${currentString}`
        );
      }

      converter.push(code, currentBits);

      // Add new string to dictionary if there's room
      if (!dictionary.shouldReset()) {
        dictionary.add(newString);

        // Check if we need more bits - increase when next code would require more bits
        const newBits = calculateCodeBits(
          dictionary.next - 1,
          initialCodeSize + 1
        );
        if (newBits > currentBits && newBits <= 12) {
          currentBits = newBits;
        }
      } else {
        // Dictionary is full, send clear code and reset
        converter.push(dictionary.clear, currentBits);
        dictionary.reset();
        currentBits = initialCodeSize + 1;
      }

      currentString = char;
    }
  }

  // Output final string
  if (currentString.length > 0) {
    const code = dictionary.get(currentString);
    if (code === undefined) {
      throw new GifEncodingError(
        `Final string not found in dictionary: ${currentString}`
      );
    }

    converter.push(code, currentBits);
  }

  // End with end-of-information code
  converter.push(dictionary.end, currentBits);

  return converter.flush();
}

/**
 * Reads codes from byte array with bit unpacking
 */
class BytesToCodeConverter {
  private position = 0;
  private bitBuffer = 0;
  private bitsInBuffer = 0;

  constructor(private data: Uint8Array) {}

  /**
   * Reads the next code with specified bit length
   */
  readCode(numBits: number): number | null {
    if (numBits <= 0 || numBits > 16) {
      throw new GifEncodingError(`Invalid bit length: ${numBits}`);
    }

    // Ensure we have enough bits in buffer
    while (this.bitsInBuffer < numBits && this.position < this.data.length) {
      this.bitBuffer |= this.data[this.position++] << this.bitsInBuffer;
      this.bitsInBuffer += 8;
    }

    // Check if we have enough bits
    if (this.bitsInBuffer < numBits) {
      return null;
    }

    // Extract the code
    const mask = (1 << numBits) - 1;
    const code = this.bitBuffer & mask;

    // Remove used bits from buffer
    this.bitBuffer >>= numBits;
    this.bitsInBuffer -= numBits;

    return code;
  }

  /**
   * Checks if there's more data to read
   */
  hasMore(): boolean {
    return this.position < this.data.length || this.bitsInBuffer > 0;
  }
}

/**
 * LZW decompression dictionary
 */
class LZWDecodeDictionary {
  private readonly dictionary: string[] = [];
  private nextCode = 0;
  private readonly clearCode: number;
  private readonly endCode: number;

  constructor(private readonly initialCodeSize: number) {
    this.clearCode = 1 << initialCodeSize;
    this.endCode = this.clearCode + 1;
    this.reset();
  }

  get clear(): number {
    return this.clearCode;
  }

  get end(): number {
    return this.endCode;
  }

  get next(): number {
    return this.nextCode;
  }

  /**
   * Resets the dictionary to initial state
   */
  reset(): void {
    this.dictionary.length = 0;

    // Initialize with single-character codes (0 to clearCode-1)
    for (let i = 0; i < this.clearCode; i++) {
      this.dictionary[i] = String.fromCharCode(i);
    }

    // Reserve slots for clear and end codes (but don't define them as strings)
    this.dictionary[this.clearCode] = undefined as any; // Clear code
    this.dictionary[this.endCode] = undefined as any; // End code

    // Next available code starts after end code
    this.nextCode = this.endCode + 1;
  }

  /**
   * Gets the string for a code
   */
  get(code: number): string | undefined {
    if (code >= this.dictionary.length) {
      return undefined;
    }
    return this.dictionary[code];
  }

  /**
   * Adds a new string to the dictionary
   */
  add(str: string): void {
    if (this.nextCode < MAX_CODE_VALUE) {
      this.dictionary[this.nextCode++] = str;
    }
  }

  /**
   * Checks if dictionary needs to be reset
   */
  shouldReset(): boolean {
    return this.nextCode >= MAX_CODE_VALUE;
  }
}

/**
 * Decompresses LZW-compressed data
 */
export function decompressLZW(
  compressedData: Uint8Array,
  initialCodeSize: number
): Uint8Array {
  if (compressedData.length === 0) {
    return new Uint8Array(0);
  }

  if (initialCodeSize < 1 || initialCodeSize > 8) {
    throw new GifEncodingError(
      `Invalid initial code size: ${initialCodeSize}. Must be 1-8`
    );
  }

  const converter = new BytesToCodeConverter(compressedData);
  const dictionary = new LZWDecodeDictionary(initialCodeSize);
  const output: number[] = [];

  let currentBits = initialCodeSize + 1;
  let previousString = '';

  while (converter.hasMore()) {
    const code = converter.readCode(currentBits);
    if (code === null) break;

    // Handle special codes
    if (code === dictionary.clear) {
      dictionary.reset();
      currentBits = initialCodeSize + 1;
      previousString = '';
      continue;
    }

    if (code === dictionary.end) {
      break;
    }

    let currentString: string;

    if (code < dictionary.next) {
      // Code exists in dictionary
      currentString = dictionary.get(code) || '';
    } else if (code === dictionary.next) {
      // Special case: code not yet in dictionary
      if (previousString.length === 0) {
        throw new GifEncodingError(
          `Invalid LZW sequence: first code ${code} not in dictionary`
        );
      }
      currentString = previousString + previousString.charAt(0);
    } else {
      throw new GifEncodingError(
        `Invalid LZW code: ${code} (dictionary size: ${
          dictionary.next
        }, bits: ${currentBits}, max for bits: ${(1 << currentBits) - 1})`
      );
    }

    // Output the string
    for (let i = 0; i < currentString.length; i++) {
      output.push(currentString.charCodeAt(i));
    }

    // Add new entry to dictionary if there's room and we have a previous string
    if (previousString.length > 0 && dictionary.next < MAX_CODE_VALUE) {
      dictionary.add(previousString + currentString.charAt(0));

      // Check if we need more bits AFTER adding to dictionary
      if (dictionary.next >= 1 << currentBits && currentBits < 12) {
        currentBits++;
      }
    }

    previousString = currentString;
  }

  return new Uint8Array(output);
}

/**
 * Validates LZW parameters
 */
export function validateLZWParams(data: Uint8Array, codeSize: number): void {
  if (!(data instanceof Uint8Array)) {
    throw new GifEncodingError('Data must be Uint8Array');
  }

  if (data.length === 0) {
    throw new GifEncodingError('Data cannot be empty');
  }

  if (!Number.isInteger(codeSize) || codeSize < 1 || codeSize > 8) {
    throw new GifEncodingError(
      `Invalid LZW code size: ${codeSize}. Must be integer 1-8`
    );
  }

  // Check if all data values are within the valid range for the code size
  const maxValue = (1 << codeSize) - 1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > maxValue) {
      throw new GifEncodingError(
        `Data value ${data[i]} at index ${i} exceeds maximum ${maxValue} for code size ${codeSize}`
      );
    }
  }
}
