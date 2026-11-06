# entropy-mnemonic

[![npm version](https://badge.fury.io/js/entropy-mnemonic.svg)](https://www.npmjs.com/package/entropy-mnemonic)
[![npm downloads](https://img.shields.io/npm/dm/entropy-mnemonic)](https://www.npmjs.com/package/entropy-mnemonic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/xeondesk/entropy-mnemonic/workflows/Node.js%20CI/badge.svg)](https://github.com/xeondesk/entropy-mnemonic/actions)
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
- Bengali

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

- **mnemonic**: Space-separated mnemonic phrase
- **wordList**: Word list to use (defaults to English)
- **Returns**: Entropy bits (e.g., 128, 160, 192, 224, 256)

## License

MIT © [Md Sulaiman](https://github.com/xeondesk)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you have any issues or questions, please [open an issue](https://github.com/xeondesk/entropy-mnemonic/issues).