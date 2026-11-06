import { z } from 'zod';


export const BookScalarFieldEnumSchema = z.enum(['id','title','isbn','publishedYear','status','featured','availability','summary','rating','authorId']);

export default BookScalarFieldEnumSchema;
