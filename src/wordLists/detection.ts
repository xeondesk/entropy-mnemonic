import type { IWordList } from "./WordList";
import { wordLists } from "./lists";
import { getWordIndexMap } from "./lookup";
import { splitMnemonicWords } from "./normalization";
import { AmbiguousLanguageError } from "../errors";

/**
 * A wordlist that partially or fully matched a mnemonic phrase.
 */
export interface DetectionCandidate {
  /** The candidate wordlist. */
  readonly wordList: IWordList;
  /** Number of phrase words found in this wordlist. */
  readonly matchedWords: number;
  /** Total number of words in the phrase. */
  readonly totalWords: number;
}

/**
 * Result of language detection. Detection NEVER silently selects a
 * wordlist: `detected` is set only when exactly one candidate matched
 * every word. Ambiguous or unmatched phrases leave it undefined and
 * callers must choose explicitly.
 */
export interface DetectionResult {
  /** Candidates with at least one matching word, sorted by match count desc. */
  readonly candidates: readonly DetectionCandidate[];
  /** True when more than one wordlist fully matched the phrase. */
  readonly ambiguous: boolean;
  /** The single fully-matching wordlist, or undefined. */
  readonly detected?: IWordList;
}

const ALL_LISTS: readonly IWordList[] = Object.values(wordLists);

/**
 * Detects which wordlist(s) a mnemonic phrase belongs to.
 *
 * Every phrase word is resolved against each candidate wordlist using the
 * shared NFC lookup maps. A wordlist is a *full* candidate only when ALL
 * words resolve; partial matches are reported but never auto-selected.
 *
 * @param mnemonic - Mnemonic phrase (any Unicode whitespace)
 * @param lists - Wordlists to consider (defaults to all registered lists)
 * @returns DetectionResult with candidates, ambiguity flag, and detected list
 */
export function detectLanguage(
  mnemonic: string,
  lists: readonly IWordList[] = ALL_LISTS
): DetectionResult {
  const words = splitMnemonicWords(mnemonic ?? "");
  if (words.length === 0 || lists.length === 0) {
    return { candidates: [], ambiguous: false };
  }

  const candidates: DetectionCandidate[] = [];
  for (const wordList of lists) {
    const indexMap = getWordIndexMap(wordList);
    let matched = 0;
    for (const word of words) {
      if (indexMap.has(word)) matched += 1;
    }
    if (matched > 0) {
      candidates.push({
        wordList,
        matchedWords: matched,
        totalWords: words.length,
      });
    }
  }

  candidates.sort((a, b) => b.matchedWords - a.matchedWords);

  const full = candidates.filter((c) => c.matchedWords === words.length);
  const ambiguous = full.length > 1;
  return {
    candidates,
    ambiguous,
    detected: full.length === 1 ? full[0].wordList : undefined,
  };
}

/**
 * Convenience wrapper around {@link detectLanguage} for callers that
 * require exactly one wordlist. Throws AmbiguousLanguageError (code:
 * "AMBIGUOUS_LANGUAGE") when detection is ambiguous or finds no match —
 * never silently selects.
 *
 * @param mnemonic - Mnemonic phrase (any Unicode whitespace)
 * @param lists - Wordlists to consider (defaults to all registered lists)
 * @returns The single unambiguously detected wordlist
 */
export function getDetectedWordList(
  mnemonic: string,
  lists: readonly IWordList[] = ALL_LISTS
): IWordList {
  const result = detectLanguage(mnemonic, lists);
  if (result.detected) return result.detected;
  if (result.ambiguous) {
    throw new AmbiguousLanguageError(
      "Language detection is ambiguous; multiple wordlists fully match the phrase. " +
        "Select a wordlist explicitly."
    );
  }
  throw new AmbiguousLanguageError(
    "Language could not be determined; no wordlist fully matches the phrase."
  );
}
