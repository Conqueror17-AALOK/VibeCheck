export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ExtractionValidator {
  constructor(schemaPath?: string);
  validate(data: unknown): ValidationResult;
}
