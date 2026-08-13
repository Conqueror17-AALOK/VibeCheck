import { chromium, type Browser } from "playwright";
import { type VibeCheckData, type VibeCheckElement, type ElementType, type FontWeight } from "@vibecheck/shared";
import { validateVibeCheckData } from "@vibecheck/shared";

export interface ExtractOptions {
  url?: string;
  html?: string;
  viewport?: { width: number; height: number };
  headless?: boolean;
}

/**
 * Converts rgb/rgba color string to upper-case hex format #RRGGBB or 'transparent'.
 */
export function rgbToHex(rgbStr: string): string {
  if (!rgbStr || rgbStr === "transparent" || rgbStr === "none") {
    return "transparent";
  }

  // Handle rgb / rgba strings
  const rgbaMatch = rgbStr.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;

    if (a === 0) {
      return "transparent";
    }

    const hexR = Math.min(255, Math.max(0, r)).toString(16).padStart(2, "0");
    const hexG = Math.min(255, Math.max(0, g)).toString(16).padStart(2, "0");
    const hexB = Math.min(255, Math.max(0, b)).toString(16).padStart(2, "0");

    return `#${hexR}${hexG}${hexB}`.toUpperCase();
  }

  // Handle hex string
  if (rgbStr.startsWith("#")) {
    if (rgbStr.length === 4) {
      return `#${rgbStr[1]}${rgbStr[1]}${rgbStr[2]}${rgbStr[2]}${rgbStr[3]}${rgbStr[3]}`.toUpperCase();
    }
    if (rgbStr.length === 7) {
      return rgbStr.toUpperCase();
    }
  }

  return "transparent";
}

/**
 * Extracts structured VibeCheck element data from a webpage using Playwright.
 */
