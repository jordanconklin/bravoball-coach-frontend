/**
 * Coach-facing labels for on-device drill verification results.
 *
 * A result is an estimate from the player's phone camera, never proof: the
 * app only ever sends the state, a confidence and the active seconds — no
 * video, frames or keypoints. Keep the wording honest about that.
 */

export type VerificationState = "verified" | "partial" | "not_verified";

export type DrillVerification = {
  state: VerificationState | string;
  confidence: number;
  active_seconds: number;
};

export const VERIFICATION_TOOLTIP =
  "Checked by the player's phone camera, on the device. An estimate, not proof.";

export function verificationLabel(state: string): string {
  switch (state) {
    case "verified":
      return "Verified";
    case "partial":
      return "Partly verified";
    case "not_verified":
      return "Not verified";
    default:
      return "Unknown";
  }
}

/** CSS modifier suffix for a state; unknown states render neutral. */
export function verificationTone(state: string): "good" | "mid" | "neutral" {
  if (state === "verified") return "good";
  if (state === "partial") return "mid";
  return "neutral";
}

/** "2 of 3 drills verified" style summary for a session; null when the camera was not used. */
export function sessionVerificationSummary(
  verifiedDrills: number | undefined,
  checkedDrills: number | undefined,
): string | null {
  if (!checkedDrills) return null;
  return `${verifiedDrills ?? 0} of ${checkedDrills} camera-checked drill${checkedDrills === 1 ? "" : "s"} verified`;
}

/** Roster cell: "3 / 5" (verified / checked sessions) or "—" when never used. */
export function rosterVerificationCell(
  verifiedSessions: number | undefined,
  checkedSessions: number | undefined,
): string {
  if (!checkedSessions) return "—";
  return `${verifiedSessions ?? 0} / ${checkedSessions}`;
}
