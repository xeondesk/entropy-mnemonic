# RFC: Multilingual Mnemonic Engine (v2)

**Status:** Draft
**Base:** `v1.4.0` (Wordlist Registry v1)
**Branch:** `feat/multilingual-mnemonic-engine`

## 1. Problem statement

v1.4.0 ships a correct, frozen wordlist registry: 10 canonical BIP-39
wordlists plus one community wordlist (Bengali/TZUR). What it does *not*
do:

- Detect which language/wordlist a mnemonic phrase belongs to.
- Convert a community-list mnemonic (e.g. Bengali) into its canonical
  English BIP-39 equivalent — required for seed interoperability with
  standard wallets.
- Provide script-aware Unicode normalization for parsing and seed
  derivation across all shipped scripts.
- Version or audit wordlist provenance beyond a static `source` URL.

The Bengali/TZUR wordlist is **index-paired** to English BIP-39: word at
index `i` in `bengali.wordlist.json` is the Bengali translation of
`english.wordlist.json[i]`. This makes deterministic community→canonical
mapping possible *for this list* — but only if the mapping is explicit,
verified, and entropy-preserving.

## 2. Goals

1. Language auto-detection for mnemonics (canonical and community lists).
2. Explicit, verified community→canonical word mapping.
3. Bengali→English BIP-39 seed interoperability.
4. Script-aware Unicode normalization for parsing and derivation.
5. Wordlist provenance/versioning metadata.
6. Cross-implementation compatibility tests (vectors + packed artifact).

## 3. Non-negotiable invariants

These are acceptance criteria for every v2 feature. Violations are bugs,
not edge cases.

| # | Invariant | Enforcement |
|---|-----------|-------------|
| I1 | **Entropy preservation.** Mapping a community mnemonic to canonical form must produce a mnemonic that decodes to the *identical* entropy bytes and checksum. `mnemonicToEntropy(mapped) === mnemonicToEntropy(original, communityList)`. | Property test over all 2048 indices × all valid word counts. |
| I2 | **No silent reinterpretation.** Unknown words, ambiguous words, or words belonging to multiple lists must produce an explicit error or an explicit disambiguation result — never a guessed mapping. | Unit + fuzz tests. |
| I3 | **Ambiguity-aware detection.** Language detection must report confidence/ambiguity when a word or phrase matches multiple lists (e.g. shared loanwords), not silently pick one. | Detection result type carries candidates. |
| I4 | **Script-aware normalization.** Normalization must be chosen per script: NFC/NFD handling for combining marks (Latin, Bengali), Hangul jamo composition (Korean), kana dakuten (Japanese), and ideographic-space handling (Japanese U+3000). No blanket normalization may corrupt a wordlist's canonical byte form. | Per-script normalization table + round-trip tests per list. |
| I5 | **Vector-verified seeds.** Any code path claiming BIP-39 seed interoperability must pass the official BIP-39 test vectors (all canonical lists where vectors exist) before and after refactoring. | Vector test suite stays green; new mapping path adds Bengali→English vector derived from the official English vectors. |
| I6 | **Backward compatibility.** Every v1.4.0 public API signature and behavior is preserved. `mnemonicToSeed` stays permissive; `mnemonicToBip39Seed` stays strict. New capabilities are additive exports only. | API surface diff test; existing 160 tests unchanged and passing. |

## 4. Current-state facts (verified in v1.4.0)

- `IWordList`: `{ id, language, spacer, kind, source?, license?, readonly words }`,
  all entries and word arrays frozen.
- `kind: "bip39"` (10 lists) vs `kind: "community"` (bengali only).
- `mnemonicToEntropy` accepts any Unicode whitespace and NFC/NFD-equivalent
  input via NFC-keyed index maps (collision-free — verified).
- `mnemonicToBip39Seed` validates kind → word membership → count →
  checksum → PBKDF2.
