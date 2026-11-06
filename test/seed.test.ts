import { expect, describe, it } from "vitest";
import { mnemonicToSeed, generateEntropy, entropyToMnemonic, englishWordList } from "../src";

describe("mnemonicToSeed", () => {
  it("should generate a seed from a mnemonic phrase", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    const seed = mnemonicToSeed(mnemonic);

    expect(seed).toHaveLength(128); // 64 bytes = 128 hex characters
    expect(seed).toMatch(/^[a-f0-9]+$/);
  });

  it("should generate different seeds with different passphrases", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    const seed1 = mnemonicToSeed(mnemonic, "passphrase1");
    const seed2 = mnemonicToSeed(mnemonic, "passphrase2");

    expect(seed1).not.toBe(seed2);
  });

  it("should generate the same seed with the same passphrase", () => {
    const entropy = generateEntropy(32);
    const mnemonic = entropyToMnemonic(entropy, englishWordList);
    const seed1 = mnemonicToSeed(mnemonic, "test");
    const seed2 = mnemonicToSeed(mnemonic, "test");

    expect(seed1).toBe(seed2);
  });

  it("should throw error for empty mnemonic", () => {
    expect(() => mnemonicToSeed("")).toThrow();
    expect(() => mnemonicToSeed("   ")).toThrow();
  });

  it("should throw error for invalid mnemonic (too few words)", () => {
    expect(() => mnemonicToSeed("word1 word2 word3")).toThrow();
  });

  it("should throw error for invalid mnemonic (too many words)", () => {
    const tooManyWords = Array(25).fill("word").join(" ");
    expect(() => mnemonicToSeed(tooManyWords)).toThrow();
  });
});
