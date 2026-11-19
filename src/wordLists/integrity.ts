import { sha256 } from "js-sha256";
import type { IWordList } from "./WordList";

/**
 * Deterministic serialization of a wordlist's word sequence:
 * words joined by "\n" with a trailing newline. This is the same
 * serialization verified against the upstream TZUR Bengali wordlist
 * (sha256 d8938514b5b3826a64fd53a1651ec6708f6570be1c52ff0ab5cb9eaae68fcd3c).
 */
export function serializeWordList(words: readonly string[]): string {
  return words.join("\n") + "\n";
}

/**
 * Computes the content hash of a wordlist: sha256 hex of the canonical
 * serialization. Any change to the word sequence changes the hash.
 */
export function computeWordListContentHash(words: readonly string[]): string {
  return sha256(serializeWordList(words));
}

/**
 * Computes the pairing content hash binding a community→canonical pair
 * to the exact content hashes of BOTH wordlists. If either wordlist is
 * updated, this hash changes and prior pairing verification is invalid.
 */
export function computePairingContentHash(
  from: Pick<IWordList, "id" | "contentHash">,
  to: Pick<IWordList, "id" | "contentHash">
): string {
  return sha256(`${from.id}:${to.id}:${from.contentHash ?? ""}:${to.contentHash ?? ""}`);
}
