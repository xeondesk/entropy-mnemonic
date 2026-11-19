import { expect, describe, it } from "vitest";
import {
  getWordList,
  getDetectedWordList,
  detectLanguage,
  bip39SeedFromCommunity,
  mapMnemonicToCanonical,
  entropyToMnemonic,
  englishWordList,
  bengaliWordList,
  MnemonicError,
  WordlistNotFoundError,
  AmbiguousLanguageError,
  InvalidMnemonicError,
  PairingVerificationError,
  UnsupportedMappingError,
  isAmbiguousLanguageError,
  hasErrorCode,
} from "../src/index";
import type { IWordList } from "../src/index";

const BN = bengaliWordList;
const EN = englishWordList;

describe("error classes — machine-readable codes", () => {
  it("WordlistNotFoundError carries WORDLIST_NOT_FOUND", () => {
    try {
      getWordList("klingon");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(WordlistNotFoundError);
      expect(e).toBeInstanceOf(MnemonicError);
      expect((e as WordlistNotFoundError).code).toBe("WORDLIST_NOT_FOUND");
      expect(hasErrorCode(e, "WORDLIST_NOT_FOUND")).toBe(true);
    }
  });

  it("AmbiguousLanguageError via getDetectedWordList", () => {
    const words = [
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
      "india",
      "juliet",
      "kilo",
      "lima",
    ];
    const mk = (id: string): IWordList => ({
      id,
      language: id,
      spacer: " ",
      kind: "bip39",
      words: Object.freeze([...words, ...Array.from({ length: 2036 }, (_, i) => `${id}${i}`)]),
    });
    const a = mk("fx-a");
    const b = mk("fx-b"); // identical first 12 words -> ambiguous
    const phrase = words.join(" ");
    expect(() => getDetectedWordList(phrase, [a, b])).toThrow(AmbiguousLanguageError);
    try {
      getDetectedWordList(phrase, [a, b]);
    } catch (e) {
      expect((e as AmbiguousLanguageError).code).toBe("AMBIGUOUS_LANGUAGE");
      expect(isAmbiguousLanguageError(e)).toBe(true);
    }
    // no match at all also throws AmbiguousLanguageError
    expect(() => getDetectedWordList("zzzz yyyyy xxxx", [a])).toThrow(AmbiguousLanguageError);
    // unambiguous returns the list
    expect(getDetectedWordList(phrase, [a])).toBe(a);
  });

  it("PairingVerificationError on tampered pairing", () => {
    const tampered: IWordList = {
      ...BN,
      pairing: { ...BN.pairing!, contentHash: "deadbeef" },
    };
    const phrase = Array(12).fill(BN.words[0]).join(" ");
    try {
      mapMnemonicToCanonical(phrase, tampered);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(PairingVerificationError);
      expect(hasErrorCode(e, "PAIRING_VERIFICATION")).toBe(true);
    }
  });

  it("UnsupportedMappingError for non-community seed source", () => {
    const phrase = Array(12).fill(EN.words[0]).join(" ");
    try {
      bip39SeedFromCommunity(phrase, EN, "");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedMappingError);
      expect(hasErrorCode(e, "UNSUPPORTED_MAPPING")).toBe(true);
    }
  });

  it("InvalidMnemonicError for unknown word in mapping", () => {
    const phrase = Array(11).fill(BN.words[0]).join(" ") + " notaword";
    try {
      mapMnemonicToCanonical(phrase, BN);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidMnemonicError);
      expect(hasErrorCode(e, "INVALID_MNEMONIC")).toBe(true);
    }
  });

  it("errors remain instanceof Error for backward compatibility", () => {
    expect(new WordlistNotFoundError("x", [])).toBeInstanceOf(Error);
    expect(new AmbiguousLanguageError("r")).toBeInstanceOf(Error);
    expect(new InvalidMnemonicError("m")).toBeInstanceOf(Error);
    expect(new PairingVerificationError("m")).toBeInstanceOf(Error);
    expect(new UnsupportedMappingError("m")).toBeInstanceOf(Error);
  });
});
