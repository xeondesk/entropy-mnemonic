import type { IWordList } from "./WordList";

/**
 * Unicode normalization forms supported for wordlist lookup.
 * Seed derivation always applies NFKD per BIP-39 regardless of this
 * profile; these forms govern mnemonic *parsing/lookup* only.
 */
export type UnicodeNormalizationForm = "NFC" | "NFD" | "NFKC" | "NFKD";

/**
 * Script-aware normalization profile for a wordlist.
 *
 * All currently shipped lists resolve lookups under NFC: Latin lists are
 * stored NFC, French/Spanish/Japanese contain NFD entries that NFC
 * composition unifies, and Korean is stored fully NFD where NFC composes
 * Hangul jamo into syllables. NFC was verified injective (collision-free)
 * for every shipped wordlist.
 */
export interface NormalizationProfile {
  /** Unicode form applied to mnemonic text and wordlist keys for lookup. */
  readonly form: UnicodeNormalizationForm;
}

const NFC_PROFILE: NormalizationProfile = Object.freeze({ form: "NFC" });

/**
 * Per-wordlist normalization profiles, keyed by wordlist id.
 * Unknown/custom lists default to NFC.
 */
const NORMALIZATION_PROFILES: Readonly<Record<string, NormalizationProfile>> = Object.freeze({
  english: NFC_PROFILE,
  spanish: NFC_PROFILE,
  french: NFC_PROFILE,
  italian: NFC_PROFILE,
  portuguese: NFC_PROFILE,
  czech: NFC_PROFILE,
  japanese: NFC_PROFILE, // U+3000 ideographic space handled by whitespace split
  korean: NFC_PROFILE, // NFD jamo storage unified by NFC composition
  "chinese-simplified": NFC_PROFILE,
  "chinese-traditional": NFC_PROFILE,
  bengali: NFC_PROFILE, // combining vowel signs; NFC verified injective
});

/**
 * Returns the normalization profile for a wordlist (defaults to NFC).
 */
export function getNormalizationProfile(wordList: IWordList): NormalizationProfile {
  return NORMALIZATION_PROFILES[wordList.id] ?? NFC_PROFILE;
}

/**
 * Normalizes a single word or phrase for wordlist lookup according to the
 * wordlist's normalization profile.
 */
export function normalizeForLookup(text: string, wordList?: IWordList): string {
  const form = wordList ? getNormalizationProfile(wordList).form : "NFC";
  return text.normalize(form);
}

/**
 * Splits a mnemonic phrase into lookup-ready words.
 *
 * Accepts any Unicode whitespace (including the Japanese ideographic
 * space U+3000) regardless of the wordlist's canonical spacer, and
 * normalizes to NFC so canonically-equivalent input (NFC or NFD) matches
 * wordlist entries.
 */
export function splitMnemonicWords(mnemonic: string): string[] {
  return mnemonic.trim().normalize("NFC").split(/\s+/u).filter(Boolean);
}
