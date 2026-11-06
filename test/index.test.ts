import { expect, describe, it } from "vitest";
import {
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
  getWordCount,
  getEntropyBits,
  mnemonicToSeed,
  generateEntropy,
  englishWordList,
  defaultList,
} from "../src/index";

describe("index exports", () => {
  it("should export all entropy functions", () => {
    expect(typeof entropyToMnemonic).toBe("function");
    expect(typeof generateEntropy).toBe("function");
  });

  it("should export all mnemonic functions", () => {
    expect(typeof mnemonicToEntropy).toBe("function");
    expect(typeof validateMnemonic).toBe("function");
    expect(typeof getWordCount).toBe("function");
    expect(typeof getEntropyBits).toBe("function");
  });

  it("should export seed function", () => {
    expect(typeof mnemonicToSeed).toBe("function");
  });

  it("should export word lists", () => {
    expect(englishWordList).toBeDefined();
    expect(defaultList).toBeDefined();
    expect(englishWordList.words).toBeInstanceOf(Array);
    expect(englishWordList.words.length).toBeGreaterThan(0);
  });

  it("should work with full import chain", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    const recoveredEntropy = mnemonicToEntropy(mnemonic, englishWordList);
    const isValid = validateMnemonic(mnemonic);
    const wordCount = getWordCount(mnemonic);
    const entropyBits = getEntropyBits(mnemonic);
    const seed = mnemonicToSeed(mnemonic);

    expect(entropy).toBe(recoveredEntropy);
    expect(isValid).toBe(true);
    expect(wordCount).toBe(12);
    expect(entropyBits).toBe(128);
    expect(seed).toHaveLength(128);
  });
});
