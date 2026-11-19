import { getChecksumBin, getIntegerFromBin } from "./common";
import { defaultList } from "./wordLists";
import { IWordList } from "./wordLists/WordList";
import { getWordIndexMap } from "./wordLists/lookup";
import { splitMnemonicWords } from "./wordLists/normalization";

// BIP-39 allows 12, 15, 18, 21 or 24 word mnemonics (128-256 bits of entropy)
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24];

/**
 * Gets the number of words in a mnemonic phrase.
 * @param mnemonic - Mnemonic phrase (words separated by whitespace)
 * @param wordList - Word list to use (defaults to English)
 * @returns Number of words in the mnemonic
 */
export function getWordCount(
  mnemonic: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API compatibility; splitting is whitespace-based for all wordlists
  wordList: IWordList = defaultList
): number {
  return splitMnemonicWords(mnemonic).length;
}

/**
 * Gets the entropy bit strength from a mnemonic phrase.
 * @param mnemonic - Mnemonic phrase (words separated by whitespace)
 * @param wordList - Word list to use (defaults to English)
 * @returns Entropy bits (e.g., 128, 160, 192, 224, 256)
 * @throws Error if mnemonic is invalid
 */
export function getEntropyBits(mnemonic: string, wordList: IWordList = defaultList): number {
  const wordCount = getWordCount(mnemonic, wordList);

  if (!VALID_WORD_COUNTS.includes(wordCount)) {
    throw new Error(
      "[entropy-mnemonic] Invalid mnemonic: must contain 12, 15, 18, 21, or 24 words"
    );
  }

  // Calculate entropy bits: (wordCount * 11) - (wordCount * 11 / 33)
  const totalBits = wordCount * 11;
  const checksumBits = totalBits / 33;
  return totalBits - checksumBits;
}

/**
 * Validates a BIP39 mnemonic phrase by checking its checksum.
 * @param mnemonic - Mnemonic phrase (words separated by whitespace)
 * @param wordList - Word list to use (defaults to English)
 * @returns true if mnemonic is valid, false otherwise
 */
export function validateMnemonic(mnemonic: string, wordList: IWordList = defaultList): boolean {
  try {
    mnemonicToEntropy(mnemonic, wordList);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Converts a BIP39 mnemonic phrase back to its entropy hex string.
 * @param mnemonic - Mnemonic phrase (words separated by whitespace)
 * @param wordList - Word list to use (defaults to English)
 * @returns Hexadecimal entropy string
 * @throws Error if the word count is invalid, a word is not in the list,
 * or the checksum verification fails
 */
export function mnemonicToEntropy(mnemonic: string, wordList: IWordList = defaultList) {
  if (!mnemonic || typeof mnemonic !== "string") {
    throw new Error("[entropy-mnemonic] Invalid mnemonic: must be a non-empty string");
  }

  const words = splitMnemonicWords(mnemonic);
  if (words.length === 0) {
    throw new Error(
      "[entropy-mnemonic] Invalid mnemonic: must contain 12, 15, 18, 21, or 24 words"
    );
  }
  if (!VALID_WORD_COUNTS.includes(words.length)) {
    throw new Error(
      "[entropy-mnemonic] Invalid mnemonic: must contain 12, 15, 18, 21, or 24 words"
    );
  }

  const wordIndexMap = getWordIndexMap(wordList);

  const bits = words
    .map((word) => {
      const index = wordIndexMap.get(word);
      if (index === undefined) {
        throw new Error(
          `[entropy-mnemonic] Invalid mnemonic: word "${word}" not found in word list`
        );
      }
      return index.toString(2).padStart(11, "0");
    })
    .join("");

  const dividerIndex = Math.floor(bits.length / 33) * 32;
  const entropyBits = bits.slice(0, dividerIndex);
  const checksumBits = bits.slice(dividerIndex);

  const entropyBytes = entropyBits.match(/(.{1,8})/g)?.map((byte) => getIntegerFromBin(byte)) ?? [];
  const newChecksum = getChecksumBin(entropyBytes);

  if (newChecksum !== checksumBits) {
    throw new Error(
      "[entropy-mnemonic] Invalid mnemonic: checksum verification failed. The mnemonic may be corrupted or incorrect."
    );
  }

  return Array.from(entropyBytes, (byte) => ("0" + (byte & 0xff).toString(16)).slice(-2)).join("");
}
