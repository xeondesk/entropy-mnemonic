import type { IWordList } from "./WordList";
import { normalizeForLookup } from "./normalization";

// Cache word index maps to avoid recreating them on every call.
// Keys are stored in the wordlist's lookup normalization form so that
// canonically-equivalent input (e.g. NFC vs NFD) resolves correctly.
const wordIndexCache = new WeakMap<IWordList, Map<string, number>>();

/**
 * Gets or creates a cached word→index map for the given word list.
 * Shared by mnemonic decoding and language detection.
 */
export function getWordIndexMap(wordList: IWordList): Map<string, number> {
  let cached = wordIndexCache.get(wordList);
  if (!cached) {
    // NFC-normalized keys: verified collision-free for all shipped
    // wordlists, and unifies NFD-stored entries (Korean, Japanese, etc.).
    cached = new Map(
      wordList.words.map((word, index) => [normalizeForLookup(word, wordList), index])
    );
    wordIndexCache.set(wordList, cached);
  }
  return cached;
}

/**
 * Resolves a single word to its index in the wordlist, or undefined if
 * the word is not in the list. Input is normalized for lookup.
 */
export function resolveWordIndex(wordList: IWordList, word: string): number | undefined {
  return getWordIndexMap(wordList).get(normalizeForLookup(word, wordList));
}
