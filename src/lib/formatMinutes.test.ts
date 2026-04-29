import { describe, expect, it } from "vitest";

import { formatMinutes } from "./formatMinutes";

describe("formatMinutes", () => {
  it("formats zero or negative values as zero minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(-8)).toBe("0m");
  });

  it("formats sub-hour values in minutes", () => {
    expect(formatMinutes(22)).toBe("22m");
  });

  it("formats exact hours without leftover minutes", () => {
    expect(formatMinutes(120)).toBe("2h");
  });

  it("formats hours and leftover minutes", () => {
    expect(formatMinutes(89)).toBe("1h 29m");
  });
});
