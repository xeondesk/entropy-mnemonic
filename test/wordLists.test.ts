import { expect, describe, it } from "vitest";
import {
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
  mnemonicToSeed,
  mnemonicToBip39Seed,
  wordLists,
  getWordList,
  getWordListIds,
  isCanonicalWordList,
  englishWordList,
  japaneseWordList,
  koreanWordList,
  spanishWordList,
  chineseSimplifiedWordList,
  chineseTraditionalWordList,
  frenchWordList,
  italianWordList,
  czechWordList,
  portugueseWordList,
  bengaliWordList,
  defaultList,
} from "../src/index";
import type { IWordList } from "../src/index";

const ALL_LISTS: IWordList[] = [
  englishWordList,
  japaneseWordList,
  koreanWordList,
  spanishWordList,
  chineseSimplifiedWordList,
  chineseTraditionalWordList,
  frenchWordList,
  italianWordList,
  czechWordList,
  portugueseWordList,
  bengaliWordList,
];

const SAMPLE_ENTROPY = "063679ca1b28b5cfda9c186b367e271e"; // 128 bits -> 12 words

describe("wordlist registry", () => {
  it("registers every named export under its id", () => {
    for (const list of ALL_LISTS) {
      expect(wordLists[list.id]).toBe(list);
      expect(getWordList(list.id)).toBe(list);
    }
  });

  it("exposes all 11 wordlists", () => {
    expect(getWordListIds()).toHaveLength(11);
    expect(Object.keys(wordLists)).toHaveLength(11);
  });

  it("throws for unknown wordlist ids", () => {
    expect(() => getWordList("klingon")).toThrow(/Unknown wordlist id/);
    expect(() => getWordList("")).toThrow(/Unknown wordlist id/);
  });

  it("keeps defaultList identical to englishWordList", () => {
    expect(defaultList).toBe(englishWordList);
  });
});

describe("wordlist classification", () => {
  it("classifies the 10 official BIP-39 wordlists as bip39", () => {
    const canonical = ALL_LISTS.filter(isCanonicalWordList);
    expect(canonical).toHaveLength(10);
    expect(canonical.map((l) => l.id).sort()).toEqual(
      [
        "czech",
        "english",
        "french",
        "italian",
        "japanese",
        "korean",
        "portuguese",
        "spanish",
        "chinese-simplified",
        "chinese-traditional",
      ].sort()
    );
  });

  it("classifies bengali as a community (non-BIP-39) wordlist", () => {
    expect(bengaliWordList.kind).toBe("community");
    expect(isCanonicalWordList(bengaliWordList)).toBe(false);
    expect(bengaliWordList.source).toContain("bip39-wordlists-tzur");
    expect(bengaliWordList.license).toBe("MIT");
  });

  it("records provenance for canonical wordlists", () => {
    for (const list of ALL_LISTS.filter(isCanonicalWordList)) {
      expect(list.source).toContain("github.com/bitcoin/bips");
      expect(list.kind).toBe("bip39");
    }
  });
});

describe("wordlist structure (BIP-39 requirements)", () => {
  it.each(ALL_LISTS.map((l) => [l.id, l] as const))(
    "%s has exactly 2048 unique words",
    (_id, list) => {
      expect(list.words).toHaveLength(2048);
      expect(new Set(list.words).size).toBe(2048);
    }
  );

  // BIP-39 guarantees unique first-4-letter prefixes only for lists where
  // words are identified by their first 4 letters: the Latin-script lists
  // (en, es, fr, it, pt, cs) and the Chinese lists. For es/fr the spec
  // treats accented characters as their base letter, so prefixes are
  // compared after accent folding. Japanese/Korean words can be shorter
  // than 4 characters and the community Bengali list makes no such
  // guarantee, so the check does not apply to them.
  const PREFIX_CHECK_IDS = [
    "english",
    "spanish",
    "french",
    "italian",
    "portuguese",
    "czech",
    "chinese-simplified",
    "chinese-traditional",
  ];

  const foldAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  it.each(PREFIX_CHECK_IDS)("%s has unique folded 4-character prefixes", (id) => {
    const list = getWordList(id);
    const prefixes = list.words.map((w) => foldAccents(w.normalize("NFC")).slice(0, 4));
    expect(new Set(prefixes).size).toBe(2048);
  });

  it.each(ALL_LISTS.map((l) => [l.id, l] as const))("%s has a non-empty spacer", (_id, list) => {
    expect(list.spacer.length).toBeGreaterThan(0);
  });

  it("japanese uses the ideographic space U+3000 as spacer", () => {
    expect(japaneseWordList.spacer).toBe("　");
  });
});

