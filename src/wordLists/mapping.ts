import type { IWordList } from "./WordList";
import { getWordList } from "./lists";
import { computePairingContentHash, computeWordListContentHash } from "./integrity";
import { resolveWordIndex } from "./lookup";
import { splitMnemonicWords } from "./normalization";
import { InvalidMnemonicError, PairingVerificationError, UnsupportedMappingError } from "../errors";

/**
 * Result of a wordlist pairing audit. `valid` is true only when every
 * check passes; mapping functions fail closed on any invalid audit.
 */
export interface PairingAudit {
  readonly valid: boolean;
  readonly fromId: string;
  readonly toId?: string;
  readonly checks: {
    readonly hasPairing: boolean;
    readonly canonicalExists: boolean;
    readonly canonicalIsBip39: boolean;
    readonly lengthsEqual: boolean;
    readonly sourceHashOk: boolean;
    readonly targetHashOk: boolean;
    readonly pairingHashOk: boolean;
  };
  readonly sourceContentHash?: string;
  readonly targetContentHash?: string;
  readonly expectedPairingHash?: string;
}

// Audits are deterministic for frozen wordlists; cache per (from, to)
// pair so bulk mapping does not re-hash 2048-word lists per call.
const auditCache = new WeakMap<IWordList, WeakMap<IWordList, PairingAudit>>();

function auditPairing(from: IWordList, to?: IWordList): PairingAudit {
  const pairing = from.pairing;
  const checks = {
    hasPairing: pairing !== undefined,
    canonicalExists: false,
    canonicalIsBip39: false,
    lengthsEqual: false,
    sourceHashOk: false,
    targetHashOk: false,
    pairingHashOk: false,
  };
  if (!pairing) {
    return {
      valid: false,
      fromId: from.id,
      checks,
      sourceContentHash: from.contentHash,
    };
  }

  let canonical: IWordList | undefined;
  try {
    canonical = getWordList(pairing.canonicalId);
  } catch {
    canonical = undefined;
  }
  const target = to ?? canonical;

  checks.canonicalExists = canonical !== undefined;
  checks.canonicalIsBip39 = canonical?.kind === "bip39";
  checks.lengthsEqual = target !== undefined && target.words.length === from.words.length;

  const sourceHashOk =
    from.contentHash !== undefined && computeWordListContentHash(from.words) === from.contentHash;
  checks.sourceHashOk = sourceHashOk;

  const targetHashOk =
    target?.contentHash !== undefined &&
    computeWordListContentHash(target.words) === target.contentHash;
  checks.targetHashOk = targetHashOk === true;

  const expectedPairingHash =
    sourceHashOk && targetHashOk && target ? computePairingContentHash(from, target) : undefined;
  checks.pairingHashOk =
    pairing.contentHash !== undefined &&
    expectedPairingHash !== undefined &&
    pairing.contentHash === expectedPairingHash;

  const valid = Object.values(checks).every(Boolean);
  return {
    valid,
    fromId: from.id,
    toId: target?.id,
    checks,
    sourceContentHash: from.contentHash,
    targetContentHash: target?.contentHash,
    expectedPairingHash,
  };
}

/**
 * Audits the pairing between a community wordlist and its canonical
 * target. Read-only: never throws, always reports per-check results.
 * Pass `to` explicitly to audit against a specific canonical list.
 */
export function auditWordListPairing(from: IWordList, to?: IWordList): PairingAudit {
  // Resolve the effective target for cache keying; fall back to uncached
  // audit when no pairing/target exists.
  let target = to;
  if (!target && from.pairing) {
    try {
      target = getWordList(from.pairing.canonicalId);
    } catch {
      target = undefined;
    }
  }
  if (!target) {
    return auditPairing(from, to);
  }
  let inner = auditCache.get(from);
  if (!inner) {
    inner = new WeakMap();
    auditCache.set(from, inner);
  }
  const cached = inner.get(target);
  if (cached) return cached;
  const audit = auditPairing(from, target);
  inner.set(target, audit);
  return audit;
}

function requireValidPairing(from: IWordList, to: IWordList): void {
  const audit = auditWordListPairing(from, to);
  if (!audit.valid) {
    const failed = Object.entries(audit.checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => name)
      .join(", ");
    throw new PairingVerificationError(
      `Invalid wordlist pairing "${from.id}" -> "${to.id}": ` +
        `failed checks: ${failed}. Mapping is disabled until pairing ` +
        `metadata and content hashes verify.`
    );
  }
}

function resolveCanonicalTarget(from: IWordList, to?: IWordList): IWordList {
  const pairing = from.pairing;
  if (!pairing) {
    throw new UnsupportedMappingError(
      `Wordlist "${from.id}" has no pairing metadata; ` +
        `community-to-canonical mapping is unavailable.`
    );
  }
  if (pairing.scheme !== "index") {
    throw new UnsupportedMappingError(
      `Unsupported pairing scheme "${pairing.scheme}" ` + `for wordlist "${from.id}".`
    );
  }
  const canonical = to ?? getWordList(pairing.canonicalId);
  if (canonical.id !== pairing.canonicalId) {
    throw new PairingVerificationError(
      `Wordlist "${from.id}" is paired to "${pairing.canonicalId}", ` +
        `not "${canonical.id}". Refusing to guess a pairing.`
    );
  }
  requireValidPairing(from, canonical);
  return canonical;
}

function mapByIndex(mnemonic: string, from: IWordList, to: IWordList): string {
  const words = splitMnemonicWords(mnemonic);
  if (words.length === 0) {
    throw new InvalidMnemonicError("Invalid mnemonic: must contain 12, 15, 18, 21, or 24 words");
  }
  const mapped = words.map((word) => {
    const index = resolveWordIndex(from, word);
    if (index === undefined) {
      throw new InvalidMnemonicError(
        `Invalid mnemonic: word "${word}" not found in word list "${from.id}"`
      );
    }
    const target = to.words[index];
    if (target === undefined) {
      throw new Error(`[entropy-mnemonic] Pairing index ${index} out of range for "${to.id}"`);
    }
    return target;
  });
  return mapped.join(to.spacer);
}

/**
 * Maps a community-list mnemonic to its canonical BIP-39 equivalent by
 * INDEX: word at index i in `from` becomes word at index i in the
 * canonical target. This preserves the exact underlying entropy —
 * H_source === H_canonical — because identical indices produce identical
 * 11-bit groups, entropy bytes, and checksum.
 *
 * Fails closed: throws unless the declared pairing verifies (metadata,
 * scheme, content hashes of BOTH wordlists, and pairing hash).
 *
 * @param mnemonic - Mnemonic phrase in the community wordlist
 * @param from - Community wordlist with verified `pairing` metadata
 * @param to - Canonical target (defaults to `from.pairing.canonicalId`)
 * @returns Canonical mnemonic joined with the target's spacer
 */
export function mapMnemonicToCanonical(mnemonic: string, from: IWordList, to?: IWordList): string {
  const canonical = resolveCanonicalTarget(from, to);
  return mapByIndex(mnemonic, from, canonical);
}

/**
 * Inverse of {@link mapMnemonicToCanonical}: maps a canonical mnemonic
 * back to the community wordlist by index. Same fail-closed verification.
 */
export function mapCanonicalToSource(mnemonic: string, from: IWordList, to?: IWordList): string {
  const canonical = resolveCanonicalTarget(from, to);
  return mapByIndex(mnemonic, canonical, from);
}
