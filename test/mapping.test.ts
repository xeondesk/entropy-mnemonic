import { expect, describe, it } from "vitest";
import {
  auditWordListPairing,
  mapCanonicalToSource,
  mapMnemonicToCanonical,
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
  mnemonicToSeed,
  mnemonicToBip39Seed,
  englishWordList,
  bengaliWordList,
  japaneseWordList,
  koreanWordList,
} from "../src/index";
import type { IWordList } from "../src/index";
import { computeWordListContentHash } from "../src/wordLists/integrity";

const BN = bengaliWordList;
const EN = englishWordList;

describe("wordlist content hashes", () => {
  it("bengali hash matches verified upstream serialization", () => {
    expect(BN.contentHash).toBe("d8938514b5b3826a64fd53a1651ec6708f6570be1c52ff0ab5cb9eaae68fcd3c");
  });

  it("every list carries a contentHash matching its words", () => {
    for (const list of [EN, BN, japaneseWordList, koreanWordList]) {
      expect(list.contentHash).toBe(computeWordListContentHash(list.words));
    }
  });

  it("canonical lists carry version + no pairing", () => {
    expect(EN.version).toBe("bip39-spec");
    expect(EN.pairing).toBeUndefined();
    expect(BN.version).toBe("tzur-v1.0");
  });

  it("bengali pairing metadata is complete", () => {
    const p = BN.pairing!;
    expect(p.canonicalId).toBe("english");
    expect(p.scheme).toBe("index");
    expect(p.version).toBe("tzur-v1.0");
    expect(p.contentHash).toBeTruthy();
    expect(p.verifiedBy).toContain("d8938514");
  });
});

describe("auditWordListPairing", () => {
  it("reports valid for bengali -> english", () => {
    const audit = auditWordListPairing(BN);
    expect(audit.valid).toBe(true);
    expect(audit.toId).toBe("english");
    expect(Object.values(audit.checks).every(Boolean)).toBe(true);
  });

  it("reports invalid for lists without pairing", () => {
    const audit = auditWordListPairing(EN);
    expect(audit.valid).toBe(false);
    expect(audit.checks.hasPairing).toBe(false);
  });

  it("fails on tampered wordlist content (stale hash)", () => {
    const tampered: IWordList = {
      ...BN,
      words: Object.freeze([...BN.words.slice(0, 100), "INJECTED", ...BN.words.slice(101)]),
    };
    const audit = auditWordListPairing(tampered);
    expect(audit.valid).toBe(false);
    expect(audit.checks.sourceHashOk).toBe(false);
  });

  it("fails on mismatched explicit target", () => {
    const audit = auditWordListPairing(BN, japaneseWordList);
    // japanese has valid own hash but wrong canonicalId/pairing binding
    expect(audit.valid).toBe(false);
  });
});

describe("mapMnemonicToCanonical — exhaustive index coverage", () => {
  it("maps every one of the 2048 indices correctly", () => {
    // A 12-word phrase of the same word exercises index i -> english[i]
    for (let i = 0; i < 2048; i++) {
      const phrase = Array(12).fill(BN.words[i]).join(" ");
      const mapped = mapMnemonicToCanonical(phrase, BN);
      expect(mapped).toBe(Array(12).fill(EN.words[i]).join(" "));
    }
  });
});

describe("entropy preservation (H_source === H_canonical)", () => {
  const entropies = [
    "00000000000000000000000000000000",
    "ffffffffffffffffffffffffffffffff",
    "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f",
    "80808080808080808080808080808080",
    "9e885d952ad362caeb4efe34a8e91bd2",
    "063679ca1b28b5cfda9c186b367e271e",
    "0000000000000000000000000000000000000000000000000000000000000000",
  ];

  // deterministic pseudo-random sample across lengths
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  for (let n = 0; n < 60; n++) {
    const len = [16, 20, 24, 28, 32][n % 5];
    entropies.push(
      Array.from({ length: len }, () => rand().toString(16).padStart(8, "0").slice(0, 2)).join("")
    );
  }

  it.each(entropies)("entropy %s preserved through mapping", (entropy) => {
    const bnMnemonic = entropyToMnemonic(entropy, BN);
    const enMnemonic = mapMnemonicToCanonical(bnMnemonic, BN);
    // canonical decode must equal original entropy exactly
    expect(mnemonicToEntropy(enMnemonic, EN)).toBe(entropy);
    // and source decode agrees
    expect(mnemonicToEntropy(bnMnemonic, BN)).toBe(entropy);
    // checksum validity carries over
    expect(validateMnemonic(enMnemonic, EN)).toBe(true);
  });
});

describe("mapCanonicalToSource (inverse)", () => {
  it("round-trips canonical -> source -> canonical", () => {
    const entropy = "063679ca1b28b5cfda9c186b367e271e";
    const en = entropyToMnemonic(entropy, EN);
    const bn = mapCanonicalToSource(en, BN);
    expect(mapMnemonicToCanonical(bn, BN)).toBe(en);
    expect(mnemonicToEntropy(bn, BN)).toBe(entropy);
  });
});

describe("fail-closed behavior", () => {
  it("rejects wordlists without pairing", () => {
    const phrase = Array(12).fill(EN.words[0]).join(" ");
    expect(() => mapMnemonicToCanonical(phrase, EN)).toThrow(/no pairing/);
  });

  it("rejects unknown target id mismatch", () => {
    const phrase = Array(12).fill(BN.words[0]).join(" ");
    expect(() => mapMnemonicToCanonical(phrase, BN, japaneseWordList)).toThrow(/paired to/);
  });

  it("rejects words not in the source list", () => {
    const phrase = Array(11).fill(BN.words[0]).join(" ") + " notaword";
    expect(() => mapMnemonicToCanonical(phrase, BN)).toThrow(/not found/);
  });

  it("rejects tampered source wordlist", () => {
    const tampered: IWordList = {
      ...BN,
      words: Object.freeze([...BN.words]),
    };
    // contentHash still matches (same words) -> should still work;
    // now actually tamper a word
    const bad: IWordList = {
      ...BN,
      words: Object.freeze(["HACKED", ...BN.words.slice(1)]),
    };
    void tampered;
    const phrase = Array(12).fill(BN.words[0]).join(" ");
    expect(() => mapMnemonicToCanonical(phrase, bad)).toThrow(/pairing|hash/i);
  });
});

describe("seed interoperability via mapping", () => {
  it("bengali mnemonic maps to english and derives official BIP-39 seed", () => {
    // Use the official english vector: "legal winner ... yellow"
    const enMnemonic =
      "legal winner thank year wave sausage worth useful legal winner thank yellow";
    const bnMnemonic = mapCanonicalToSource(enMnemonic, BN);
    // Bengali round-trips entropy identically
    expect(mnemonicToEntropy(bnMnemonic, BN)).toBe(mnemonicToEntropy(enMnemonic, EN));
    // Mapped back, strict seed derivation yields the official vector
    const remapped = mapMnemonicToCanonical(bnMnemonic, BN);
    expect(remapped).toBe(enMnemonic);
    expect(mnemonicToBip39Seed(remapped, "TREZOR", EN)).toBe(
      "2e8905819b8723fe2c1d161860e5ee1830318dbf49a83bd451cfb8440c28bd6fa457fe1296106559a3c80937a1c1069be3a3a5bd381ee6260e8d9739fce1f607"
    );
  });
});
