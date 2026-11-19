import { mnemonicToEntropy } from "./mnemonic";
import { defaultList, getWordList } from "./wordLists";
import { mapMnemonicToCanonical } from "./wordLists/mapping";
import { UnsupportedMappingError } from "./errors";
import { IWordList } from "./wordLists/WordList";
import * as pbkdf2 from "pbkdf2";

/**
 * Converts a mnemonic phrase to a binary seed using PBKDF2 with HMAC-SHA512.
 * This follows the BIP-39 standard for seed generation.
 *
 * IMPORTANT — seed derivation is performed on the literal mnemonic string
 * (NFKD-normalized, per BIP-39). Consequences by wordlist kind:
 *
 * - `kind: "bip39"` (official spec wordlists): the derived seed is
 *   BIP-39 compliant and interoperable with other BIP-39 implementations.
 *
 * - `kind: "community"` (e.g. the Bengali/TZUR wordlist): the mnemonic is
 *   NOT part of the BIP-39 specification. The seed is computed over the
 *   native-language text and will NOT match the seed produced by an
 *   English BIP-39 wallet for the equivalent phrase, nor by other
 *   implementations that first map community words to English. Treat
 *   community-list seeds as implementation-specific.
 *
 * @param mnemonic - Mnemonic phrase (words separated by whitespace)
 * @param passphrase - Optional passphrase (default: empty string)
 * @param wordList - Word list the mnemonic was generated with. Accepted for
 * API compatibility and documentation of intent; seed derivation itself is
 * list-agnostic (PBKDF2 runs on the mnemonic text). Defaults to English.
 * @returns Hexadecimal seed string (64 bytes / 128 hex characters)
 * @throws Error if mnemonic is invalid
 */
export function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = "",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained for API compatibility; seed derivation is list-agnostic (PBKDF2 over the mnemonic text)
  wordList: IWordList = defaultList
): string {
  if (!mnemonic || typeof mnemonic !== "string") {
    throw new Error("[entropy-mnemonic] Invalid mnemonic: must be a non-empty string");
  }

  // Accept any Unicode whitespace (incl. U+3000 for Japanese), matching
  // the parsing behavior of mnemonicToEntropy/validateMnemonic.
  const words = mnemonic.trim().split(/\s+/u).filter(Boolean);
  if (words.length < 12 || words.length > 24) {
    throw new Error("[entropy-mnemonic] Invalid mnemonic: must contain 12-24 words");
  }

  // Normalize mnemonic (NFKD) and passphrase
  const normalizedMnemonic = mnemonic.normalize("NFKD");
  const normalizedPassphrase = "mnemonic" + passphrase.normalize("NFKD");

  // Use pbkdf2 library for PBKDF2
  const seed = pbkdf2.pbkdf2Sync(normalizedMnemonic, normalizedPassphrase, 2048, 64, "sha512");
  return seed.toString("hex");
}

/**
 * Strict variant of {@link mnemonicToSeed} that guarantees BIP-39 seed
 * interoperability. It rejects community (non-spec) wordlists outright AND
 * fully validates the mnemonic against the wordlist (word membership,
 * word count, and BIP-39 checksum) before deriving the seed.
 *
 * Use this when the derived seed must be compatible with standard BIP-39
 * wallets/tooling. For community wordlists such as Bengali, use
 * {@link mnemonicToSeed} only if implementation-specific seeds are
 * acceptable.
 *
 * @param mnemonic - Mnemonic phrase (words separated by whitespace)
 * @param passphrase - Optional passphrase (default: empty string)
 * @param wordList - Must be an official BIP-39 wordlist (`kind === "bip39"`)
 * @returns Hexadecimal seed string (64 bytes / 128 hex characters)
 * @throws Error if the wordlist is a community wordlist or the mnemonic is invalid
 */
export function mnemonicToBip39Seed(
  mnemonic: string,
  passphrase: string = "",
  wordList: IWordList = defaultList
): string {
  if (wordList.kind !== "bip39") {
    throw new Error(
      `[entropy-mnemonic] Wordlist "${wordList.id}" is a community wordlist ` +
        `(kind: "${wordList.kind}"), not an official BIP-39 wordlist. ` +
        `BIP-39-interoperable seed derivation requires a canonical wordlist ` +
        `(kind: "bip39"). Use mnemonicToSeed() if an implementation-specific ` +
        `seed is acceptable.`
    );
  }
  // Validate the mnemonic against the wordlist: word membership, word
  // count (12/15/18/21/24), and BIP-39 checksum. A checksum-valid mnemonic
  // is a prerequisite for claiming BIP-39 seed interoperability.
  mnemonicToEntropy(mnemonic, wordList);
  return mnemonicToSeed(mnemonic, passphrase, wordList);
}

/**
 * Derives a BIP-39-interoperable seed from a COMMUNITY-wordlist mnemonic
 * (e.g. Bengali/TZUR) by first mapping it to its verified canonical
 * English equivalent. The PBKDF2 input is ALWAYS the canonical mnemonic —
 * the community-language sentence is never used for seed derivation.
 *
 * Validation chain (all must pass; any failure throws):
 *  1. `sourceWordList` must be `kind === "community"` with pairing metadata
 *  2. Pairing integrity: scheme, canonical target, both content hashes,
 *     pairing hash (via mapMnemonicToCanonical — fails closed)
 *  3. Every source word must resolve in the community wordlist
 *  4. The mapped canonical mnemonic is validated by mnemonicToBip39Seed:
 *     word membership, word count (12/15/18/21/24), BIP-39 checksum
 *  5. PBKDF2-HMAC-SHA512 over the NFKD canonical mnemonic
 *
 * Because index-pairing preserves indices exactly, the resulting seed is
 * identical to deriving from the equivalent English mnemonic:
 * H_source === H_canonical.
 *
 * @param mnemonic - Mnemonic phrase in the community wordlist
 * @param sourceWordList - The community wordlist the mnemonic belongs to.
 *   REQUIRED and explicit — this API never guesses a wordlist.
 * @param passphrase - Optional passphrase (default: empty string)
 * @returns Hexadecimal seed string (64 bytes / 128 hex characters)
 * @throws Error on non-community source, invalid pairing, unknown words,
 *   bad word count, or checksum failure
 */
export function bip39SeedFromCommunity(
  mnemonic: string,
  sourceWordList: IWordList,
  passphrase: string = ""
): string {
  if (!sourceWordList || sourceWordList.kind !== "community") {
    throw new UnsupportedMappingError(
      `bip39SeedFromCommunity requires a community ` +
        `wordlist (kind: "community"); got ${sourceWordList?.id ?? "none"} ` +
        `(kind: ${sourceWordList?.kind ?? "unknown"}). For canonical ` +
        `wordlists use mnemonicToBip39Seed.`
    );
  }
  const pairing = sourceWordList.pairing;
  if (!pairing) {
    throw new UnsupportedMappingError(
      `Wordlist "${sourceWordList.id}" has no pairing ` +
        `metadata; cannot derive a BIP-39-interoperable seed.`
    );
  }
  // Enforces: pairing scheme, canonical target, content hashes, pairing
  // hash — fails closed on stale or tampered metadata.
  const canonicalMnemonic = mapMnemonicToCanonical(mnemonic, sourceWordList);
  const canonicalList = getWordList(pairing.canonicalId);
  // Validates membership, word count, and checksum; derives the seed.
  return mnemonicToBip39Seed(canonicalMnemonic, passphrase, canonicalList);
}
