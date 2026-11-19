import { expect, describe, it } from "vitest";
import {
  detectLanguage,
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
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
} from "../src/index";
import type { IWordList } from "../src/index";

const SAMPLE_ENTROPY = "063679ca1b28b5cfda9c186b367e271e";

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

describe("detectLanguage — real wordlists", () => {
  it.each(ALL_LISTS.map((l) => [l.id, l] as const))(
    "detects %s mnemonics unambiguously",
    (id, list) => {
      const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, list);
      const result = detectLanguage(mnemonic);
      expect(result.ambiguous).toBe(false);
      expect(result.detected).toBe(list);
      const top = result.candidates[0];
      expect(top.wordList).toBe(list);
      expect(top.matchedWords).toBe(top.totalWords);
      expect(id).toBe(list.id);
    }
  );

  it("detects japanese phrases separated by ASCII spaces", () => {
    const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, japaneseWordList);
    const ascii = mnemonic.split(/\s+/u).join(" ");
    const result = detectLanguage(ascii);
    expect(result.detected).toBe(japaneseWordList);
    expect(result.ambiguous).toBe(false);
  });

  it("detects phrases with mixed whitespace and padding", () => {
    const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, englishWordList);
    const messy = "  " + mnemonic.replace(/ /g, " \t ") + "\n";
    expect(detectLanguage(messy).detected).toBe(englishWordList);
  });

  it("returns no candidates for unknown words", () => {
    const result = detectLanguage("xyzzy plugh foobar quux quuux corge grault");
    expect(result.candidates).toHaveLength(0);
    expect(result.detected).toBeUndefined();
    expect(result.ambiguous).toBe(false);
  });

  it("reports partial matches without selecting", () => {
    // One real english word + gibberish: english is a partial candidate only
    const result = detectLanguage("abandon zzzqqq xxxwww vvvuuu tttsss rrrppp");
    const en = result.candidates.find((c) => c.wordList === englishWordList);
    expect(en).toBeDefined();
    expect(en!.matchedWords).toBe(1);
    expect(en!.totalWords).toBe(6);
    expect(result.detected).toBeUndefined();
  });

  it("handles empty input", () => {
    const result = detectLanguage("   ");
    expect(result.candidates).toHaveLength(0);
    expect(result.detected).toBeUndefined();
  });
});

describe("detectLanguage — synthetic ambiguity fixtures", () => {
  const wordsA = [
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
  const wordsB = [
    "mike",
    "november",
    "oscar",
    "papa",
    "quebec",
    "romeo",
    "sierra",
    "tango",
    "uniform",
    "victor",
    "whiskey",
    "xray",
  ];
  // listShared shares every word with listA but in a different order
  const sharedWords = [...wordsA].reverse();

  const listA: IWordList = {
    id: "fixture-a",
    language: "fixture-a",
    spacer: " ",
    kind: "bip39",
    words: [...wordsA, ...Array.from({ length: 2036 }, (_, i) => `a${i}`)],
  };
  const listShared: IWordList = {
    id: "fixture-shared",
    language: "fixture-shared",
    spacer: " ",
    kind: "bip39",
    words: [...sharedWords, ...Array.from({ length: 2036 }, (_, i) => `s${i}`)],
  };
  const listB: IWordList = {
    id: "fixture-b",
    language: "fixture-b",
    spacer: " ",
    kind: "bip39",
    words: [...wordsB, ...Array.from({ length: 2036 }, (_, i) => `b${i}`)],
  };

  it("flags ambiguity when two lists fully match", () => {
    const phrase = wordsA.slice(0, 12).join(" ");
    const result = detectLanguage(phrase, [listA, listShared, listB]);
    expect(result.ambiguous).toBe(true);
    expect(result.detected).toBeUndefined();
    const full = result.candidates.filter((c) => c.matchedWords === c.totalWords);
    expect(full.map((c) => c.wordList.id).sort()).toEqual(["fixture-a", "fixture-shared"]);
  });

  it("selects the single full match when unambiguous", () => {
    const phrase = wordsB.slice(0, 12).join(" ");
    const result = detectLanguage(phrase, [listA, listShared, listB]);
    expect(result.ambiguous).toBe(false);
    expect(result.detected).toBe(listB);
  });

  it("partial match is a candidate but never detected", () => {
    const phrase = [...wordsA.slice(0, 6), ...wordsB.slice(0, 6)].join(" ");
    const result = detectLanguage(phrase, [listA, listShared, listB]);
    expect(result.detected).toBeUndefined();
    // both lists match 6/12 words
    for (const c of result.candidates) {
      expect(c.matchedWords).toBe(6);
    }
  });

  it("accepts a custom candidate subset", () => {
    const phrase = wordsA.slice(0, 12).join(" ");
    const result = detectLanguage(phrase, [listA]);
    expect(result.detected).toBe(listA);
    expect(result.candidates).toHaveLength(1);
  });
});

describe("detectLanguage + decode integration", () => {
  it("detected list round-trips through mnemonicToEntropy", () => {
    for (const list of [englishWordList, bengaliWordList, japaneseWordList]) {
      const mnemonic = entropyToMnemonic(SAMPLE_ENTROPY, list);
      const { detected, ambiguous } = detectLanguage(mnemonic);
      expect(ambiguous).toBe(false);
      expect(detected).toBe(list);
      if (detected) {
        expect(mnemonicToEntropy(mnemonic, detected)).toBe(SAMPLE_ENTROPY);
        expect(validateMnemonic(mnemonic, detected)).toBe(true);
      }
    }
  });
});
