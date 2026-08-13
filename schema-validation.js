import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export class ExtractionValidator {
  constructor(schemaPath) {
    const resolvedPath = schemaPath || path.resolve(process.cwd(), "schema.json");
    const schemaContent = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.validateFn = this.ajv.compile(schemaContent);
  }

  validate(data) {
    const valid = this.validateFn(data);
    if (valid) {
      return { valid: true, errors: [] };
    }
    const errors = (this.validateFn.errors || []).map(
      (err) => `${err.instancePath || "(root)"} ${err.message || "invalid"}`.trim()
    );
    return { valid: false, errors };
  }
}
