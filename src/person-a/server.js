import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Load VibeCheck schema for payload validation
const schemaPaths = [
  path.resolve(__dirname, 'schema.json'),
  path.resolve(__dirname, '../../schema.json'),
  path.resolve(process.cwd(), 'schema.json')
];
const schemaPath = schemaPaths.find((p) => fs.existsSync(p));
let validator = null;

if (schemaPath) {
  try {
    const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const ajv = new Ajv({ allErrors: true, useDefaults: true });
    validator = ajv.compile(schemaContent);
    console.log(`[VibeCheck Render Service] Loaded schema from ${schemaPath}`);
  } catch (err) {
    console.warn(`[VibeCheck Render Service] Could not compile schema: ${err.message}`);
  }
}

// Convert RGB / RGBA to HEX format
function rgbToHex(rgbStr) {
  if (!rgbStr || rgbStr === 'transparent' || rgbStr.startsWith('rgba(0, 0, 0, 0)')) {
    return 'transparent';
  }
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return '#000000';
  const r = parseInt(match[0], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[2], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Core extraction function executed inside browser DOM context
 */
function extractElementsFromDOM() {
  const elements = [];
  const candidateNodes = Array.from(
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, button, input, textarea, select, a, img, label, [role="button"], [class*="card"], [id*="card"]')
  );

  let idCounter = 1;

  candidateNodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const style = window.getComputedStyle(node);
    const tagName = node.tagName.toLowerCase();

    let type = 'other';
    if (/^h[1-6]$/.test(tagName)) type = 'heading';
    else if (tagName === 'button' || node.getAttribute('role') === 'button') type = 'button';
    else if (tagName === 'input') {
      const inputType = node.getAttribute('type') || 'text';
      if (inputType === 'checkbox') type = 'checkbox';
      else if (inputType === 'radio') type = 'radio';
      else type = 'input';
    } else if (tagName === 'textarea') type = 'textarea';
    else if (tagName === 'select') type = 'select';
    else if (tagName === 'a') type = 'link';
    else if (tagName === 'img') type = 'image';
    else if (tagName === 'label') type = 'label';
    else if (node.className.toString().includes('card') || node.id.includes('card')) type = 'card';

    const rawId = node.id || node.getAttribute('name') || `${type}_${idCounter++}`;
    const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 128);

    const isVisible =
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity || '1') > 0;

    let visibility = isVisible ? 'visible' : 'hidden';
    if (isVisible && (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth)) {
      visibility = 'off-screen';
    }

    elements.push({
      id: cleanId,
      type,
      text: (node.innerText || node.value || node.getAttribute('alt') || '').trim(),
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      styleRaw: {
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: parseFloat(style.fontSize) || 16,
        fontWeight: style.fontWeight || '400',
        borderRadius: parseFloat(style.borderRadius) || 0,
        opacity: parseFloat(style.opacity) || 1
      },
      required: true,
      visibility
    });
  });

  return elements;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vibecheck-render-service',
    timestamp: new Date().toISOString()
  });
});

// Main render & extract endpoint
app.post(['/render', '/extract'], async (req, res) => {
  const { url, html, viewport = { width: 1280, height: 720 }, waitMs = 1000 } = req.body;

  if (!url && !html) {
    return res.status(400).json({
      error: 'Either "url" or "html" parameter must be provided in request body.'
    });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
    }

    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }

    const rawElements = await page.evaluate(extractElementsFromDOM);

    // Format elements to match VibeCheck schema constraints
    const elements = rawElements.map((el) => ({
      id: el.id,
      type: el.type,
      text: el.text,
      position: el.position,
      style: {
        color: rgbToHex(el.styleRaw.color),
        background_color: rgbToHex(el.styleRaw.backgroundColor),
        font_size: Math.max(8, Math.min(120, el.styleRaw.fontSize)),
        font_weight: el.styleRaw.fontWeight,
        border_radius: Math.max(0, el.styleRaw.borderRadius),
        opacity: Math.max(0, Math.min(1, el.styleRaw.opacity))
      },
      required: el.required,
      visibility: el.visibility
    }));

    const result = {
      elements,
      layout: {
        container_alignment: 'centered',
        total_elements_expected: elements.length,
        viewport_width: viewport.width,
        viewport_height: viewport.height
      },
      metadata: {
        source: 'extracted',
        timestamp: new Date().toISOString(),
        url: url || 'raw_html_payload'
      }
    };

    if (validator) {
      const valid = validator(result);
      if (!valid) {
        console.warn('[VibeCheck Render Service] Validation warning:', validator.errors);
      }
    }

    await browser.close();
    return res.json({ success: true, data: result });
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error('[VibeCheck Render Service] Render error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Root status page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>VibeCheck Render & Extraction Service</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.5; color: #1e293b; }
          h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
          pre { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; overflow-x: auto; }
          .badge { background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85em; }
        </style>
      </head>
      <body>
        <h1>VibeCheck Render & Extraction Service <span class="badge">ONLINE</span></h1>
        <p>Headless Chromium render + element visual metadata extraction service running via Playwright.</p>
        <h2>Available Endpoints:</h2>
        <ul>
          <li><strong>GET /health</strong> - Health check endpoint</li>
          <li><strong>POST /render</strong> - Extract layout and visual element schema from URL or HTML</li>
        </ul>
        <h2>Example Request:</h2>
        <pre>POST /render
Content-Type: application/json

{
  "url": "https://example.com",
  "viewport": { "width": 1280, "height": 720 }
}</pre>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 [VibeCheck Render Service] Listening on http://localhost:${PORT}`);
});