export async function extractElementsFromPage(options: ExtractOptions): Promise<VibeCheckData> {
  const viewport = options.viewport ?? { width: 1280, height: 800 };

  let browser: Browser;
  try {
    browser = await chromium.launch({
      headless: options.headless ?? true,
    });
  } catch (err: any) {
    throw new Error(`Failed to launch browser: ${err.message}`);
  }

  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    if (options.url) {
      await page.goto(options.url, { waitUntil: "networkidle", timeout: 30000 });
    } else if (options.html) {
      await page.setContent(options.html, { waitUntil: "domcontentloaded", timeout: 30000 });
    } else {
      throw new Error("Either 'url' or 'html' must be provided to extractElementsFromPage");
    }

    // Evaluate DOM elements in browser scope
    const rawElements = await page.evaluate(() => {
      function rgbToHexInBrowser(rgbStr: string): string {
        if (!rgbStr || rgbStr === "transparent" || rgbStr === "none") {
          return "transparent";
        }
        const rgbaMatch = rgbStr.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1], 10);
          const g = parseInt(rgbaMatch[2], 10);
          const b = parseInt(rgbaMatch[3], 10);
          const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
          if (a === 0) return "transparent";
          const hexR = Math.min(255, Math.max(0, r)).toString(16).padStart(2, "0");
          const hexG = Math.min(255, Math.max(0, g)).toString(16).padStart(2, "0");
          const hexB = Math.min(255, Math.max(0, b)).toString(16).padStart(2, "0");
          return `#${hexR}${hexG}${hexB}`.toUpperCase();
        }
        if (rgbStr.startsWith("#")) {
          if (rgbStr.length === 4) {
            return `#${rgbStr[1]}${rgbStr[1]}${rgbStr[2]}${rgbStr[2]}${rgbStr[3]}${rgbStr[3]}`.toUpperCase();
          }
          if (rgbStr.length === 7) return rgbStr.toUpperCase();
        }
        return "transparent";
      }

      function slugify(text: string): string {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .substring(0, 40);
      }

      function getClassNameString(el: Element): string {
        if (typeof el.className === "string") return el.className;
        if (el.className && typeof (el.className as any).baseVal === "string") {
          return (el.className as any).baseVal;
        }
        return "";
      }

      function determineElementType(el: Element): ElementType {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute("role")?.toLowerCase();
        const typeAttr = el.getAttribute("type")?.toLowerCase();
        const className = getClassNameString(el).toLowerCase();

        // 1. Check ARIA roles first
        if (role === "button") return "button";
        if (role === "checkbox") return "checkbox";
        if (role === "radio" || role === "radiogroup") return "radio";
        if (role === "searchbox") return "input";
        if (role === "textbox") return tag === "textarea" ? "textarea" : "input";
        if (role === "heading") return "heading";
        if (role === "link") return "link";
        if (role === "img" || role === "image") return "image";
        if (role === "label") return "label";
        if (["banner", "navigation", "main", "article", "group", "region", "dialog", "form"].includes(role || "")) {
          return "container";
        }

        // 2. Check Tag Names & Tag-Specific attributes
        if (tag === "button" || (tag === "input" && ["button", "submit", "reset", "image"].includes(typeAttr || ""))) {
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
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return "heading";
        if (tag === "a") return "link";
        if (tag === "img") return "image";
        if (tag === "svg") return "icon";
        if (tag === "article") return "card";
        if (["p", "span", "b", "strong", "em", "i", "small", "mark"].includes(tag)) return "text";

        // 3. Check Class Name Patterns
        if (className.includes("btn") || className.includes("button") || className.includes("cta")) return "button";
        if (className.includes("badge") || className.includes("chip") || className.includes("tag") || className.includes("pill")) {
          return "badge";
        }
        if (className.includes("card") || className.includes("panel") || className.includes("tile")) return "card";
        if (className.includes("icon") || className.includes("fa-") || className.includes("bi-") || className.includes("material-icons")) {
          return "icon";
        }
        if (className.includes("heading") || className.includes("title")) return "heading";
        if (className.includes("input") || className.includes("form-control") || className.includes("textfield")) return "input";
        if (className.includes("link") || className.includes("nav-item") || className.includes("nav-link")) return "link";
        if (className.includes("label")) return "label";
        if (className.includes("container") || className.includes("wrapper") || className.includes("box") || className.includes("grid") || className.includes("navbar") || className.includes("nav")) {
          return "container";
        }

        if (["div", "section", "main", "header", "footer", "nav", "form", "aside", "ul", "ol", "li"].includes(tag)) {
          return "container";
        }

        return "other";
      }

      function normalizeFontWeight(weightStr: string): FontWeight {
        const allowed: FontWeight[] = ["normal", "bold", "lighter", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
        if (allowed.includes(weightStr as FontWeight)) {
          return weightStr as FontWeight;
        }
        const num = parseInt(weightStr, 10);
        if (!isNaN(num)) {
          const clamped = String(num) as FontWeight;
          if (allowed.includes(clamped)) return clamped;
        }
        return "normal";
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
        const style = window.getComputedStyle(el);

        // 1. Edge Case: display: none -> skip element entirely
        if (style.display === "none") continue;

        const rect = el.getBoundingClientRect();

        // Determine visibility state
        const isHiddenVisibility = style.visibility === "hidden" || parseFloat(style.opacity) === 0;
        const isOffScreen =
          rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight;

        let visibilityState: "visible" | "hidden" | "off-screen";
        if (isHiddenVisibility) {
          visibilityState = "hidden";
        } else if (isOffScreen) {
          visibilityState = "off-screen";
        } else {
          visibilityState = "visible";
        }

        // If zero size and not explicitly hidden or off-screen, skip noise
        if (rect.width === 0 && rect.height === 0 && visibilityState === "visible") continue;

        const type = determineElementType(el);
        const classNameStr = getClassNameString(el);
        // Skip unstyled, unnamed container divs to keep output clean
        if (type === "container" && !el.getAttribute("id") && !classNameStr) continue;

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

        // De-duplicate IDs across the entire DOM (handles duplicate explicit HTML ids seamlessly)
        const count = usedIds.get(baseId) || 0;
        usedIds.set(baseId, count + 1);
        const finalId = count === 0 ? baseId : `${baseId}_${count}`;

        const hexColor = rgbToHexInBrowser(style.color);
        const hexBg = rgbToHexInBrowser(style.backgroundColor);
        const fontSize = parseFloat(style.fontSize) || 16;
        const borderRadius = parseFloat(style.borderRadius) || 0;
        const opacity = parseFloat(style.opacity);
        const validOpacity = isNaN(opacity) ? 1 : Math.min(1, Math.max(0, opacity));

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
            font_size: fontSize >= 8 && fontSize <= 120 ? Math.round(fontSize) : undefined,
            font_weight: normalizeFontWeight(style.fontWeight),
            border_radius: borderRadius >= 0 ? Math.round(borderRadius) : undefined,
            padding: style.padding || undefined,
            opacity: validOpacity,
          },
          visibility: visibilityState,
        });
      }

      return extracted;
    });

    // Deduplicate & calculate relative positions
    const vibeCheckElements: VibeCheckElement[] = rawElements.map((el, idx, arr) => {
      let below: string | undefined;
      let above: string | undefined;
      let left_of: string | undefined;
      let right_of: string | undefined;

      for (let i = 0; i < arr.length; i++) {
        if (i === idx) continue;
        const other = arr[i];

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
    if (browser!) {
      await browser.close();
    }
  }
}
