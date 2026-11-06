import { getChecksumBin, getIntegerFromBin } from "./common";
import { defaultList } from "./wordLists";
import { IWordList } from "./wordLists/WordList";

// Cache word index maps to avoid recreating them on every call
const wordIndexCache = new WeakMap<IWordList, Map<string, number>>();

/**
 * Gets or creates a cached word index map for the given word list.
 * @private
 */
function getWordIndexMap(wordList: IWordList): Map<string, number> {
  let cached = wordIndexCache.get(wordList);
  if (!cached) {
    cached = new Map(wordList.words.map((word, index) => [word, index]));
    wordIndexCache.set(wordList, cached);
  }
  return cached;
}

/**
 * Gets the number of words in a mnemonic phrase.
 * @param mnemonic - Space-separated mnemonic phrase
 * @param wordList - Word list to use (defaults to English)
 * @returns Number of words in the mnemonic
 */
export function getWordCount(mnemonic: string, wordList: IWordList = defaultList): number {
  return mnemonic.trim().split(wordList.spacer).filter(Boolean).length;
}

/**
 * Gets the entropy bit strength from a mnemonic phrase.
 * @param mnemonic - Space-separated mnemonic phrase
 * @param wordList - Word list to use (defaults to English)
 * @returns Entropy bits (e.g., 128, 160, 192, 224, 256)
 * @throws Error if mnemonic is invalid
 */
export function getEntropyBits(mnemonic: string, wordList: IWordList = defaultList): number {
  const wordCount = getWordCount(mnemonic, wordList);
  const validWordCounts = [12, 15, 18, 21, 24];
  
  if (!validWordCounts.includes(wordCount)) {
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
 * @param mnemonic - Space-separated mnemonic phrase
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
 * @param mnemonic - Space-separated mnemonic phrase
 * @param wordList - Word list to use (defaults to English)
 * @returns Hexadecimal entropy string
 * @throws Error if checksum is invalid or mnemonic contains invalid words
 */
export function mnemonicToEntropy(mnemonic: string, wordList: IWordList = defaultList) {
  if (!mnemonic || typeof mnemonic !== "string") {
    throw new Error(
      "[entropy-mnemonic] Invalid mnemonic: must be a non-empty string"
    );
  }

  const words = mnemonic.trim().split(wordList.spacer).filter(Boolean);
  const wordIndexMap = getWordIndexMap(wordList);
  
  const bits = words
    .map((word) => {
      const index = wordIndexMap.get(word) ?? wordList.words.indexOf(word);
      if (index === -1) {
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

  const entropyBytes = entropyBits.match(/(.{1,8})/g)?.map((byte) =>
    getIntegerFromBin(byte)
  ) ?? [];
  const newChecksum = getChecksumBin(entropyBytes);

  if (newChecksum !== checksumBits) {
    throw new Error(
      "[entropy-mnemonic] Invalid mnemonic: checksum verification failed. The mnemonic may be corrupted or incorrect."
    );
  }

  return Array.from(entropyBytes, (byte) => ("0" + (byte & 0xff).toString(16)).slice(-2)).join("");
}
