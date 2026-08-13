import { VibeCheckData, VibeCheckElement } from './checklist.js';

export interface PropertyMismatch {
  property: string;
  expected: any;
  found: any;
  severity: 'warning' | 'error';
  message: string;
}

export interface ElementDiffResult {
  id: string;
  type: string;
  status: 'matched' | 'missing' | 'unexpected' | 'mismatched';
  expected?: VibeCheckElement;
  found?: VibeCheckElement;
  mismatches: PropertyMismatch[];
}

export interface VibeCheckDiffReport {
  score: number; // 0 - 100 percentage match
  totalExpected: number;
  totalFound: number;
  matchedCount: number;
  missingCount: number;
  unexpectedCount: number;
  mismatchCount: number;
  details: ElementDiffResult[];
  summary: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || hex === 'transparent' || !hex.startsWith('#')) return null;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return null;
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function colorDifference(hex1?: string, hex2?: string): number {
  if (!hex1 || !hex2) return 0;
  if (hex1.toLowerCase() === hex2.toLowerCase()) return 0;
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return hex1 === hex2 ? 0 : 100;
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

/**
 * Deterministic diff engine comparing expected design checklist against extracted DOM elements
 */
export function computeVibeCheckDiff(
  expectedData: VibeCheckData,
  foundData: VibeCheckData
): VibeCheckDiffReport {
  const expectedElements = expectedData.elements || [];
  const foundElements = foundData.elements || [];

  const foundById = new Map<string, VibeCheckElement>();
  foundElements.forEach((el) => foundById.set(el.id, el));

  const matchedFoundIds = new Set<string>();
  const details: ElementDiffResult[] = [];

  let matchedCount = 0;
  let missingCount = 0;
  let mismatchCount = 0;

  expectedElements.forEach((expected) => {
    let found = foundById.get(expected.id);

    // If no exact ID match, attempt fallback fuzzy matching by type & text
    if (!found) {
      found = foundElements.find(
        (candidate) =>
          !matchedFoundIds.has(candidate.id) &&
          candidate.type === expected.type &&
          expected.text &&
          candidate.text &&
          candidate.text.toLowerCase().trim() === expected.text.toLowerCase().trim()
      );
    }

    if (!found) {
      missingCount++;
      details.push({
        id: expected.id,
        type: expected.type,
        status: 'missing',
        expected,
        mismatches: [
          {
            property: 'presence',
            expected: 'visible in DOM',
            found: 'missing',
            severity: expected.required !== false ? 'error' : 'warning',
            message: `Element '${expected.id}' (${expected.type}) was expected but not found on the page.`
          }
        ]
      });
      return;
    }

    matchedFoundIds.add(found.id);
    const mismatches: PropertyMismatch[] = [];

    // Text comparison
    if (expected.text && found.text !== undefined) {
      const expText = expected.text.trim();
      const fndText = found.text.trim();
      if (expText.toLowerCase() !== fndText.toLowerCase()) {
        mismatches.push({
          property: 'text',
          expected: expText,
          found: fndText,
          severity: 'error',
          message: `Text mismatch: expected "${expText}", found "${fndText}"`
        });
      }
    }

    // Visibility comparison
    if (expected.visibility && found.visibility) {
      if (expected.visibility !== found.visibility) {
        mismatches.push({
          property: 'visibility',
          expected: expected.visibility,
          found: found.visibility,
          severity: 'error',
          message: `Visibility mismatch: expected "${expected.visibility}", found "${found.visibility}"`
        });
      }
    }

    // Style comparisons
    if (expected.style && found.style) {
      // Color
      if (expected.style.color && found.style.color) {
        const colorDelta = colorDifference(expected.style.color, found.style.color);
        if (colorDelta > 30) {
          mismatches.push({
            property: 'style.color',
            expected: expected.style.color,
            found: found.style.color,
            severity: 'warning',
            message: `Text color mismatch: expected ${expected.style.color}, found ${found.style.color}`
          });
        }
      }

      // Background Color
      if (expected.style.background_color && found.style.background_color) {
        const bgDelta = colorDifference(expected.style.background_color, found.style.background_color);
        if (bgDelta > 30) {
          mismatches.push({
            property: 'style.background_color',
            expected: expected.style.background_color,
            found: found.style.background_color,
            severity: 'warning',
            message: `Background color mismatch: expected ${expected.style.background_color}, found ${found.style.background_color}`
          });
        }
      }

      // Font size
      if (expected.style.font_size && found.style.font_size) {
        const sizeDelta = Math.abs(expected.style.font_size - found.style.font_size);
        if (sizeDelta > 4) {
          mismatches.push({
            property: 'style.font_size',
            expected: `${expected.style.font_size}px`,
            found: `${found.style.font_size}px`,
            severity: 'warning',
            message: `Font size mismatch: expected ${expected.style.font_size}px, found ${found.style.font_size}px`
          });
        }
      }
    }

    // Position bounding box comparison
    if (expected.position && found.position) {
      const xDiff = Math.abs(expected.position.x - found.position.x);
      const yDiff = Math.abs(expected.position.y - found.position.y);
      if (xDiff > 50 || yDiff > 50) {
        mismatches.push({
          property: 'position',
          expected: `x:${expected.position.x}, y:${expected.position.y}`,
          found: `x:${found.position.x}, y:${found.position.y}`,
          severity: 'warning',
          message: `Position shift detected: displaced by x:${xDiff}px, y:${yDiff}px`
        });
      }
    }

    if (mismatches.length > 0) {
      mismatchCount++;
      details.push({
        id: expected.id,
        type: expected.type,
        status: 'mismatched',
        expected,
        found,
        mismatches
      });
    } else {
      matchedCount++;
      details.push({
        id: expected.id,
        type: expected.type,
        status: 'matched',
        expected,
        found,
        mismatches: []
      });
    }
  });

  // Calculate unexpected / extra elements found
  const unexpectedCount = foundElements.length - matchedFoundIds.size;
  foundElements.forEach((found) => {
    if (!matchedFoundIds.has(found.id)) {
      details.push({
        id: found.id,
        type: found.type,
        status: 'unexpected',
        found,
        mismatches: [
          {
            property: 'presence',
            expected: 'not in expected checklist',
            found: 'present in DOM',
            severity: 'warning',
            message: `Extra element '${found.id}' (${found.type}) found on page.`
          }
        ]
      });
    }
  });

  const totalExpected = expectedElements.length;
  const score = totalExpected > 0
    ? Math.max(0, Math.round(((matchedCount + mismatchCount * 0.5) / totalExpected) * 100))
    : 100;

  const summary = `VibeCheck Match Score: ${score}%. Matched: ${matchedCount}/${totalExpected}, Mismatched: ${mismatchCount}, Missing: ${missingCount}, Unexpected: ${unexpectedCount}.`;

  return {
    score,
    totalExpected,
    totalFound: foundElements.length,
    matchedCount,
    missingCount,
    unexpectedCount,
    mismatchCount,
    details,
    summary
  };
}
