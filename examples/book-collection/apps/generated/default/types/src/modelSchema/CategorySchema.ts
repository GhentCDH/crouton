import { z } from 'zod';
import { BookWithRelationsSchema } from './BookSchema'
import type { BookWithRelations } from './BookSchema'

/////////////////////////////////////////
// CATEGORY SCHEMA
/////////////////////////////////////////

export const CategorySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  slug: z.string(),
})

export type Category = z.infer<typeof CategorySchema>

/////////////////////////////////////////
// CATEGORY RELATION SCHEMA
/////////////////////////////////////////

export type CategoryRelations = {
  books: BookWithRelations[];
};

export type CategoryWithRelations = z.infer<typeof CategorySchema> & CategoryRelations

export const CategoryWithRelationsSchema: z.ZodType<CategoryWithRelations> = CategorySchema.merge(z.object({
  books: z.lazy(() => BookWithRelationsSchema).array(),
}))

export default CategorySchema;
