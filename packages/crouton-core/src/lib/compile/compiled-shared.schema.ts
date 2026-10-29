import { z } from 'zod';

import { CalculatedColumnSchema } from '../resource';
import { JsonIncludeEntrySchema } from '../resource/include.schema';
import { ViewConfigSchema } from '../view';

/**
 * Schemas shared by `CompiledResourceSchema` and
 * `CompiledSubResourceConfigSchema`.
 *
 * Both compiled models describe the same concepts (primary key type, modal
 * size, views, value-label handling, calculated columns, eager includes). They
 * used to inline identical definitions, which drifted over time. Keeping the
 * shared vocabulary in one place stops the two models from disagreeing about
 * fields that mean the same thing on both sides.
 */

/** Primary-key value type, used for id coercion in the repositories. */
export const IdTypeSchema = z.enum(['string', 'number']);

/** Container size used when a resource is rendered in a modal. */
export const ModalSizeSchema = z.enum(['xs', 'sm', 'lg', 'xl']);

/** Pre-built table/form/view configs keyed by view name. */
export const ViewsSchema = z.record(z.string(), ViewConfigSchema);
export const OptionalViewsSchema = ViewsSchema.optional();

/** Columns whose value is computed by a raw SQL subquery at query time. */
export const CalculatedColumnsSchema = z.array(CalculatedColumnSchema);
export const OptionalCalculatedColumnsSchema = CalculatedColumnsSchema.optional();

/** Eager-loaded relations. */
export const IncludeListSchema = z.array(JsonIncludeEntrySchema);
export const OptionalIncludeListSchema = IncludeListSchema.optional();
