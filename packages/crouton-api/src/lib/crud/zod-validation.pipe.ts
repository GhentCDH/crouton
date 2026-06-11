import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { type ZodError, type ZodObject, type ZodRawShape } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodObject<ZodRawShape>) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(this.formatErrors(result.error));
    }
    return result.data;
  }

  private formatErrors(error: ZodError) {
    return error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
}
