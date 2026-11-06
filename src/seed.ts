import { defaultList } from "./wordLists";
import { IWordList } from "./wordLists/WordList";

/**
 * Converts a mnemonic phrase to a binary seed using PBKDF2 with HMAC-SHA512.
 * This follows the BIP-39 standard for seed generation.
 * @param mnemonic - Space-separated mnemonic phrase
 * @param passphrase - Optional passphrase (default: empty string)
 * @param wordList - Word list used to generate the mnemonic (defaults to English)
 * @returns Hexadecimal seed string (64 bytes / 128 hex characters)
 * @throws Error if mnemonic is invalid
 */
export function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = "",
  wordList: IWordList = defaultList
): string {
  if (!mnemonic || typeof mnemonic !== "string") {
    throw new Error("[entropy-mnemonic] Invalid mnemonic: must be a non-empty string");
  }

  const words = mnemonic.trim().split(wordList.spacer).filter(Boolean);
  if (words.length < 12 || words.length > 24) {
    throw new Error(
      "[entropy-mnemonic] Invalid mnemonic: must contain 12-24 words"
    );
  }

  // Normalize mnemonic (NFKD) and passphrase
  const normalizedMnemonic = mnemonic.normalize("NFKD");
  const normalizedPassphrase = "mnemonic" + passphrase.normalize("NFKD");

  // Use pbkdf2 library for PBKDF2
  const pbkdf2 = require("pbkdf2");
  const seed = pbkdf2.pbkdf2Sync(
    normalizedMnemonic,
    normalizedPassphrase,
    2048,
    64,
    "sha512"
  );
  return seed.toString("hex");
}
