import { z } from 'zod';
import { UserWithRelationsSchema } from './UserSchema'
import type { UserWithRelations } from './UserSchema'
import { BookWithRelationsSchema } from './BookSchema'
import type { BookWithRelations } from './BookSchema'

/////////////////////////////////////////
// LOAN SCHEMA
/////////////////////////////////////////

export const LoanSchema = z.object({
  id: z.string().cuid(),
  loanedAt: z.coerce.date(),
  returnedAt: z.coerce.date().nullable(),
  userId: z.string(),
  bookId: z.string(),
})

export type Loan = z.infer<typeof LoanSchema>

/////////////////////////////////////////
// LOAN RELATION SCHEMA
/////////////////////////////////////////

export type LoanRelations = {
  user: UserWithRelations;
  book: BookWithRelations;
};

export type LoanWithRelations = z.infer<typeof LoanSchema> & LoanRelations

export const LoanWithRelationsSchema: z.ZodType<LoanWithRelations> = LoanSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
  book: z.lazy(() => BookWithRelationsSchema),
}))

export default LoanSchema;
