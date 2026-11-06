import { expect, describe, it } from "vitest";
import {
  validateMnemonic,
  getWordCount,
  getEntropyBits,
  generateEntropy,
  entropyToMnemonic,
  englishWordList,
} from "../src";

describe("validateMnemonic", () => {
  it("should return true for a valid mnemonic", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it("should return false for an invalid mnemonic", () => {
    expect(validateMnemonic("invalid mnemonic phrase")).toBe(false);
    expect(validateMnemonic("word1 word2 word3")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(validateMnemonic("")).toBe(false);
  });

  it("should validate mnemonics with different word counts", () => {
    const entropy12 = generateEntropy(32);
    const mnemonic12 = entropyToMnemonic(entropy12, englishWordList);
    expect(validateMnemonic(mnemonic12)).toBe(true);

    const entropy24 = generateEntropy(64);
    const mnemonic24 = entropyToMnemonic(entropy24, englishWordList);
    expect(validateMnemonic(mnemonic24)).toBe(true);
  });
});

describe("getWordCount", () => {
  it("should return the correct word count for a mnemonic", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getWordCount(mnemonic)).toBe(12);
  });

  it("should return 12 for 32 hex chars (128-bit entropy)", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getWordCount(mnemonic)).toBe(12);
  });

  it("should return 15 for 40 hex chars (160-bit entropy)", () => {
    const entropy = generateEntropy(40);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getWordCount(mnemonic)).toBe(15);
  });

  it("should return 18 for 48 hex chars (192-bit entropy)", () => {
    const entropy = generateEntropy(48);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getWordCount(mnemonic)).toBe(18);
  });

  it("should return 21 for 56 hex chars (224-bit entropy)", () => {
    const entropy = generateEntropy(56);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getWordCount(mnemonic)).toBe(21);
  });

  it("should return 24 for 64 hex chars (256-bit entropy)", () => {
    const entropy = generateEntropy(64);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getWordCount(mnemonic)).toBe(24);
  });

  it("should handle extra whitespace", () => {
    const mnemonic = "word1 word2 word3   word4";
    expect(getWordCount(mnemonic)).toBe(4);
  });

  it("should handle empty string", () => {
    expect(getWordCount("")).toBe(0);
  });
});

describe("getEntropyBits", () => {
  it("should return 128 for 12-word mnemonic", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getEntropyBits(mnemonic)).toBe(128);
  });

  it("should return 160 for 15-word mnemonic", () => {
    const entropy = generateEntropy(40);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getEntropyBits(mnemonic)).toBe(160);
  });

  it("should return 192 for 18-word mnemonic", () => {
    const entropy = generateEntropy(48);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getEntropyBits(mnemonic)).toBe(192);
  });

  it("should return 224 for 21-word mnemonic", () => {
    const entropy = generateEntropy(56);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getEntropyBits(mnemonic)).toBe(224);
  });

  it("should return 256 for 24-word mnemonic", () => {
    const entropy = generateEntropy(64);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    expect(getEntropyBits(mnemonic)).toBe(256);
  });

  it("should throw error for invalid word count", () => {
    expect(() => getEntropyBits("word1 word2 word3")).toThrow();
    expect(() => getEntropyBits("word1 word2 word3 word4")).toThrow();
  });
});
