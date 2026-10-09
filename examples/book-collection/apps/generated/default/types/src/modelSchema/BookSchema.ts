import { z } from 'zod';
import { AuthorWithRelationsSchema } from './AuthorSchema'
import type { AuthorWithRelations } from './AuthorSchema'
import { CategoryWithRelationsSchema } from './CategorySchema'
import type { CategoryWithRelations } from './CategorySchema'
import { LoanWithRelationsSchema } from './LoanSchema'
import type { LoanWithRelations } from './LoanSchema'

/////////////////////////////////////////
// BOOK SCHEMA
/////////////////////////////////////////

export const BookSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  isbn: z.string().nullable(),
  publishedYear: z.number().int().nullable(),
  status: z.string(),
  summary: z.string().nullable(),
  rating: z.number().int().nullable(),
  authorId: z.string(),
})

export type Book = z.infer<typeof BookSchema>

/////////////////////////////////////////
// BOOK RELATION SCHEMA
/////////////////////////////////////////

export type BookRelations = {
  author: AuthorWithRelations;
  categories: CategoryWithRelations[];
  loans: LoanWithRelations[];
};

export type BookWithRelations = z.infer<typeof BookSchema> & BookRelations

export const BookWithRelationsSchema: z.ZodType<BookWithRelations> = BookSchema.merge(z.object({
  author: z.lazy(() => AuthorWithRelationsSchema),
  categories: z.lazy(() => CategoryWithRelationsSchema).array(),
  loans: z.lazy(() => LoanWithRelationsSchema).array(),
}))

export default BookSchema;
