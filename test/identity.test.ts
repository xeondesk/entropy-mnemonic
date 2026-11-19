import { expect, describe, it } from "vitest";
import {
  getWordlistIdentity,
  getPairingIdentity,
  auditWordListPairing,
  mapMnemonicToCanonical,
  englishWordList,
  bengaliWordList,
} from "../src/index";
import type { IWordList } from "../src/index";

const EN = englishWordList;
const BN = bengaliWordList;

describe("wordlist identity (v2.0e)", () => {
  it("every list exposes id/version/contentHash/hashAlgorithm", () => {
    for (const l of [EN, BN]) {
      const id = getWordlistIdentity(l);
      expect(id.id).toBe(l.id);
      expect(id.hashAlgorithm).toBe("sha256");
      expect(id.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(id.version).toBeTruthy();
    }
  });

  it("bengali pairing identity binds both wordlist hashes", () => {
    const pi = getPairingIdentity(BN)!;
    expect(pi.fromId).toBe("bengali");
    expect(pi.toId).toBe("english");
    expect(pi.fromContentHash).toBe(BN.contentHash);
    expect(pi.toContentHash).toBe(EN.contentHash);
    expect(pi.hashAlgorithm).toBe("sha256");
    expect(pi.verifiedBy).toContain("d8938514");
    expect(pi.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("canonical lists have no pairing identity", () => {
    expect(getPairingIdentity(EN)).toBeUndefined();
  });
});

describe("verification lifecycle — wordlist change invalidates pairing", () => {
  it("modified words break audit and mapping even with copied metadata", () => {
    // Simulates a wordlist update that did NOT bump contentHash/pairing:
    // stale verification must fail closed.
    const updated: IWordList = {
      ...BN,
      words: Object.freeze([...BN.words.slice(0, 5), "নতুনশব্দ", ...BN.words.slice(6)]),
    };
    const audit = auditWordListPairing(updated);
    expect(audit.valid).toBe(false);
    expect(audit.checks.sourceHashOk).toBe(false);
    const phrase = Array(12).fill(BN.words[0]).join(" ");
    expect(() => mapMnemonicToCanonical(phrase, updated)).toThrow(/pairing|hash/i);
  });

  it("pairing hash binds BOTH wordlists — canonical-side drift fails", () => {
    // A forged "english" with altered words but copied metadata fails
    // the target hash check inside the pairing audit.
    const forgedEn: IWordList = {
      ...EN,
      words: Object.freeze(["HACKED", ...EN.words.slice(1)]),
    };
    const audit = auditWordListPairing(BN, forgedEn);
    expect(audit.valid).toBe(false);
    expect(audit.checks.targetHashOk).toBe(false);
  });
});
