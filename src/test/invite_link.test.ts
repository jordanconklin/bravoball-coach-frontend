import { describe, expect, it } from "vitest";
import { buildInviteLink } from "../app/page";

describe("buildInviteLink", () => {
  it("builds a bravoball:// deep link from a join code", () => {
    expect(buildInviteLink("ABC1234")).toBe("bravoball://join?code=ABC1234");
  });

  it("preserves the join code exactly as given", () => {
    expect(buildInviteLink("XY99ZZZ")).toBe("bravoball://join?code=XY99ZZZ");
  });
});
