import { expect, describe, it } from "vitest";
import * as bip39 from "bip39";
import { entropyToMnemonic as scureE2M, mnemonicToSeedSync as scureSeed } from "@scure/bip39";
import { wordlist as scureEn } from "@scure/bip39/wordlists/english.js";
import crypto from "node:crypto";
import {
  entropyToMnemonic,
  mnemonicToEntropy,
  mnemonicToSeed,
  mnemonicToBip39Seed,
  validateMnemonic,
  getWordList,
  wordLists,
} from "../../src/index";
import golden from "./fixtures/golden.json";

const BIP39_WL: Record<string, string> = {
  english: "english",
  japanese: "japanese",
  korean: "korean",
  spanish: "spanish",
  "chinese-simplified": "chinese_simplified",
  "chinese-traditional": "chinese_traditional",
  french: "french",
  italian: "italian",
  czech: "czech",
  portuguese: "portuguese",
};

const pbkdf2 = (m: string, pw: string) =>
  crypto
    .pbkdf2Sync(
      Buffer.from(m.normalize("NFKD"), "utf8"),
      Buffer.from(("mnemonic" + pw).normalize("NFKD"), "utf8"),
      2048,
      64,
      "sha512"
    )
    .toString("hex");

describe("golden fixtures — all 10 canonical wordlists", () => {
  it.each(Object.keys(golden.canonical))("%s mnemonic matches oracle", (id) => {
    const list = getWordList(id);
    const ours = entropyToMnemonic(golden.entropies["128"], list);
    expect(ours).toBe(golden.canonical[id]);
  });

  it.each(["128", "160", "192", "224", "256"])("english %s bits: ours==bip39==scure", (bits) => {
    const entropy = golden.entropies[bits];
    const mnemonic = (golden.seeds as any)[bits];
    const ours = entropyToMnemonic(entropy, getWordList("english"));
    expect(ours).toBe(mnemonic);
    expect(ours).toBe((golden.scure as any)[bits]);
    const wl = bip39.wordlists.english;
    expect(bip39.mnemonicToEntropy(ours, wl).toString("hex")).toBe(entropy);
    expect(mnemonicToEntropy(ours, getWordList("english"))).toBe(entropy);
  });

  it("entropy recovery round-trips for all sizes", () => {
    for (const bits of ["128", "160", "192", "224", "256"]) {
      const mnemonic = (golden.seeds as any)[bits];
      expect(mnemonicToEntropy(mnemonic, getWordList("english"))).toBe(golden.entropies[bits]);
    }
  });
});

describe("seed derivation vs independent oracles", () => {
  const en = golden.seeds["128"] as string;
  it("empty passphrase == node crypto pbkdf2 == scure", () => {
    expect(mnemonicToBip39Seed(en, "", getWordList("english"))).toBe(golden.seeds["128_empty"]);
    expect(Buffer.from(scureSeed(en, "")).toString("hex")).toBe(golden.seeds["128_empty"]);
    expect(pbkdf2(en, "")).toBe(golden.seeds["128_empty"]);
  });
  it("TREZOR passphrase", () => {
    expect(mnemonicToBip39Seed(en, "TREZOR", getWordList("english"))).toBe(
      golden.seeds["128_trezor"]
    );
    expect(pbkdf2(en, "TREZOR")).toBe(golden.seeds["128_trezor"]);
  });
  it("unicode passphrase", () => {
    expect(mnemonicToBip39Seed(en, "pässwörd🔐", getWordList("english"))).toBe(
      golden.seeds["128_unicode"]
    );
    expect(pbkdf2(en, "pässwörd🔐")).toBe(golden.seeds["128_unicode"]);
  });
  it("256-bit mnemonic seed", () => {
    expect(mnemonicToBip39Seed(golden.seeds["256"], "", getWordList("english"))).toBe(
      golden.seeds["256_empty"]
    );
    expect(pbkdf2(golden.seeds["256"], "")).toBe(golden.seeds["256_empty"]);
  });
  it("mnemonicToSeed agrees with mnemonicToBip39Seed for canonical lists", () => {
    expect(mnemonicToSeed(en, "TREZOR", getWordList("english"))).toBe(
      mnemonicToBip39Seed(en, "TREZOR", getWordList("english"))
    );
  });
});

describe("checksum validation parity", () => {
  it("validates oracle mnemonics, rejects corrupted", () => {
    const en = golden.seeds["128"] as string;
    expect(validateMnemonic(en, getWordList("english"))).toBe(true);
    expect(bip39.validateMnemonic(en)).toBe(true);
    const bad = en.split(" ");
    bad[0] = bad[0] === "zoo" ? "abandon" : "zoo";
    expect(validateMnemonic(bad.join(" "), getWordList("english"))).toBe(false);
  });
});

describe("japanese normalization", () => {
  it("uses U+3000 ideographic space", () => {
    expect(golden.japanese.has_ideographic_space).toBe(true);
    const ja = getWordList("japanese");
    const ours = entropyToMnemonic(golden.entropies["128"], ja);
    expect(ours).toBe(golden.japanese.mnemonic_128);
    expect(ours.includes("　")).toBe(true);
    // ASCII-space input still decodes
    const ascii = ours.split("　").join(" ");
    expect(mnemonicToEntropy(ascii, ja)).toBe(golden.entropies["128"]);
  });
});
