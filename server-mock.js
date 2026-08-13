
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

function createMockExtraction() {
  return {
    elements: [
      {
        id: 'page_heading',
        type: 'heading',
        text: 'Login',
        position: { x: 240, y: 40, width: 200, height: 36 },
        style: { color: '#1F2937', background_color: 'transparent', font_size: 28 },
        required: true,
        visibility: 'visible'
      },
      {
        id: 'email_input',
        type: 'input',
        text: '',
        position: { x: 100, y: 135, width: 380, height: 44 },
        style: { color: '#1F2937', background_color: '#FFFFFF', font_size: 14 },
        required: true,
        visibility: 'visible'
      },
      {
        id: 'password_input',
        type: 'input',
        text: '',
        position: { x: 100, y: 220, width: 380, height: 44 },
        style: { color: '#1F2937', background_color: '#FFFFFF', font_size: 14 },
        required: true,
        visibility: 'visible'
      },
      {
        id: 'submit_button',
        type: 'button',
        text: 'Sign In',
        position: { x: 100, y: 280, width: 380, height: 44 },
        style: { color: '#FFFFFF', background_color: '#DC2626', font_size: 15 },
        required: true,
        visibility: 'visible'
      }
    ],
    layout: { container_alignment: 'centered', total_elements_expected: 4 },
    metadata: { source: 'extracted', timestamp: new Date().toISOString() }
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'MOCK' });
});

// Main extraction endpoint — returns hardcoded valid extraction JSON
app.post('/render-extract', (req, res) => {
  const { html } = req.body;

  if (typeof html !== 'string' || html.trim() === '') {
    return res.status(400).json({ error: 'html must be a non-empty string' });
  }

  // Simulate processing delay
  setTimeout(() => {
    res.json(createMockExtraction());
  }, 500); // Fake 500ms render time
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Mock extraction service running on port ${PORT}`);
  });
}

module.exports = app;
