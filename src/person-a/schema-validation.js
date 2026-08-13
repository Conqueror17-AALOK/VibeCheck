import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate schema.json (check local directory first, then monorepo root)
const schemaPaths = [
  path.resolve(__dirname, 'schema.json'),
  path.resolve(__dirname, '../../schema.json'),
  path.resolve(process.cwd(), 'schema.json')
];

let schemaPath = schemaPaths.find((p) => fs.existsSync(p));
if (!schemaPath) {
  console.error('❌ Could not locate schema.json in expected locations.');
  process.exit(1);
}

const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Locate example extraction file to validate
const dataPaths = [
  path.resolve(__dirname, 'example-extraction.json'),
  path.resolve(__dirname, '../../example-extraction.json'),
  path.resolve(process.cwd(), 'example-extraction.json')
];

let dataPath = dataPaths.find((p) => fs.existsSync(p) && fs.statSync(p).size > 0);

const ajv = new Ajv({ allErrors: true, useDefaults: true });
const validate = ajv.compile(schemaContent);

console.log(`📋 Loaded VibeCheck schema from: ${schemaPath}`);

let sampleData;
if (dataPath) {
  console.log(`📄 Validating sample data from: ${dataPath}`);
  sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} else {
  console.log('⚡ Generating default test payload for schema validation...');
  sampleData = {
    elements: [
      {
        id: 'hero_title',
        type: 'heading',
        text: 'VibeCheck Render Service',
        position: { x: 50, y: 50, width: 600, height: 40 },
        style: {
          color: '#000000',
          background_color: 'transparent',
          font_size: 32,
          font_weight: '700',
          border_radius: 0,
          opacity: 1
        },
        required: true,
        visibility: 'visible'
      },
      {
        id: 'submit_btn',
        type: 'button',
        text: 'Submit',
        position: { x: 50, y: 110, width: 120, height: 40 },
        relative_position: { below: 'hero_title', alignment: 'left-aligned' },
        style: {
          color: '#ffffff',
          background_color: '#0066cc',
          font_size: 14,
          font_weight: '600',
          border_radius: 4,
          opacity: 1
        },
        required: true,
        visibility: 'visible'
      }
    ],
    layout: {
      container_alignment: 'left-aligned',
      total_elements_expected: 2,
      viewport_width: 1280,
      viewport_height: 720
    },
    metadata: {
      source: 'extracted',
      timestamp: new Date().toISOString(),
      url: 'http://localhost:3001'
    }
  };
}

const isValid = validate(sampleData);

if (isValid) {
  console.log('✅ Schema validation PASSED! The payload adheres to VibeCheck Element Schema specification.');
  console.log(`📊 Validated ${sampleData.elements.length} element(s).`);
} else {
  console.error('❌ Schema validation FAILED!');
  console.error(validate.errors);
  process.exit(1);
}
