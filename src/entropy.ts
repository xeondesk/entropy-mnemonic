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
  validateEntropyLength(entropy.length);

  if (!entropy.match(/^[a-zA-Z0-9]+$/)) {
    throw new Error(
      "[entropy-mnemonic] Invalid entropy: it should be an hexadecimal string (char from: [a-zA-Z0-9])"
    );
  }

  const entropyBuffer = getByteArrayFromHexString(entropy);
  const entropyBits = bytesToBinary(entropyBuffer);
  const checksumBits = getChecksumBin(entropyBuffer);

  const bits = entropyBits + checksumBits;
  const chunks = bits.match(/(.{1,11})/g) ?? [];

  const words = chunks.map((binary) => wordList.words[getIntegerFromBin(binary)]);

  return words.join(wordList.spacer);
}
