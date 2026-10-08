import type { IWordList } from "./WordList";

import englishWordListJson from "./english.wordlist.json";
import chineseSimplifiedWordListJson from "./chinese-simplified.wordlist.json";
import chineseTraditionalWordListJson from "./chinese-traditional.wordlist.json";
import czechWordListJson from "./czech.wordlist.json";
import frenchWordListJson from "./french.wordlist.json";
import italianWordListJson from "./italian.wordlist.json";
import japaneseWordListJson from "./japanese.wordlist.json";
import koreanWordListJson from "./korean.wordlist.json";
import portugueseWordListJson from "./portuguese.wordlist.json";
import spanishWordListJson from "./spanish.wordlist.json";
import bengaliWordListJson from "./bengali.wordlist.json";

export type { IWordList };

export const defaultList = englishWordListJson as IWordList;

export const chineseSimplifiedWordList = chineseSimplifiedWordListJson as IWordList;
export const chineseTraditionalWordList = chineseTraditionalWordListJson as IWordList;
export const czechWordList = czechWordListJson as IWordList;
export const englishWordList = englishWordListJson as IWordList;
export const frenchWordList = frenchWordListJson as IWordList;
export const italianWordList = italianWordListJson as IWordList;
export const japaneseWordList = japaneseWordListJson as IWordList;
export const koreanWordList = koreanWordListJson as IWordList;
export const portugueseWordList = portugueseWordListJson as IWordList;
export const spanishWordList = spanishWordListJson as IWordList;
export const bengaliWordList = bengaliWordListJson as IWordList;
