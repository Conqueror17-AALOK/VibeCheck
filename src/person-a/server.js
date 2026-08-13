import express from 'express';
import cors from 'cors';
import { extractElementsFromPage } from './dist/extractor.js';
import { ExtractionValidator } from './schema-validation.js';

const app = express();
const PORT = process.env.PORT || 3000;
const validator = new ExtractionValidator();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root endpoint for service info
app.get('/', (req, res) => {
  res.json({ service: 'vibecheck-render-service', status: 'ok' });
});

// Extraction endpoint
app.post('/render-extract', async (req, res) => {
  const { url, html, viewport } = req.body || {};

  if (!url && !html) {
    return res.status(400).json({
      error: "Invalid request payload: Either 'url' or 'html' must be provided.",
    });
  }

  try {
    const extractedData = await extractElementsFromPage({
      url,
      html,
      viewport,
    });

    // Validate extracted output against schema.json using ExtractionValidator
    const validationResult = validator.validate(extractedData);
    if (!validationResult.valid) {
      return res.status(500).json({
        error: "Extracted data failed schema.json validation",
        errors: validationResult.errors,
      });
    }

    return res.status(200).json(extractedData);
  } catch (err) {
    console.error("Extraction error:", err);
    return res.status(500).json({
      error: "Render & extraction failed",
      details: err.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`vibecheck-render-service listening on port ${PORT}`);
});
