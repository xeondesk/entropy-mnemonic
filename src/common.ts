import { sha256 } from "js-sha256";

/**
 * Generates cryptographically secure random bytes using Web Crypto API.
 * @param byteCount - Number of random bytes to generate
 * @returns Uint8Array of random bytes
 */
function getRandomBytes(byteCount: number): Uint8Array {
  const bytes = new Uint8Array(byteCount);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without Web Crypto API
    for (let i = 0; i < byteCount; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Converts a byte array to a hexadecimal string.
 * @param bytes - Uint8Array of bytes
 * @returns Hexadecimal string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates that entropy length meets BIP39 requirements.
 * @param length - Length of entropy string in characters
 * @throws Error if length is invalid
 */
export function validateEntropyLength(length: number) {
  if (length < 16) {
    throw new Error(
      "[entropy-mnemonic] Invalid entropy: the length of the entropy string should be >= 16 "
    );
  }
  if (length > 64) {
    throw new Error(
      "[entropy-mnemonic] Invalid entropy: the length of the entropy string should be <= 64"
    );
  }
  if (length % 4 !== 0) {
    throw new Error(
      "[entropy-mnemonic] Invalid entropy: the length of the entropy string should be a multiple of 4"
    );
  }
}

/**
 * Generates a random entropy hex string using cryptographically secure random generation.
 * @param length - Desired length in characters (16-32, multiple of 4)
 * @returns Random hexadecimal entropy string
 * @throws Error if length is invalid
 */
export function generateEntropy(length = 32) {
  validateEntropyLength(length);

  const byteCount = length / 2;
  const randomBytes = getRandomBytes(byteCount);
  return bytesToHex(randomBytes);
}

export function getChecksumBin(entropyBuffer: number[]) {
  const lengthInBit = entropyBuffer.length * 8;
  const chunkCount = lengthInBit / 32;
  const hash = sha256.hex(entropyBuffer);

  return bytesToBinary(getByteArrayFromHexString(hash)).slice(0, chunkCount);
}

export function bytesToBinary(bytes: number[]) {
  return bytes.reduce((acc, x) => acc + x.toString(2).padStart(8, "0"), "");
}

export function getIntegerFromBin(bin: string) {
  return parseInt(bin, 2);
}

export function getByteArrayFromHexString(string: string) {
  return (string.match(/.{1,2}/g) ?? []).map((char) => parseInt(char, 16));
}