- `mnemonicToSeed` derives over the literal (NFKD) mnemonic string and is
  list-agnostic.
- Wordlist normalization forms differ per file: Korean is fully NFD,
  Japanese/French/Spanish contain NFD entries; Bengali is NFC.

## 5. Proposed architecture

```
Mnemonic (string)
   │
   ├── detectLanguage(mnemonic) ──► DetectionResult { candidates, confidence }
   │
   ├── Wordlist decoding ──► indices[0..n) ──► entropy + checksum validation
   │        ▲                        │
   │        │                        ▼
   │   wordlist registry       Canonical indices (0..2047)
   │                                   │
   │                    ┌──────────────┴──────────────┐
   │                    ▼                             ▼
   │          community wordlist              canonical wordlist
   │          (bengali)                       (english)
   │                    │                             │
   │                    └──── mapWords() ─────────────┘
   │                              │
   │                              ▼
   │                    canonical mnemonic (English)
   │                              │
   └── Seed derivation ◄──────────┘
        PBKDF2-HMAC-SHA512 over NFKD mnemonic + "mnemonic"+passphrase
```

Key separation (carried over from v1): **decoding** (mnemonic → indices →
entropy) is wordlist-dependent; **seed derivation** is text-dependent and
must only ever run on canonical-form mnemonics when interoperability is
claimed.

### 5.1 Language detection (`wordLists/detection/`)

```ts
interface DetectionCandidate {
  wordList: IWordList;
  matchedWords: number;   // how many phrase words resolved in this list
  totalWords: number;
}
interface DetectionResult {
  candidates: DetectionCandidate[];  // sorted by matchedWords desc
  ambiguous: boolean;                // true if >1 candidate with full match
  detected?: IWordList;              // set only when unambiguous
}
```

- Build per-list word→presence sets lazily (reuse the NFC-keyed index
  maps; share the WeakMap cache).
- A phrase "detected" as list L requires *every* word to resolve in L
  (partial matches are reported as candidates but never auto-selected).
- Ambiguity is real: e.g. a single shared word is not a phrase; full-phrase
  collisions across lists are possible in principle — the result type must
  surface them (I3).

### 5.2 Community→canonical mapping (`wordLists/mapping/`)

```ts
function mapMnemonicToCanonical(
  mnemonic: string,
  from: IWordList,   // must be kind === "community"
  to?: IWordList     // defaults to englishWordList
): string
```

Rules:

- Resolve `from` words to indices via the existing index map (NFC).
- Look up `to.words[index]` — **index pairing, not lexical translation**.
  This is what guarantees I1: identical indices ⇒ identical 11-bit groups
  ⇒ identical entropy and checksum.
- The pairing claim ("bengali[i] ↔ english[i]") must be *verified*, not
  assumed: ship a conformance test that asserts the mapping is total
  (every index covered) and injective where required. Where the source
  project documents pairing (TZUR README), cite it in `source`.
- If `to` is not the documented pair target for `from`, throw — do not
  guess a pairing (I2).
- Output uses `to.spacer` (ASCII space for English).

### 5.3 Normalization (`wordLists/normalization/`)

Per-script normalization table, applied at parse boundaries only:

| Script | Lists | Input normalization | Notes |
|--------|-------|--------------------|-------|
| Latin | en, es, fr, it, pt, cs | NFC | accent folding only for prefix UX, never for lookup |
| Bengali | bn | NFC | combining vowel signs; NFC is injective (verified) |
| Korean | ko | NFC of jamo → syllables | list stored NFD; NFC keys already handle this |
| Japanese | ja | NFC + whitespace split | U+3000 ideographic space; NFKD collapses it to ASCII for PBKDF2 |
| Chinese | zh-Hans, zh-Hant | NFC | no normalization needed beyond identity |

Seed derivation already applies NFKD per BIP-39 — unchanged.

### 5.4 Seed interoperability

