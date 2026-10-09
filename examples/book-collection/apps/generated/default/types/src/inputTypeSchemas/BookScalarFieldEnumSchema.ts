import { z } from 'zod';


export const BookScalarFieldEnumSchema = z.enum(['id','title','isbn','publishedYear','status','summary','rating','authorId']);

export default BookScalarFieldEnumSchema;
