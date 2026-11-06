import { z } from 'zod';


export const BookScalarFieldEnumSchema = z.enum(['id','title','isbn','publishedYear','status','featured','availability','isSigned','provenance','summary','rating','authorId']);

export default BookScalarFieldEnumSchema;
