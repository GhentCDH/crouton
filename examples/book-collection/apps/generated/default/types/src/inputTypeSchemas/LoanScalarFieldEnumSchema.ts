import { z } from 'zod';


export const LoanScalarFieldEnumSchema = z.enum(['id','loanedAt','returnedAt','userId','bookId']);

export default LoanScalarFieldEnumSchema;
