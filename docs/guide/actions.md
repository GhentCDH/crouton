# Actions

Actions add custom buttons to the generated UI, beyond plain CRUD. They come in two kinds and two scopes:

|  | Row-level (`actions`) | Table-level (`tableActions`) |
| --- | --- | --- |
| **Procedure** | Server-side function per record — `POST /<route>/procedure/<id>/:recordId` | Server-side function for the whole table — `POST /<route>/table-action/<id>` |
| **Link** | Client-side navigation, `href` may contain `{id}` | Client-side navigation |

## Procedure actions

Declare the action in `resource.json`:

```json
{
  "actions": [
    {
      "id": "publish",
      "label": "Publish",
      "procedure": "publish"
    }
  ]
}
```

Implement it in `actions/<procedure>.ts` inside the resource directory. The default export receives the Prisma client and the record id:

```ts
// resources/book/actions/publish.ts
import type { PrismaClient } from '@prisma/client';

export default async function publish(
  prisma: PrismaClient,
  id: string | number,
) {
  const book = await prisma.book.findUnique({ where: { id: Number(id) } });
  if (!book) throw new Error(`Book ${id} not found`);

  await prisma.book.update({
    where: { id: book.id },
    data: { published_at: new Date() },
  });

  return { success: true, message: `"${book.title}" published` };
}
```

Table-level procedures work the same, but receive only the Prisma client (no record id):

```ts
// resources/book/actions/reindex.ts
export default async function reindex(prisma: PrismaClient) {
  // operate on the whole table
  return { success: true };
}
```

```json
{
  "tableActions": [
    { "id": "reindex", "label": "Reindex", "icon": "refresh", "procedure": "reindex" }
  ]
}
```

## Link actions

Navigate instead of calling the server. `{id}` is replaced with the record id:

```json
{
  "actions": [
    {
      "type": "link",
      "id": "preview",
      "label": "Preview",
      "href": "/preview/{id}"
    }
  ]
}
```

## Conditional actions

Row-level actions accept a `condition` that is evaluated per row, so the button only appears when it applies:

```json
{
  "actions": [
    {
      "id": "publish",
      "label": "Publish",
      "procedure": "publish",
      "condition": { "field": "published_at", "exists": false }
    }
  ]
}
```

## Display options

Table actions support `icon`, `label`, and `tooltip`; row actions support `label`. The HTTP `method` of a procedure action defaults to `post`.
