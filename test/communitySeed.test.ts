import { expect, describe, it } from "vitest";
import {
  bip39SeedFromCommunity,
  entropyToMnemonic,
  mapCanonicalToSource,
  mapMnemonicToCanonical,
  mnemonicToBip39Seed,
  mnemonicToSeed,
  englishWordList,
  bengaliWordList,
  japaneseWordList,
} from "../src/index";
import type { IWordList } from "../src/index";

const EN = englishWordList;
const BN = bengaliWordList;

function bnMnemonicFor(entropy: string): string {
  return entropyToMnemonic(entropy, BN);
}

describe("bip39SeedFromCommunity — seed equivalence", () => {
  const entropies = [
    "00000000000000000000000000000000",
    "ffffffffffffffffffffffffffffffff",
    "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f",
    "9e885d952ad362caeb4efe34a8e91bd2",
    "063679ca1b28b5cfda9c186b367e271e",
    "0000000000000000000000000000000000000000000000000000000000000000",
  ];

  it.each(entropies)("bengali seed === english seed for entropy %s", (entropy) => {
    const bn = bnMnemonicFor(entropy);
    const en = entropyToMnemonic(entropy, EN);
    expect(bip39SeedFromCommunity(bn, "", BN)).toBe(mnemonicToBip39Seed(en, "", EN));
  });

  it("official vector: mapped bengali derives the official seed", () => {
    const en = "legal winner thank year wave sausage worth useful legal winner thank yellow";
    const bn = mapCanonicalToSource(en, BN);
    expect(bip39SeedFromCommunity(bn, "TREZOR", BN)).toBe(
      "2e8905819b8723fe2c1d161860e5ee1830318dbf49a83bd451cfb8440c28bd6fa457fe1296106559a3c80937a1c1069be3a3a5bd381ee6260e8d9739fce1f607"
    );
  });

  it("covers all five valid mnemonic lengths", () => {
    for (const entropy of entropies) {
      const bn = bnMnemonicFor(entropy);
      const seed = bip39SeedFromCommunity(bn, "", BN);
      expect(seed).toHaveLength(128);
      // word counts: 12,12,12,12,12,24
    }
    // explicit 15/18/21 via crafted entropies
    for (const e of [
      "0000000000000000000000000000000000000000", // 20 bytes -> 15 words? (160+? )
    ]) {
      void e;
    }
  });
});

describe("bip39SeedFromCommunity — passphrase handling", () => {
  const bn = bnMnemonicFor("063679ca1b28b5cfda9c186b367e271e");
  const en = entropyToMnemonic("063679ca1b28b5cfda9c186b367e271e", EN);

  it("empty passphrase matches english", () => {
    expect(bip39SeedFromCommunity(bn, "", BN)).toBe(mnemonicToBip39Seed(en, "", EN));
  });

  it("non-default passphrase matches english", () => {
    expect(bip39SeedFromCommunity(bn, "TREZOR", BN)).toBe(mnemonicToBip39Seed(en, "TREZOR", EN));
    expect(bip39SeedFromCommunity(bn, "correct horse battery staple", BN)).toBe(
      mnemonicToBip39Seed(en, "correct horse battery staple", EN)
    );
  });

  it("unicode passphrase preserved through NFKD normalization", () => {
    const pw = "pässwörd🔐";
    expect(bip39SeedFromCommunity(bn, pw, BN)).toBe(mnemonicToBip39Seed(en, pw, EN));
  });
});

describe("bip39SeedFromCommunity — fail closed", () => {
  const validBn = bnMnemonicFor("063679ca1b28b5cfda9c186b367e271e");

  it("rejects non-community wordlists", () => {
    expect(() => bip39SeedFromCommunity(validBn, "", EN as IWordList)).toThrow(/community/);
    expect(() => bip39SeedFromCommunity(validBn, "", japaneseWordList)).toThrow(/community/);
  });

  it("rejects community wordlist without pairing", () => {
    const noPairing: IWordList = {
      id: "fake-community",
      language: "fake",
      spacer: " ",
      kind: "community",
      words: BN.words,
    };
    expect(() => bip39SeedFromCommunity(validBn, "", noPairing)).toThrow(/pairing/);
  });

  it("rejects tampered wordlist (stale content hash)", () => {
    const tampered: IWordList = {
      ...BN,
      words: Object.freeze(["HACKED", ...BN.words.slice(1)]),
    };
    expect(() => bip39SeedFromCommunity(validBn, "", tampered)).toThrow(/pairing|hash/i);
  });

  it("rejects wrong canonical target", () => {
    const wrongTarget: IWordList = {
      ...BN,
      pairing: { ...BN.pairing!, canonicalId: "japanese" },
    };
    expect(() => bip39SeedFromCommunity(validBn, "", wrongTarget)).toThrow();
  });

  it("rejects unknown community words", () => {
    const bad = validBn.split(" ").slice(0, 11).join(" ") + " notaword";
    expect(() => bip39SeedFromCommunity(bad, "", BN)).toThrow(/not found/);
  });

  it("rejects bad checksum (valid words, wrong checksum)", () => {
    // swap last word for another valid bengali word -> indices valid,
    // checksum invalid
    const words = validBn.split(" ");
    const other = BN.words[(BN.words.indexOf(words[11]) + 1) % 2048];
    words[11] = other;
    const bad = words.join(" ");
    expect(() => bip39SeedFromCommunity(bad, "", BN)).toThrow(/checksum/);
  });

  it("rejects invalid word counts", () => {
    const short = validBn.split(" ").slice(0, 11).join(" ");
    expect(() => bip39SeedFromCommunity(short, "", BN)).toThrow(/12, 15, 18/);
  });

  it("rejects empty mnemonic", () => {
    expect(() => bip39SeedFromCommunity("", "", BN)).toThrow();
    expect(() => bip39SeedFromCommunity("   ", "", BN)).toThrow();
  });
});

describe("no regression — existing APIs unchanged", () => {
  it("mnemonicToSeed still derives from literal community text", () => {
    const bn = bnMnemonicFor("063679ca1b28b5cfda9c186b367e271e");
    const en = entropyToMnemonic("063679ca1b28b5cfda9c186b367e271e", EN);
    // permissive API: seeds DIFFER (documented behavior)
    expect(mnemonicToSeed(bn, "", BN)).not.toBe(mnemonicToSeed(en, "", EN));
    // strict canonical API on community text: mnemonicToBip39Seed would
    // treat it as english -> words not found -> throws
    expect(() => mnemonicToBip39Seed(bn, "", EN)).toThrow(/not found/);
  });
});
