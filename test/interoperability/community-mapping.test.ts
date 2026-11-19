import { expect, describe, it } from "vitest";
import crypto from "node:crypto";
import {
  bip39SeedFromCommunity,
  mapCanonicalToSource,
  mapMnemonicToCanonical,
  mnemonicToEntropy,
  entropyToMnemonic,
  englishWordList,
  bengaliWordList,
} from "../../src/index";

const EN = englishWordList,
  BN = bengaliWordList;
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

describe("bengali -> english -> seed (independent PBKDF2)", () => {
  const entropies: Record<string, string> = {
    "128": "00".repeat(16),
    "160": "11".repeat(20),
    "192": "22".repeat(24),
    "224": "33".repeat(28),
    "256": "44".repeat(32),
  };
  it.each(Object.entries(entropies))("%s bits: exact seed equality", (bits, entropy) => {
    const bn = entropyToMnemonic(entropy, BN);
    const en = entropyToMnemonic(entropy, EN);
    // source entropy recovery
    expect(mnemonicToEntropy(bn, BN)).toBe(entropy);
    // map to canonical and verify independent PBKDF2
    const mapped = mapMnemonicToCanonical(bn, BN);
    expect(mapped).toBe(en);
    const seed = bip39SeedFromCommunity(bn, BN, "TREZOR");
    expect(seed).toBe(pbkdf2(en, "TREZOR"));
    expect(seed).toBe(pbkdf2(mapped, "TREZOR"));
  });

  it("english -> bengali -> english exact recovery", () => {
    const entropy = "9e885d952ad362caeb4efe34a8e91bd2";
    const en = entropyToMnemonic(entropy, EN);
    const bn = mapCanonicalToSource(en, BN);
    expect(mapMnemonicToCanonical(bn, BN)).toBe(en);
    expect(mnemonicToEntropy(bn, BN)).toBe(entropy);
  });

  it("bengali sentence is never the PBKDF2 input", () => {
    const bn = entropyToMnemonic("00".repeat(16), BN);
    const en = entropyToMnemonic("00".repeat(16), EN);
    const seed = bip39SeedFromCommunity(bn, BN, "");
    // seed must equal canonical-derived, NOT literal bengali text
    expect(seed).not.toBe(pbkdf2(bn, ""));
    expect(seed).toBe(pbkdf2(en, ""));
  });
});
