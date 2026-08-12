import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

// Resolves to repo-root schema.json from either src/ (ts-node/vitest) or
// dist/ (compiled output) — both sit at the same depth under src/shared/.
const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../../../schema.json");
const schema: object = JSON.parse(readFileSync(schemaPath, "utf-8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn: ValidateFunction = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validates arbitrary data against the VibeCheck Element Schema (schema.json). */
export function validateVibeCheckData(data: unknown): ValidationResult {
  const valid = validateFn(data) as boolean;
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors = (validateFn.errors ?? []).map((err) =>
    `${err.instancePath || "(root)"} ${err.message ?? "invalid"}`.trim(),
  );
  return { valid: false, errors };
}
