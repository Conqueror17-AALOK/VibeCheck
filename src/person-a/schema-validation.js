import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExtractionValidator {
  constructor(schemaPath) {
    const targetSchemaPath = schemaPath || path.resolve(__dirname, 'schema.json');
    const schemaContent = fs.readFileSync(targetSchemaPath, 'utf8');
    this.schema = JSON.parse(schemaContent);

    this.ajv = new Ajv({ allErrors: true, strict: false });
    if (typeof addFormats === 'function') {
      addFormats(this.ajv);
    } else if (addFormats && addFormats.default) {
      addFormats.default(this.ajv);
    }
    this.validateFn = this.ajv.compile(this.schema);
  }

  validate(data) {
    const valid = this.validateFn(data);
    if (!valid) {
      const errors = (this.validateFn.errors || []).map(
        (err) => `${err.instancePath || '(root)'} ${err.message || 'invalid'}`.trim()
      );
      return { valid: false, errors };
    }
    return { valid: true, errors: [] };
  }
}

// CLI runner if executed directly
if (process.argv[1] && process.argv[1].endsWith('schema-validation.js')) {
  const dataPath = path.resolve(__dirname, 'example-extraction.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const validator = new ExtractionValidator();
  const result = validator.validate(data);

  if (!result.valid) {
    console.error('Schema validation failed:');
    console.error(result.errors);
    process.exit(1);
  } else {
    console.log('Schema validation successful!');
  }
}