describe("round-trip for every registered wordlist", () => {
  it.each(ALL_LISTS.map((l) => [l.id, l] as const))(
    "%s entropy -> mnemonic -> entropy",
    (_id, list) => {
      const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, list);
      expect(mnemonicToEntropy(mnemonic, list)).toBe(SAMPLE_ENTROPY);
      expect(validateMnemonic(mnemonic, list)).toBe(true);
    }
  );

  it.each(ALL_LISTS.map((l) => [l.id, l] as const))(
    "%s accepts ASCII-space separated input regardless of spacer",
    (_id, list) => {
      const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, list);
      const asciiSpaced = mnemonic.split(/\s+/u).join(" ");
      expect(validateMnemonic(asciiSpaced, list)).toBe(true);
      expect(mnemonicToEntropy(asciiSpaced, list)).toBe(SAMPLE_ENTROPY);
    }
  );

  it("japanese mnemonic output uses U+3000 and round-trips", () => {
    const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, japaneseWordList);
    expect(mnemonic).toContain("　");
    expect(mnemonicToEntropy(mnemonic, japaneseWordList)).toBe(SAMPLE_ENTROPY);
  });
});

describe("mnemonic input normalization", () => {
  it("accepts mixed whitespace and extra padding", () => {
    const mnemonic = "legal winner thank year wave sausage worth useful legal winner thank yellow";
    expect(validateMnemonic(`  ${mnemonic.replace(/ /g, "  ")}\n`)).toBe(true);
    expect(mnemonicToEntropy(`\t${mnemonic}\t`)).toBe("7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f");
  });

  it("matches NFD wordlist entries from NFC input (korean)", () => {
    const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, koreanWordList);
    // korean.wordlist.json stores words in NFD; NFC input must still match
    const nfcMnemonic = mnemonic.normalize("NFC");
    expect(validateMnemonic(nfcMnemonic, koreanWordList)).toBe(true);
    expect(mnemonicToEntropy(nfcMnemonic, koreanWordList)).toBe(SAMPLE_ENTROPY);
  });

  it("matches NFD french words from NFC input", () => {
    const entropy = "063679ca1b28b5cfda9c186b367e271e";
    const mnemonic = entropyToMnemonic(entropy, frenchWordList);
    expect(validateMnemonic(mnemonic.normalize("NFC"), frenchWordList)).toBe(true);
  });
});

describe("mnemonic validation edge cases", () => {
  it("rejects empty and whitespace-only mnemonics", () => {
    expect(validateMnemonic("")).toBe(false);
    expect(validateMnemonic("   ")).toBe(false);
    expect(() => mnemonicToEntropy("   ")).toThrow(/12, 15, 18, 21, or 24/);
  });

  it("rejects invalid word counts before checksum", () => {
    const words = englishWordList.words;
    const short = words.slice(0, 11).join(" ");
    const long = words.slice(0, 25).join(" ");
    expect(validateMnemonic(short)).toBe(false);
    expect(validateMnemonic(long)).toBe(false);
    expect(() => mnemonicToEntropy(short)).toThrow(/12, 15, 18, 21, or 24/);
    expect(() => mnemonicToEntropy(long)).toThrow(/12, 15, 18, 21, or 24/);
  });
});

describe("official BIP-39 test vectors (english)", () => {
  const vectors: Array<[string, string]> = [
    [
      "00000000000000000000000000000000",
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    ],
    [
      "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f",
      "legal winner thank year wave sausage worth useful legal winner thank yellow",
    ],
    [
      "80808080808080808080808080808080",
      "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
    ],
    ["ffffffffffffffffffffffffffffffff", "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"],
    [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
    ],
    [
      "9e885d952ad362caeb4efe34a8e91bd2",
      "ozone drill grab fiber curtain grace pudding thank cruise elder eight picnic",
    ],
  ];

  it.each(vectors)("entropy %s -> mnemonic", (entropy, mnemonic) => {
    expect(entropyToMnemonic(entropy, englishWordList)).toBe(mnemonic);
    expect(mnemonicToEntropy(mnemonic, englishWordList)).toBe(entropy);
    expect(validateMnemonic(mnemonic, englishWordList)).toBe(true);
  });

  it("derives the official seed for 'abandon...about' with empty passphrase", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    expect(mnemonicToSeed(mnemonic)).toBe(
      "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4"
    );
  });

  it("derives the official seed for 'abandon...about' with passphrase TREZOR", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    expect(mnemonicToSeed(mnemonic, "TREZOR")).toBe(
      "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04"
    );
  });

  it("derives the official seed for 'legal winner...' with passphrase TREZOR", () => {
    const mnemonic = "legal winner thank year wave sausage worth useful legal winner thank yellow";
    expect(mnemonicToSeed(mnemonic, "TREZOR")).toBe(
      "2e8905819b8723fe2c1d161860e5ee1830318dbf49a83bd451cfb8440c28bd6fa457fe1296106559a3c80937a1c1069be3a3a5bd381ee6260e8d9739fce1f607"
    );
  });
});

