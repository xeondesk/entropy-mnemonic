import type { IWordList, WordlistKind } from "./WordList";
import { computePairingContentHash, computeWordListContentHash } from "./integrity";
import { WordlistNotFoundError } from "../errors";

import bengaliWordListJson from "./bengali.wordlist.json";
import chineseSimplifiedWordListJson from "./chinese-simplified.wordlist.json";
import chineseTraditionalWordListJson from "./chinese-traditional.wordlist.json";
import czechWordListJson from "./czech.wordlist.json";
import englishWordListJson from "./english.wordlist.json";
import frenchWordListJson from "./french.wordlist.json";
import italianWordListJson from "./italian.wordlist.json";
import japaneseWordListJson from "./japanese.wordlist.json";
import koreanWordListJson from "./korean.wordlist.json";
import portugueseWordListJson from "./portuguese.wordlist.json";
import spanishWordListJson from "./spanish.wordlist.json";

interface WordListJson {
  language: string;
  spacer: string;
  words: string[];
}

interface WordListMeta {
  kind?: WordlistKind;
  source?: string;
  license?: string;
  version?: string;
  pairing?: IWordList["pairing"];
}

const BIP39_SOURCE = "https://github.com/bitcoin/bips/blob/master/bip-0039";

function bip39Source(fileName: string): string {
  return `${BIP39_SOURCE}/${fileName}`;
}

function defineWordList(id: string, json: WordListJson, meta: WordListMeta = {}): IWordList {
  return Object.freeze({
    id,
    language: json.language,
    spacer: json.spacer,
    kind: meta.kind ?? "bip39",
    source: meta.source,
    license: meta.license,
    version: meta.version ?? (meta.kind === "community" ? undefined : "bip39-spec"),
    hashAlgorithm: "sha256",
    contentHash: computeWordListContentHash(json.words),
    pairing: meta.pairing,
    words: Object.freeze(json.words),
  });
}

export const englishWordList = defineWordList("english", englishWordListJson, {
  source: bip39Source("english.txt"),
});
export const japaneseWordList = defineWordList("japanese", japaneseWordListJson, {
  source: bip39Source("japanese.txt"),
});
export const koreanWordList = defineWordList("korean", koreanWordListJson, {
  source: bip39Source("korean.txt"),
});
export const spanishWordList = defineWordList("spanish", spanishWordListJson, {
  source: bip39Source("spanish.txt"),
});
export const chineseSimplifiedWordList = defineWordList(
  "chinese-simplified",
  chineseSimplifiedWordListJson,
  { source: bip39Source("chinese_simplified.txt") }
);
export const chineseTraditionalWordList = defineWordList(
  "chinese-traditional",
  chineseTraditionalWordListJson,
  { source: bip39Source("chinese_traditional.txt") }
);
export const frenchWordList = defineWordList("french", frenchWordListJson, {
  source: bip39Source("french.txt"),
});
export const italianWordList = defineWordList("italian", italianWordListJson, {
  source: bip39Source("italian.txt"),
});
export const czechWordList = defineWordList("czech", czechWordListJson, {
  source: bip39Source("czech.txt"),
});
export const portugueseWordList = defineWordList("portuguese", portugueseWordListJson, {
  source: bip39Source("portuguese.txt"),
});
/**
 * Bengali wordlist. This is a COMMUNITY wordlist (TZUR Originals,
 * index-paired to English BIP-39), NOT an official BIP-39 wordlist.
 * See `kind === "community"` and `isCanonicalWordList`.
 */
const BENGALI_CONTENT_HASH = computeWordListContentHash(bengaliWordListJson.words);

export const bengaliWordList = defineWordList("bengali", bengaliWordListJson, {
  kind: "community",
  source: "https://github.com/osem23/bip39-wordlists-tzur",
  license: "MIT",
  version: "tzur-v1.0",
  pairing: {
    canonicalId: "english",
    scheme: "index",
    version: "tzur-v1.0",
    hashAlgorithm: "sha256",
    contentHash: computePairingContentHash(
      { id: "bengali", contentHash: BENGALI_CONTENT_HASH },
      { id: "english", contentHash: englishWordList.contentHash }
    ),
    verifiedBy:
      "upstream-mapping-sha256:d8938514b5b3826a64fd53a1651ec6708f6570be1c52ff0ab5cb9eaae68fcd3c",
  },
});

export const defaultList = englishWordList;

/**
 * Central registry of all supported wordlists, keyed by wordlist id.
 */
export const wordLists: Readonly<Record<string, IWordList>> = Object.freeze({
  english: englishWordList,
  japanese: japaneseWordList,
  korean: koreanWordList,
  spanish: spanishWordList,
  "chinese-simplified": chineseSimplifiedWordList,
  "chinese-traditional": chineseTraditionalWordList,
  french: frenchWordList,
  italian: italianWordList,
  czech: czechWordList,
  portuguese: portugueseWordList,
  bengali: bengaliWordList,
});

/**
 * Returns the ids of all registered wordlists.
 */
export function getWordListIds(): string[] {
  return Object.keys(wordLists);
}

/**
 * Looks up a wordlist by id.
 * @param id - Wordlist id (e.g. `"english"`, `"japanese"`, `"bengali"`)
 * @returns The registered wordlist
 * @throws Error if no wordlist is registered under `id`
 */
export function getWordList(id: string): IWordList {
  const wordList = wordLists[id];
  if (!wordList) {
    throw new WordlistNotFoundError(id, getWordListIds());
  }
  return wordList;
}

/**
 * Returns true if the wordlist is an official BIP-39 spec wordlist
 * (kind === "bip39"). Community wordlists such as Bengali return false.
 */
export function isCanonicalWordList(wordList: IWordList): boolean {
  return wordList.kind === "bip39";
}
