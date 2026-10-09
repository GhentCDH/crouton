import { z } from 'zod';


export const AuthorScalarFieldEnumSchema = z.enum(['id','name','bio']);

export default AuthorScalarFieldEnumSchema;
