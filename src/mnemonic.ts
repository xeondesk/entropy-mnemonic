import { getChecksumBin, getIntegerFromBin } from "./common";
import { defaultList } from "./wordLists";
import { IWordList } from "./wordLists/WordList";

/**
 * Converts a BIP39 mnemonic phrase back to its entropy hex string.
 * @param mnemonic - Space-separated mnemonic phrase
 * @param wordList - Word list to use (defaults to English)
 * @returns Hexadecimal entropy string
 * @throws Error if checksum is invalid
 */
export function mnemonicToEntropy(mnemonic: string, wordList: IWordList = defaultList) {
  const words = mnemonic.trim().split(wordList.spacer).filter(Boolean);
  const wordIndexMap = new Map(wordList.words.map((word, index) => [word, index]));
  const bits = words
    .map((word) =>
      (wordIndexMap.get(word) ?? wordList.words.indexOf(word)).toString(2).padStart(11, "0")
    )
    .join("");

  const dividerIndex = Math.floor(bits.length / 33) * 32;
  const entropyBits = bits.slice(0, dividerIndex);
  const checksumBits = bits.slice(dividerIndex);

  const entropyBytes = (entropyBits.match(/(.{1,8})/g) ?? []).map((byte) =>
    getIntegerFromBin(byte)
  );
  const newChecksum = getChecksumBin(entropyBytes);

  if (newChecksum !== checksumBits) {
    throw new Error("[entropy-mnemonic] Invalid checksum.");
  }

  return Array.from(entropyBytes, (byte) => ("0" + (byte & 0xff).toString(16)).slice(-2)).join("");
}
