import { describe, expect, it } from "vitest";
import { validateVibeCheckData } from "./validate.js";

describe("validateVibeCheckData", () => {
  it("accepts a minimal valid document", () => {
    const result = validateVibeCheckData({
      elements: [
        {
          id: "submit_button",
          type: "button",
          position: { x: 0, y: 0, width: 100, height: 40 },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a document missing required fields", () => {
    const result = validateVibeCheckData({ elements: [{ id: "x" }] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
