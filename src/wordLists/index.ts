export type { IWordList, WordlistKind } from "./WordList";
export type { NormalizationProfile, UnicodeNormalizationForm } from "./normalization";
export { getNormalizationProfile, normalizeForLookup } from "./normalization";
export type { DetectionCandidate, DetectionResult } from "./detection";
export { detectLanguage, getDetectedWordList } from "./detection";
export type { PairingAudit } from "./mapping";
export { auditWordListPairing, mapMnemonicToCanonical, mapCanonicalToSource } from "./mapping";

export {
  defaultList,
  wordLists,
  getWordListIds,
  getWordList,
  isCanonicalWordList,
  englishWordList,
  japaneseWordList,
  koreanWordList,
  spanishWordList,
  chineseSimplifiedWordList,
  chineseTraditionalWordList,
  frenchWordList,
  italianWordList,
  czechWordList,
  portugueseWordList,
  bengaliWordList,
} from "./lists";
