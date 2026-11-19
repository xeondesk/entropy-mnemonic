/**
 * Provenance classification of a wordlist relative to BIP-39.
 *
 * - `"bip39"`: an official wordlist published in the BIP-39 specification
 *   (https://github.com/bitcoin/bips/tree/master/bip-0039). Mnemonics
 *   generated with these lists follow the BIP-39 standard and derive
 *   interoperable seeds.
 * - `"community"`: a third-party wordlist that is NOT part of the BIP-39
 *   specification. It may be index-paired to English or independently
 *   authored. Seeds derived from community-list mnemonics are computed
 *   over the native-language text and are NOT interchangeable with
 *   English-derived BIP-39 seeds unless the implementation explicitly
 *   maps words back to English before PBKDF2.
 */
export type WordlistKind = "bip39" | "community";

export interface IWordList {
  /**
   * Stable identifier for the wordlist. Matches the `language` slug
   * (e.g. `"english"`, `"chinese-simplified"`, `"bengali"`).
   */
  id: string;
  /**
   * Language name as used by the BIP-39 specification
   * (e.g. `"english"`, `"chinese-simplified"`).
   */
  language: string;
  /**
   * Separator inserted between words when generating a mnemonic.
   * Japanese uses the ideographic space U+3000 per the BIP-39 spec.
   */
  spacer: string;
  /** Provenance classification: official BIP-39 or community wordlist. */
  kind: WordlistKind;
  /** URL of the authoritative source for the wordlist data. */
  source?: string;
  /** SPDX license identifier, present only when verified. */
  license?: string;
  /** The 2048-word list, indexed 0-2047 (11 bits per word). Frozen at runtime. */
  readonly words: readonly string[];
}
