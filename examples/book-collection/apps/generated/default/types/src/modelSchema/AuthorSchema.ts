import { z } from 'zod';
import { BookWithRelationsSchema } from './BookSchema'
import type { BookWithRelations } from './BookSchema'

/////////////////////////////////////////
// AUTHOR SCHEMA
/////////////////////////////////////////

export const AuthorSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  bio: z.string().nullable(),
})

export type Author = z.infer<typeof AuthorSchema>

/////////////////////////////////////////
// AUTHOR RELATION SCHEMA
/////////////////////////////////////////

export type AuthorRelations = {
  books: BookWithRelations[];
};

export type AuthorWithRelations = z.infer<typeof AuthorSchema> & AuthorRelations

export const AuthorWithRelationsSchema: z.ZodType<AuthorWithRelations> = AuthorSchema.merge(z.object({
  books: z.lazy(() => BookWithRelationsSchema).array(),
}))

export default AuthorSchema;
