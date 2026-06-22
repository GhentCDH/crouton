import { type PipeTransform } from '@nestjs/common';
import { type ZodError, type ZodObject, type ZodRawShape, type ZodType } from 'zod';

import { CroutonValidationError } from './crouton-validation.error';

export interface ZodValidationPipeOptions {
  /**
   * Coerce `undefined` → `null` on top-level fields that accept `null`.
   * Use for create/upsert: once nullable fields are optional in the JSON
   * Schema the client may omit them, and an omitted nullable field should be
   * stored as `null` rather than rejected. Do NOT use for PATCH/update, where
   * an omitted field means "leave unchanged".
   */
  coerceNullableUndefinedToNull?: boolean;
}

export class ZodValidationPipe implements PipeTransform {
  /** Top-level field names that accept `null` (i.e. are nullable). */
  private readonly nullableKeys: readonly string[];
  /** Whether to coerce `undefined` → `null` on nullable fields (create/upsert only). */
  private readonly coerceUndefinedToNull: boolean;

  constructor(
    private readonly schema: ZodObject<ZodRawShape>,
    options: ZodValidationPipeOptions = {},
  ) {
    // Always compute nullable keys — needed for "" → null coercion in stripEmptyStrings
    this.nullableKeys = Object.entries(schema.shape)
      .filter(([, field]) => (field as ZodType).safeParse(null).success)
      .map(([key]) => key);
    this.coerceUndefinedToNull = options.coerceNullableUndefinedToNull ?? false;
  }

  transform(value: unknown) {
    const stripped = this.stripEmptyStrings(value);
    const input = this.coerceNullable(stripped);
    const result = this.schema.safeParse(input);
    if (!result.success) {
      throw new CroutonValidationError(this.formatErrors(result.error));
    }
    return result.data;
  }

  /**
   * Convert empty strings (`''`) on all top-level fields:
   * - Nullable fields (`z.string().nullable()`): `""` → `null`
   *   (clearing a nullable field should store null, not fail validation)
   * - Required/optional fields (`z.string()` / `z.string().optional()`): `""` → `undefined`
   *   (required → fails with invalid_type; optional → passes as absent)
   */
  private stripEmptyStrings(value: unknown): unknown {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }
    const out = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(out)) {
      if (out[key] === '') {
        out[key] = this.nullableKeys.includes(key) ? null : undefined;
      }
    }
    return out;
  }

  /** Replace `undefined` with `null` on nullable fields (create/upsert only). */
  private coerceNullable(value: unknown): unknown {
    if (
      !this.coerceUndefinedToNull ||
      value == null ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return value;
    }
    const out = { ...(value as Record<string, unknown>) };
    for (const key of this.nullableKeys) {
      if (out[key] === undefined) out[key] = null;
    }
    return out;
  }

  private formatErrors(error: ZodError) {
    return error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
}
