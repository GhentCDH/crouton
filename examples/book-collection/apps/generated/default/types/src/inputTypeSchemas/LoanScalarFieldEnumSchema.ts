import { z } from 'zod';


export const LoanScalarFieldEnumSchema = z.enum(['id','loanedAt','returnedAt','requestedPickupAt','rentalPeriod','userId','bookId']);

export default LoanScalarFieldEnumSchema;
