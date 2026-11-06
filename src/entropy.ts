import { IWordList } from "./wordLists/WordList";
import { defaultList } from "./wordLists";
import {
  bytesToBinary,
  getByteArrayFromHexString,
  getChecksumBin,
  getIntegerFromBin,
  validateEntropyLength,
} from "./common";

/**
 * Converts an entropy hex string to a BIP39 mnemonic phrase.
 * @param entropy - Hexadecimal string (16-32 characters, multiple of 4)
 * @param wordList - Word list to use (defaults to English)
 * @returns Space-separated mnemonic phrase
 * @throws Error if entropy is invalid
 */
export function entropyToMnemonic(entropy: string, wordList: IWordList = defaultList) {
  if (!entropy || typeof entropy !== "string") {
    throw new Error(
      "[entropy-mnemonic] Invalid entropy: must be a non-empty string"
    );
  }

  validateEntropyLength(entropy.length);

  if (!/^[a-fA-F0-9]+$/.test(entropy)) {
    throw new Error(
      "[entropy-mnemonic] Invalid entropy: must contain only hexadecimal characters (0-9, a-f, A-F)"
    );
  }

  const entropyBuffer = getByteArrayFromHexString(entropy);
  const entropyBits = bytesToBinary(entropyBuffer);
  const checksumBits = getChecksumBin(entropyBuffer);

  const bits = entropyBits + checksumBits;
  const chunks = bits.match(/(.{1,11})/g) ?? [];

  const words = chunks.map((binary) => {
    const index = getIntegerFromBin(binary);
    if (index >= wordList.words.length) {
      throw new Error(
        "[entropy-mnemonic] Invalid entropy: word index out of bounds"
      );
    }
    return wordList.words[index];
  });

  return words.join(wordList.spacer);
}
