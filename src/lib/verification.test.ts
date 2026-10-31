import { describe, expect, it } from "vitest";
import {
  rosterVerificationCell,
  sessionVerificationSummary,
  verificationLabel,
  verificationTone,
  VERIFICATION_TOOLTIP,
} from "./verification";

describe("verification labels", () => {
  it("maps every state to coach-facing copy and a tone", () => {
    expect(verificationLabel("verified")).toBe("Verified");
    expect(verificationLabel("partial")).toBe("Partly verified");
    expect(verificationLabel("not_verified")).toBe("Not verified");
    expect(verificationLabel("something_new")).toBe("Unknown");
    expect(verificationTone("verified")).toBe("good");
    expect(verificationTone("partial")).toBe("mid");
    expect(verificationTone("not_verified")).toBe("neutral");
  });

  it("says estimate, not proof", () => {
    expect(VERIFICATION_TOOLTIP).toMatch(/estimate, not proof/i);
  });

  it("summarises a session only when the camera was used", () => {
    expect(sessionVerificationSummary(0, 0)).toBeNull();
    expect(sessionVerificationSummary(undefined, undefined)).toBeNull();
    expect(sessionVerificationSummary(1, 1)).toBe("1 of 1 camera-checked drill verified");
    expect(sessionVerificationSummary(2, 3)).toBe("2 of 3 camera-checked drills verified");
  });

  it("renders the roster cell as verified / checked or a dash", () => {
    expect(rosterVerificationCell(0, 0)).toBe("—");
    expect(rosterVerificationCell(undefined, undefined)).toBe("—");
    expect(rosterVerificationCell(3, 5)).toBe("3 / 5");
  });
});