describe("community wordlist (bengali) semantics", () => {
  it("round-trips entropy through bengali mnemonics", () => {
    const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, bengaliWordList);
    expect(validateMnemonic(mnemonic, bengaliWordList)).toBe(true);
    expect(mnemonicToEntropy(mnemonic, bengaliWordList)).toBe(SAMPLE_ENTROPY);
  });

  it("derives a deterministic but non-BIP-39-interoperable seed", () => {
    const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, bengaliWordList);
    const seed = mnemonicToSeed(mnemonic, "", bengaliWordList);
    expect(seed).toHaveLength(128);
    // Bengali is index-paired to English at the same indices, so entropy
    // round-trips identically — but the seed is computed over Bengali text
    // and differs from the English-derived BIP-39 seed.
    const englishMnemonic = entropyToMnemonic(SAMPLE_ENTROPY, englishWordList);
    expect(mnemonicToSeed(mnemonic, "", bengaliWordList)).not.toBe(
      mnemonicToSeed(englishMnemonic, "", englishWordList)
    );
  });
});

describe("mnemonicToBip39Seed (strict canonical seed derivation)", () => {
  const mnemonic = "legal winner thank year wave sausage worth useful legal winner thank yellow";

  it("produces the same seed as mnemonicToSeed for canonical lists", () => {
    for (const list of [englishWordList, japaneseWordList, koreanWordList]) {
      const m = entropyToMnemonic(SAMPLE_ENTROPY, list);
      expect(mnemonicToBip39Seed(m, "TREZOR", list)).toBe(mnemonicToSeed(m, "TREZOR", list));
    }
  });

  it("rejects community wordlists with a descriptive error", () => {
    const bnMnemonic = entropyToMnemonic(SAMPLE_ENTROPY, bengaliWordList);
    expect(() => mnemonicToBip39Seed(bnMnemonic, "", bengaliWordList)).toThrow(
      /community wordlist/
    );
    expect(() => mnemonicToBip39Seed(bnMnemonic, "", bengaliWordList)).toThrow(/bengali/);
  });

  it("defaults to the english wordlist", () => {
    expect(mnemonicToBip39Seed(mnemonic, "TREZOR")).toBe(
      "2e8905819b8723fe2c1d161860e5ee1830318dbf49a83bd451cfb8440c28bd6fa457fe1296106559a3c80937a1c1069be3a3a5bd381ee6260e8d9739fce1f607"
    );
  });
});

describe("wordlist immutability", () => {
  it.each(ALL_LISTS.map((l) => [l.id, l] as const))(
    "%s entries and words array are frozen",
    (_id, list) => {
      expect(Object.isFrozen(list)).toBe(true);
      expect(Object.isFrozen(list.words)).toBe(true);
    }
  );

  it("registry object is frozen", () => {
    expect(Object.isFrozen(wordLists)).toBe(true);
  });
});

describe("mnemonicToBip39Seed mnemonic validation", () => {
  it("rejects mnemonics with invalid checksum", () => {
    const bad = "legal winner thank year wave sausage worth useful legal winner thank winner";
    expect(() => mnemonicToBip39Seed(bad, "", englishWordList)).toThrow(/checksum/);
  });

  it("rejects mnemonics containing words outside the wordlist", () => {
    const bad = "legal winner thank year wave sausage worth useful legal winner thank xyzzy";
    expect(validateMnemonic(bad, englishWordList)).toBe(false);
    expect(() => mnemonicToBip39Seed(bad, "", englishWordList)).toThrow();
  });

  it("rejects invalid word counts", () => {
    const short = englishWordList.words.slice(0, 11).join(" ");
    expect(() => mnemonicToBip39Seed(short, "", englishWordList)).toThrow(/12, 15, 18, 21, or 24/);
  });

  it("accepts a valid checksum mnemonic for every canonical list", () => {
    for (const list of ALL_LISTS.filter(isCanonicalWordList)) {
      const m = entropyToMnemonic(SAMPLE_ENTROPY, list);
      expect(() => mnemonicToBip39Seed(m, "", list)).not.toThrow();
    }
  });
});
