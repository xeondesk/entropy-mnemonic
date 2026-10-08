# entropy-mnemonic

[![npm version](https://badge.fury.io/js/entropy-mnemonic.svg)](https://www.npmjs.com/package/entropy-mnemonic)
[![npm downloads](https://img.shields.io/npm/dm/entropy-mnemonic)](https://www.npmjs.com/package/entropy-mnemonic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/xeondesk/entropy-mnemonic/workflows/Node.js%20CI/badge.svg)](https://github.com/xeondesk/entropy-mnemonic/actions)
[![Coverage](https://img.shields.io/codecov/c/github/xeondesk/entropy-mnemonic)](https://codecov.io/gh/xeondesk/entropy-mnemonic)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A simple and complete entropy-mnemonic mnemonic (passphrase) and entropy generator in TypeScript.

## Installation

Install using yarn or npm:

```bash
npm install entropy-mnemonic
# or
yarn add entropy-mnemonic
```

## Features

- Generate entropy with customizable bit length
- Convert entropy to mnemonic phrases (BIP-39 compatible)
- Convert mnemonic phrases back to entropy
- Support for multiple languages (11 wordlists available)
- TypeScript support
- Zero dependencies (except for crypto utilities)

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

// Generate 128 bits of entropy (default)
const entropy128 = generateEntropy();

// Generate 256 bits of entropy
const entropy256 = generateEntropy(256);
```

### Convert Entropy to Mnemonic

```typescript
import { entropyToMnemonic, englishWordList } from 'entropy-mnemonic';

const entropy = generateEntropy(128);
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

const entropy = generateEntropy(128);
const mnemonic = entropyToMnemonic(entropy, bengaliWordList);

console.log(mnemonic); // Bengali mnemonic phrase
```

## API Reference

### `generateEntropy(bits?: number): string`

Generates random entropy as a hexadecimal string.

- **bits**: Number of bits of entropy to generate (default: 128)
- **Returns**: Hexadecimal string representing the entropy

### `entropyToMnemonic(entropy: string, wordList: IWordList): string`

Converts entropy hex string to a mnemonic phrase.

- **entropy**: Hexadecimal string of entropy
- **wordList**: Word list to use for mnemonic generation
- **Returns**: Space-separated mnemonic phrase

### `mnemonicToEntropy(mnemonic: string, wordList: IWordList): string`

Converts a mnemonic phrase back to entropy hex string.

- **mnemonic**: Space-separated mnemonic phrase
- **wordList**: Word list used to generate the mnemonic
- **Returns**: Hexadecimal string of the entropy

## License

MIT © [Md Sulaiman](https://github.com/xeondesk)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you have any issues or questions, please [open an issue](https://github.com/xeondesk/entropy-mnemonic/issues).