# entropy-mnemonic

[![npm version](https://badge.fury.io/js/entropy-mnemonic.svg)](https://www.npmjs.com/package/entropy-mnemonic)
[![npm downloads](https://img.shields.io/npm/dm/entropy-mnemonic)](https://www.npmjs.com/package/entropy-mnemonic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/xeondesk/entropy-mnemonic/actions/workflows/nodejs.yml/badge.svg?branch=main)](https://github.com/xeondesk/entropy-mnemonic/actions/workflows/nodejs.yml)
[![Coverage](https://img.shields.io/codecov/c/github/xeondesk/entropy-mnemonic)](https://codecov.io/gh/xeondesk/entropy-mnemonic)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A complete BIP-39 mnemonic and entropy generator with seed generation, validation, and multi-language support in TypeScript.

## Installation

Install using yarn or npm:

```bash
npm install entropy-mnemonic
# or
yarn add entropy-mnemonic
```

## Features

- Generate entropy with customizable bit length using cryptographically secure random generation (Web Crypto API)
- Convert entropy to mnemonic phrases (BIP-39 compatible)
- Convert mnemonic phrases back to entropy
- Generate BIP-39 seeds from mnemonics with optional passphrase (PBKDF2 with HMAC-SHA512)
- Validate mnemonic phrases with checksum verification
- Utility functions for word count and entropy bit strength
- Support for multiple languages (11 wordlists available)
- TypeScript support
- Optimized performance with word index caching

## Supported Languages

Ten official BIP-39 wordlists (`kind: "bip39"`):

- English
- Chinese (Simplified)
- Chinese (Traditional)
- Czech
- French
- Italian
- Japanese
- Korean
- Portuguese
- Spanish

Plus one community wordlist (`kind: "community"`, not part of the BIP-39 specification):

- Bengali (TZUR Originals, index-paired to English — see [Seed derivation](#seed-derivation-and-wordlist-kind))

## Usage

### Generate Entropy

```typescript
import { generateEntropy } from 'entropy-mnemonic';

// Generate 32 hex characters (128 bits) of entropy (default)
const entropy128 = generateEntropy();

// Generate 64 hex characters (256 bits) of entropy
const entropy256 = generateEntropy(64);

// Generate 16 hex characters (64 bits) of entropy
const entropy64 = generateEntropy(16);
```

### Convert Entropy to Mnemonic

```typescript
import { entropyToMnemonic, englishWordList } from 'entropy-mnemonic';

const entropy = generateEntropy(32); // 128 bits
const mnemonic = entropyToMnemonic(entropy, englishWordList);

console.log(mnemonic); // e.g., "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis"
```

### Convert Mnemonic to Entropy

```typescript
import { mnemonicToEntropy, englishWordList } from 'entropy-mnemonic';

const mnemonic = "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis";
const entropy = mnemonicToEntropy(mnemonic, englishWordList);

console.log(entropy); // Returns the original entropy hex string
```

### Using Different Languages

```typescript
import { entropyToMnemonic, bengaliWordList } from 'entropy-mnemonic';

const entropy = generateEntropy(32); // 128 bits
const mnemonic = entropyToMnemonic(entropy, bengaliWordList);

console.log(mnemonic); // Bengali mnemonic phrase
```

### Wordlist Registry

All wordlists are registered in a central `wordLists` record keyed by id (`"english"`, `"japanese"`, `"bengali"`, …), with lookup helpers:

```typescript
import {
  wordLists,
  getWordList,
  getWordListIds,
  isCanonicalWordList,
} from 'entropy-mnemonic';

getWordListIds(); // ["english", "japanese", ..., "bengali"]

const ja = getWordList('japanese'); // official BIP-39 wordlist
isCanonicalWordList(ja); // true

const bn = getWordList('bengali'); // community wordlist
isCanonicalWordList(bn); // false
bn.kind;   // "community"
bn.source; // "https://github.com/osem23/bip39-wordlists-tzur"
bn.license; // "MIT"
```

Every `IWordList` exposes `id`, `language`, `spacer`, `kind` (`"bip39"` | `"community"`), optional `source`/`license` provenance, and `words` (2048 entries).

### Generate Seed from Mnemonic

```typescript
import { mnemonicToSeed, generateEntropy, entropyToMnemonic, englishWordList } from 'entropy-mnemonic';

const entropy = generateEntropy(32); // 128 bits
const mnemonic = entropyToMnemonic(entropy, englishWordList);

// Generate seed without passphrase
const seed = mnemonicToSeed(mnemonic);
console.log(seed); // 128-character hex string (64 bytes)

// Generate seed with passphrase
const seedWithPassphrase = mnemonicToSeed(mnemonic, "my secret passphrase");
console.log(seedWithPassphrase); // Different seed due to passphrase
```

#### Seed derivation and wordlist kind

`mnemonicToSeed` always runs PBKDF2 over the literal mnemonic string (NFKD-normalized, per BIP-39):

- **`kind: "bip39"`** wordlists produce spec-compliant, interoperable seeds.
- **`kind: "community"`** wordlists (currently only Bengali) are not part of BIP-39. Their seeds are computed over the native-language text and will **not** match the seed an English BIP-39 wallet derives for the equivalent phrase. Mnemonic↔entropy round-trips still work within this library because the Bengali list is index-paired to English, but treat community-list seeds as implementation-specific.

### Validate Mnemonic

```typescript
import { validateMnemonic, generateEntropy, entropyToMnemonic, englishWordList } from 'entropy-mnemonic';

const entropy = generateEntropy(32); // 128 bits
const mnemonic = entropyToMnemonic(entropy, englishWordList);

const isValid = validateMnemonic(mnemonic);
console.log(isValid); // true

const invalidMnemonic = "invalid words here";
const isInvalid = validateMnemonic(invalidMnemonic);
console.log(isInvalid); // false
```

### Get Word Count and Entropy Bits

```typescript
import { getWordCount, getEntropyBits, generateEntropy, entropyToMnemonic, englishWordList } from 'entropy-mnemonic';

const entropy = generateEntropy(32); // 128 bits
const mnemonic = entropyToMnemonic(entropy, englishWordList);

const wordCount = getWordCount(mnemonic);
console.log(wordCount); // 12

const entropyBits = getEntropyBits(mnemonic);
console.log(entropyBits); // 128
```

## API Reference

### `generateEntropy(length?: number): string`

Generates cryptographically secure random entropy as a hexadecimal string.

- **length**: Desired length in characters (16-32, multiple of 4, default: 32)
- **Returns**: Hexadecimal string representing the entropy

### `entropyToMnemonic(entropy: string, wordList?: IWordList): string`

Converts entropy hex string to a mnemonic phrase.

- **entropy**: Hexadecimal string of entropy
- **wordList**: Word list to use for mnemonic generation (defaults to English)
- **Returns**: Space-separated mnemonic phrase

### `mnemonicToEntropy(mnemonic: string, wordList?: IWordList): string`

Converts a mnemonic phrase back to entropy hex string.

- **mnemonic**: Space-separated mnemonic phrase
- **wordList**: Word list used to generate the mnemonic (defaults to English)
- **Returns**: Hexadecimal string of the entropy

### `mnemonicToSeed(mnemonic: string, passphrase?: string, wordList?: IWordList): string`

Converts a mnemonic phrase to a binary seed using PBKDF2 with HMAC-SHA512 (BIP-39 standard).

- **mnemonic**: Space-separated mnemonic phrase
- **passphrase**: Optional passphrase for additional security (default: empty string)
- **wordList**: Word list used to generate the mnemonic (defaults to English)
- **Returns**: Hexadecimal seed string (64 bytes / 128 hex characters)

### `mnemonicToBip39Seed(mnemonic: string, passphrase?: string, wordList?: IWordList): string`

Strict variant of `mnemonicToSeed` for BIP-39-interoperable seeds. Identical behavior, but **throws** if `wordList.kind !== "bip39"` — use it whenever the seed must be compatible with standard BIP-39 wallets.

### `validateMnemonic(mnemonic: string, wordList?: IWordList): boolean`

Validates a mnemonic phrase by checking its checksum.

- **mnemonic**: Space-separated mnemonic phrase
- **wordList**: Word list to use for validation (defaults to English)
- **Returns**: true if mnemonic is valid, false otherwise

### `getWordCount(mnemonic: string, wordList?: IWordList): number`

Gets the number of words in a mnemonic phrase.

- **mnemonic**: Space-separated mnemonic phrase
- **wordList**: Word list to use (defaults to English)
- **Returns**: Number of words in the mnemonic

### `getEntropyBits(mnemonic: string, wordList?: IWordList): number`

Gets the entropy bit strength from a mnemonic phrase.

- **mnemonic**: Mnemonic phrase (words separated by whitespace)
- **wordList**: Word list to use (defaults to English)
- **Returns**: Entropy bits (e.g., 128, 160, 192, 224, 256)

### `wordLists: Readonly<Record<string, IWordList>>`

Central registry of all wordlists keyed by id.

### `getWordListIds(): string[]`

Returns the ids of all registered wordlists.

### `getWordList(id: string): IWordList`

Looks up a wordlist by id. Throws if the id is not registered.

### `isCanonicalWordList(wordList: IWordList): boolean`

Returns `true` for official BIP-39 wordlists (`kind === "bip39"`), `false` for community wordlists.

### `IWordList`

```typescript
interface IWordList {
  id: string;            // e.g. "english", "bengali"
  language: string;      // BIP-39 language name
  spacer: string;        // word separator used when generating (e.g. "\u3000" for Japanese)
  kind: "bip39" | "community";
  source?: string;       // provenance URL
  license?: string;      // SPDX id, when verified
  words: string[];       // exactly 2048 entries
}
```

Note: mnemonic input parsing accepts any Unicode whitespace (including U+3000 for Japanese) and NFC/NFD-equivalent word forms, regardless of the list's canonical `spacer`.

## License

MIT © [Md Sulaiman](https://github.com/xeondesk)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you have any issues or questions, please [open an issue](https://github.com/xeondesk/entropy-mnemonic/issues).
