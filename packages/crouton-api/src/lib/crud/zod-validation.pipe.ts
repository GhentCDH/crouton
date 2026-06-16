import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { type ZodError, type ZodObject, type ZodRawShape, type ZodType } from 'zod';

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

  constructor(
    private readonly schema: ZodObject<ZodRawShape>,
    options: ZodValidationPipeOptions = {},
  ) {
    this.nullableKeys = options.coerceNullableUndefinedToNull
      ? Object.entries(schema.shape)
          .filter(([, field]) => (field as ZodType).safeParse(null).success)
          .map(([key]) => key)
      : [];
  }

  transform(value: unknown) {
    const input = this.coerceNullable(value);
    const result = this.schema.safeParse(input);
    if (!result.success) {
      throw new BadRequestException(this.formatErrors(result.error));
    }
    return result.data;
  }

  /** Replace `undefined` with `null` on nullable fields (create/upsert only). */
  private coerceNullable(value: unknown): unknown {
    if (
      !this.nullableKeys.length ||
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
