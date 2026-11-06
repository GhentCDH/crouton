import { z } from 'zod';


export const AuthorScalarFieldEnumSchema = z.enum(['id','name','bio','notes']);

export default AuthorScalarFieldEnumSchema;