- `bip39SeedFromCommunity(mnemonic, passphrase?, communityList)`:
  detect/verify → `mnemonicToEntropy(mnemonic, communityList)` (validates
  checksum) → `mapMnemonicToCanonical` → `mnemonicToBip39Seed(mapped, …)`.
  One call, full validation chain; throws on any ambiguity.
- Never map-then-derive silently inside `mnemonicToSeed` — the permissive
  API keeps its literal-text semantics (I6).

### 5.5 Provenance & versioning

Extend `IWordList` (additive, optional fields — I6 safe):

```ts
interface IWordList {
  // ...v1 fields unchanged
  readonly version?: string;        // e.g. "bip39-2017-09" / "tzur-2026-04"
  readonly pairing?: {              // only for community lists
    readonly canonicalId: string;   // e.g. "english"
    readonly scheme: "index";       // index-paired translation
    readonly verifiedBy?: string;   // test/vector reference
  };
}
```

## 6. Entropy-preservation property test (mandatory)

For every community list C paired to canonical E:

```
∀ entropy e ∈ valid BIP-39 entropies (128–256 bits, sampled + exhaustive
  over index space):
  let m_c = entropyToMnemonic(e, C)
  let m_e = mapMnemonicToCanonical(m_c, C, E)
  assert mnemonicToEntropy(m_e, E) === e          // I1
  assert mnemonicToEntropy(m_c, C) === e          // decode consistency
  assert getWordCount(m_e) === getWordCount(m_c)  // shape preserved
```

Exhaustive index coverage: for each index i in 0..2047, construct the
bit pattern that selects i and assert the mapped word equals
`E.words[i]` — this proves the pairing is total and exact, not approximate.

## 7. Backward compatibility

- No existing export renamed, removed, or re-typed.
- `IWordList` gains only optional readonly fields.
- `mnemonicToSeed` / `mnemonicToBip39Seed` signatures unchanged;
  `mnemonicToBip39Seed` may gain stricter *documented* behavior only if it
  remains a superset of current acceptances — preferred: leave untouched.
- All 160 v1.4.0 tests must pass unmodified; new tests are additive.

## 8. Milestones

| Phase | Deliverable | Gate |
|-------|-------------|------|
| v2.0a | This RFC + detection module + tests | Ambiguity semantics reviewed |
| v2.0b | Mapping module + entropy-preservation property tests | I1/I2 proven exhaustively |
| v2.0c | `bip39SeedFromCommunity` + Bengali→English vectors | I5 vectors pass |
| v2.0d | Normalization table + per-script tests | I4 verified per list |
| v2.0e | Provenance/versioning fields | Docs + registry metadata |
| v2.0f | Packed-artifact + cross-impl compat suite | npm pack consumer green |

## 9. Open questions

1. Should detection be a separate entry point or integrated into
   `mnemonicToEntropy` via an `auto` wordlist sentinel? (Leaning separate —
   keeps hot paths allocation-free.)
2. Multi-community-list support: the mapping table is data-driven
   (`pairing` metadata), so adding a future community list is config, not
   code — confirm that's the intended extension model.
3. Do we want a `canonicalMnemonic()` helper that returns both the mapped
   phrase *and* its English entropy for display/audit, or keep mapping
   internal to seed derivation?
4. Versioning scheme for wordlists: date-based (`tzur-2026-04`) vs.
   content-hash. Content-hash is self-verifying; date is human-readable.
   Proposal: both (`version` + `contentHash`).

## 10. Explicit non-goals for v2

- Generating *new* community wordlists or modifying existing word data.
- HD wallet derivation (BIP-32/44) — seed layer only.
- Changing PBKDF2 parameters or checksum algorithm.
- Silent auto-detection inside seed derivation (detection is explicit).

---

*RFC drafted for review before implementation. Invariant violations found
during implementation must be resolved by fixing the code or amending this
document — never by weakening a test.*
