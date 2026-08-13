import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractElementsFromPage, rgbToHex } from "./extractor.js";
// @ts-ignore
import { ExtractionValidator } from "../schema-validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const validator = new ExtractionValidator(path.resolve(__dirname, "../schema.json"));

describe("rgbToHex helper", () => {
  it("handles standard rgb string", () => {
    expect(rgbToHex("rgb(255, 0, 128)")).toBe("#FF0080");
  });

  it("handles rgba string with alpha = 1", () => {
    expect(rgbToHex("rgba(0, 102, 255, 1)")).toBe("#0066FF");
  });

  it("handles rgba string with alpha = 0 as transparent", () => {
    expect(rgbToHex("rgba(0, 0, 0, 0)")).toBe("transparent");
  });

  it("handles transparent and empty input", () => {
    expect(rgbToHex("transparent")).toBe("transparent");
    expect(rgbToHex("none")).toBe("transparent");
    expect(rgbToHex("")).toBe("transparent");
  });
});

describe("extractElementsFromPage edge cases", () => {
  it(
    "handles display:none, visibility:hidden, off-screen elements, and semantic types",
    async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .hidden-display { display: none; }
              .hidden-vis { visibility: hidden; }
              .offscreen { position: absolute; left: -9999px; top: -9999px; width: 100px; height: 30px; }
              .custom-btn { padding: 10px; }
            </style>
          </head>
          <body>
            <div class="hidden-display" id="disp_none">Should be skipped completely</div>
            <div class="hidden-vis" id="vis_hidden">Hidden element</div>
            <div class="offscreen" id="off_screen">Off screen element</div>
            <div class="custom-btn" role="button" id="aria_btn">Click Me</div>
          </body>
        </html>
      `;

      const result = await extractElementsFromPage({
        html,
        viewport: { width: 1280, height: 800 },
      });

      // 1. display:none should be skipped completely
      const dispNoneEl = result.elements.find((el: any) => el.id === "disp_none");
      expect(dispNoneEl).toBeUndefined();

      // 2. visibility:hidden should be included with visibility: 'hidden'
      const visHiddenEl = result.elements.find((el: any) => el.id === "vis_hidden");
      expect(visHiddenEl).toBeDefined();
      expect(visHiddenEl?.visibility).toBe("hidden");

      // 3. off-screen element should be marked visibility: 'off-screen'
      const offScreenEl = result.elements.find((el: any) => el.id === "off_screen");
      expect(offScreenEl).toBeDefined();
      expect(offScreenEl?.visibility).toBe("off-screen");

      // 4. ARIA button role should be detected as button
      const ariaBtnEl = result.elements.find((el: any) => el.id === "aria_btn");
      expect(ariaBtnEl).toBeDefined();
      expect(ariaBtnEl?.type).toBe("button");

      // 5. Output must pass schema.json validation
      const validation = validator.validate(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    },
    30000,
  );
});

describe("3 Test HTML Samples Extraction", () => {
  it(
    "extracts and validates sample 1: login-form.html",
    async () => {
      const filePath = path.resolve(__dirname, "../test-samples/login-form.html");
      const html = fs.readFileSync(filePath, "utf8");

      const result = await extractElementsFromPage({
        html,
        viewport: { width: 1280, height: 800 },
      });

      expect(result.elements.length).toBeGreaterThan(0);
      const validation = validator.validate(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    },
    30000,
  );

  it(
    "extracts and validates sample 2: card-grid.html",
    async () => {
      const filePath = path.resolve(__dirname, "../test-samples/card-grid.html");
      const html = fs.readFileSync(filePath, "utf8");

      const result = await extractElementsFromPage({
        html,
        viewport: { width: 1280, height: 800 },
      });

      expect(result.elements.length).toBeGreaterThan(0);
      const validation = validator.validate(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    },
    30000,
  );

  it(
    "extracts and validates sample 3: nav-bar.html",
    async () => {
      const filePath = path.resolve(__dirname, "../test-samples/nav-bar.html");
      const html = fs.readFileSync(filePath, "utf8");

      const result = await extractElementsFromPage({
        html,
        viewport: { width: 1280, height: 800 },
      });

      expect(result.elements.length).toBeGreaterThan(0);
      const validation = validator.validate(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    },
    30000,
  );
});
