import { describe, expect, it } from "vitest";
import { extractElementsFromPage } from "./extractor.js";
import { validateVibeCheckData } from "@vibecheck/shared";

describe("extractElementsFromPage", () => {
  it(
    "extracts structured elements from HTML and validates against schema",
    async () => {
      const sampleHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Page</title></head>
          <body style="margin: 0; padding: 20px; font-family: sans-serif;">
            <h1 id="main_heading" style="color: #111827; font-size: 24px;">Welcome</h1>
            <form style="margin-top: 20px;">
              <input type="text" id="username" placeholder="Enter Username" style="padding: 10px; width: 200px; font-size: 14px;" />
              <button type="submit" id="submit_btn" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 4px;">Submit</button>
            </form>
          </body>
        </html>
      `;

      const result = await extractElementsFromPage({
        html: sampleHtml,
        viewport: { width: 800, height: 600 },
      });

      expect(result).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);

      const heading = result.elements.find((el) => el.id === "main_heading");
      expect(heading).toBeDefined();
      expect(heading?.type).toBe("heading");
      expect(heading?.text).toBe("Welcome");

      const input = result.elements.find((el) => el.id === "username");
      expect(input).toBeDefined();
      expect(input?.type).toBe("input");

      const button = result.elements.find((el) => el.id === "submit_btn");
      expect(button).toBeDefined();
      expect(button?.type).toBe("button");
      expect(button?.text).toBe("Submit");

      // Validate overall data structure against schema
      const validation = validateVibeCheckData(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    },
    60000,
  );
});
