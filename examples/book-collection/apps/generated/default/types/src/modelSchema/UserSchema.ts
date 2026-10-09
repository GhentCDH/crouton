import { z } from 'zod';
import { LoanWithRelationsSchema } from './LoanSchema'
import type { LoanWithRelations } from './LoanSchema'

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  email: z.string(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// USER RELATION SCHEMA
/////////////////////////////////////////

export type UserRelations = {
  loans: LoanWithRelations[];
};

export type UserWithRelations = z.infer<typeof UserSchema> & UserRelations

export const UserWithRelationsSchema: z.ZodType<UserWithRelations> = UserSchema.merge(z.object({
  loans: z.lazy(() => LoanWithRelationsSchema).array(),
}))

export default UserSchema;
