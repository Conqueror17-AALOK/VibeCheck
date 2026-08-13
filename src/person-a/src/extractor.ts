import { chromium, type Browser } from "playwright";
import { type VibeCheckData, type VibeCheckElement, type ElementType, type FontWeight, type Alignment } from "@vibecheck/shared";
import { validateVibeCheckData } from "@vibecheck/shared";

export interface ExtractOptions {
  url?: string;
  html?: string;
  viewport?: { width: number; height: number };
  headless?: boolean;
}

/**
 * Converts rgb/rgba color string to hex format #RRGGBB or 'transparent'.
 */
function rgbToHex(rgbStr: string): string {
  if (!rgbStr || rgbStr === "transparent" || rgbStr.startsWith("rgba(0, 0, 0, 0)")) {
    return "transparent";
  }
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return "transparent";
  const r = parseInt(match[0], 10).toString(16).padStart(2, "0");
  const g = parseInt(match[1], 10).toString(16).padStart(2, "0");
  const b = parseInt(match[2], 10).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Extracts structured VibeCheck element data from a webpage using Playwright.
 */
export async function extractElementsFromPage(options: ExtractOptions): Promise<VibeCheckData> {
  const viewport = options.viewport ?? { width: 1280, height: 800 };
  const browser: Browser = await chromium.launch({
    headless: options.headless ?? true,
  });

  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    if (options.url) {
      await page.goto(options.url, { waitUntil: "networkidle" });
    } else if (options.html) {
      await page.setContent(options.html, { waitUntil: "domcontentloaded" });
    } else {
      throw new Error("Either url or html must be provided to extractElementsFromPage");
    }

    // Evaluate DOM elements in browser scope
    const rawElements = await page.evaluate(() => {
      function rgbToHexInBrowser(rgbStr: string): string {
        if (!rgbStr || rgbStr === "transparent" || rgbStr.startsWith("rgba(0, 0, 0, 0)")) {
          return "transparent";
        }
        const match = rgbStr.match(/\d+/g);
        if (!match || match.length < 3) return "transparent";
        const r = parseInt(match[0], 10).toString(16).padStart(2, "0");
        const g = parseInt(match[1], 10).toString(16).padStart(2, "0");
        const b = parseInt(match[2], 10).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`.toUpperCase();
      }

      function slugify(text: string): string {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .substring(0, 40);
      }

      function determineElementType(el: Element): ElementType {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute("role");
        const typeAttr = el.getAttribute("type");
        const className = el.className && typeof el.className === "string" ? el.className.toLowerCase() : "";

        if (tag === "button" || role === "button" || (tag === "input" && ["button", "submit", "reset"].includes(typeAttr || ""))) {
          return "button";
        }
        if (tag === "textarea") return "textarea";
        if (tag === "input") {
          if (typeAttr === "checkbox") return "checkbox";
          if (typeAttr === "radio") return "radio";
          return "input";
        }
        if (tag === "select") return "select";
        if (tag === "label") return "label";
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag) || role === "heading") return "heading";
        if (tag === "a") return "link";
        if (tag === "img" || role === "img") return "image";
        if (tag === "svg" || className.includes("icon")) return "icon";
        if (className.includes("badge") || className.includes("tag")) return "badge";
        if (className.includes("card") || tag === "article") return "card";
        if (tag === "p" || tag === "span" || tag === "b" || tag === "strong" || tag === "em" || tag === "i") return "text";
        if (["div", "section", "main", "header", "footer", "nav", "form"].includes(tag)) return "container";

        return "other";
      }

      const allElements = Array.from(document.querySelectorAll("*"));
      const extracted: Array<{
        id: string;
        type: ElementType;
        text: string;
        position: { x: number; y: number; width: number; height: number };
        style: {
          color?: string;
          background_color?: string;
          font_size?: number;
          font_weight?: FontWeight;
          border_radius?: number;
          padding?: string;
          opacity?: number;
        };
        visibility: "visible" | "hidden" | "off-screen";
      }> = [];

      const usedIds = new Map<string, number>();

      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;

        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const type = determineElementType(el);
        // Only extract meaningful semantic elements to avoid noise from container divs
        if (type === "container" && !el.getAttribute("id") && !el.className) continue;

        const visibleText = (el.textContent || "").trim();
        const placeholder = el.getAttribute("placeholder") || "";
        const ariaLabel = el.getAttribute("aria-label") || "";
        const nameAttr = el.getAttribute("name") || "";
        const explicitId = el.getAttribute("id") || "";

        let baseId = explicitId;
        if (!baseId) {
          if (nameAttr) baseId = nameAttr;
          else if (placeholder) baseId = `${slugify(placeholder)}_${type}`;
          else if (ariaLabel) baseId = `${slugify(ariaLabel)}_${type}`;
          else if (visibleText && visibleText.length < 30) baseId = `${slugify(visibleText)}_${type}`;
          else baseId = `${type}`;
        }
        if (!baseId) baseId = "element";

        const count = usedIds.get(baseId) || 0;
        usedIds.set(baseId, count + 1);
        const finalId = count === 0 ? baseId : `${baseId}_${count}`;

        const isOffScreen =
          rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight;

        const hexColor = rgbToHexInBrowser(style.color);
        const hexBg = rgbToHexInBrowser(style.backgroundColor);
        const fontSize = parseFloat(style.fontSize) || 16;
        const borderRadius = parseFloat(style.borderRadius) || 0;
        const opacity = parseFloat(style.opacity) || 1;

        extracted.push({
          id: finalId,
          type,
          text: visibleText.substring(0, 200),
          position: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          style: {
            color: hexColor.startsWith("#") ? hexColor : undefined,
            background_color: hexBg.startsWith("#") || hexBg === "transparent" ? hexBg : undefined,
            font_size: fontSize >= 8 && fontSize <= 120 ? fontSize : undefined,
            font_weight: style.fontWeight as FontWeight,
            border_radius: borderRadius >= 0 ? borderRadius : undefined,
            padding: style.padding || undefined,
            opacity: opacity >= 0 && opacity <= 1 ? opacity : undefined,
          },
          visibility: isOffScreen ? "off-screen" : "visible",
        });
      }

      return extracted;
    });

    // Deduplicate & calculate relative positions
    const vibeCheckElements: VibeCheckElement[] = rawElements.map((el, idx, arr) => {
      // Find relative positions against other elements
      let below: string | undefined;
      let above: string | undefined;
      let left_of: string | undefined;
      let right_of: string | undefined;

      for (let i = 0; i < arr.length; i++) {
        if (i === idx) continue;
        const other = arr[i];

        // Vertically directly above/below with overlap in x
        const xOverlap = Math.max(0, Math.min(el.position.x + el.position.width, other.position.x + other.position.width) - Math.max(el.position.x, other.position.x));
        if (xOverlap > 10) {
          if (other.position.y + other.position.height <= el.position.y && !below) {
            below = other.id;
          }
          if (other.position.y >= el.position.y + el.position.height && !above) {
            above = other.id;
          }
        }
      }

      return {
        id: el.id,
        type: el.type,
        text: el.text,
        position: el.position,
        relative_position: below || above || left_of || right_of ? { below, above, left_of, right_of } : undefined,
        style: el.style,
        required: true,
        visibility: el.visibility,
      };
    });

    const vibeCheckData: VibeCheckData = {
      elements: vibeCheckElements,
      layout: {
        container_alignment: "left-aligned",
        total_elements_expected: vibeCheckElements.length,
        viewport_width: viewport.width,
        viewport_height: viewport.height,
      },
      metadata: {
        source: "extracted",
        timestamp: new Date().toISOString(),
        url: options.url || "raw-html",
      },
    };

    // Validate extracted data against JSON schema contract
    const validation = validateVibeCheckData(vibeCheckData);
    if (!validation.valid) {
      console.warn("Extracted data warnings against schema.json:", validation.errors);
    }

    return vibeCheckData;
  } finally {
    await browser.close();
  }
}
