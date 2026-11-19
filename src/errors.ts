/**
 * Machine-readable error codes for entropy-mnemonic.
 * Consumers can branch on `error.code` instead of parsing messages.
 */
export type ErrorCode =
  | "WORDLIST_NOT_FOUND"
  | "AMBIGUOUS_LANGUAGE"
  | "INVALID_MNEMONIC"
  | "WORDLIST_INTEGRITY"
  | "PAIRING_VERIFICATION"
  | "UNSUPPORTED_MAPPING";

/** Base class for all entropy-mnemonic errors. */
export class MnemonicError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** Thrown when a wordlist id is not registered (getWordList). */
export class WordlistNotFoundError extends MnemonicError {
  constructor(id: string, available: readonly string[]) {
    super(
      "WORDLIST_NOT_FOUND",
      `[entropy-mnemonic] Unknown wordlist id "${id}". ` + `Available ids: ${available.join(", ")}`
    );
  }
}

/**
 * Thrown when language detection is ambiguous or found no match and the
 * caller requires a single wordlist (e.g. via getDetectedWordList).
 */
export class AmbiguousLanguageError extends MnemonicError {
  constructor(reason: string) {
    super("AMBIGUOUS_LANGUAGE", `[entropy-mnemonic] ${reason}`);
  }
}

/** Thrown for malformed mnemonics: bad word count, unknown word, bad checksum. */
export class InvalidMnemonicError extends MnemonicError {
  constructor(message: string) {
    super("INVALID_MNEMONIC", `[entropy-mnemonic] ${message}`);
  }
}

/** Thrown when wordlist content fails integrity verification (hash mismatch). */
export class WordlistIntegrityError extends MnemonicError {
  constructor(message: string) {
    super("WORDLIST_INTEGRITY", `[entropy-mnemonic] ${message}`);
  }
}

/** Thrown when community→canonical pairing metadata fails verification. */
export class PairingVerificationError extends MnemonicError {
  constructor(message: string) {
    super("PAIRING_VERIFICATION", `[entropy-mnemonic] ${message}`);
  }
}

/** Thrown for unsupported pairing schemes or unmapped wordlist pairs. */
export class UnsupportedMappingError extends MnemonicError {
  constructor(message: string) {
    super("UNSUPPORTED_MAPPING", `[entropy-mnemonic] ${message}`);
  }
}

/** Type guard: is this error an AmbiguousLanguageError? */
export function isAmbiguousLanguageError(error: unknown): error is AmbiguousLanguageError {
  return error instanceof AmbiguousLanguageError;
}

/** Type guard by machine-readable code. */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof MnemonicError && error.code === code;
}
