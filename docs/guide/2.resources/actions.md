# Actions

Actions add custom buttons to the generated UI, beyond plain CRUD. They come in two kinds — **row actions** and **table actions** — and two types — **procedure** and **link**:

- **Row actions** (`rowActions`) — attached to individual records; the handler receives the record id. Rendered as a button in each table row.
- **Table actions** (`tableActions`) — attached to the whole table; the handler receives no record id. Rendered as toolbar buttons above the table.

|  | Row-level (`rowActions`) | Table-level (`tableActions`) |
| --- | --- | --- |
| **Procedure** | Server-side function per record — `POST /<route>/procedure/<id>/:recordId` | Server-side function for the whole table — `POST /<route>/table-action/<id>` |
| **Link** | Client-side navigation, `href` may contain `{id}` | Client-side navigation |

Both go on the **table node** inside `layout.table`:

```json
{
  "layout": {
    "table": {
      "rowActions": [ ... ],
      "tableActions": [ ... ]
    }
  }
}
```

## Procedure actions

Declare the action in `resource.json`:

```json
{
  "layout": {
    "table": {
      "rowActions": [
        {
          "id": "publish",
          "label": "Publish",
          "procedure": "publish"
        }
      ]
    }
  }
}
```

Implement it in `actions/<procedure>.ts` inside the resource directory. The default export receives the Prisma client and the record id:

```ts
// resources/book/actions/publish.ts
import type { PrismaClient } from '@prisma/client';

const publish = async (prisma: PrismaClient, id: string | number) => {
  const book = await prisma.book.findUnique({ where: { id: Number(id) } });
  if (!book) throw new Error(`Book ${id} not found`);

  await prisma.book.update({
    where: { id: book.id },
    data: { published_at: new Date() },
  });

  return { success: true, message: `"${book.title}" published` };
};

export default publish;
```

Table-level procedures work the same, but receive only the Prisma client (no record id):

```ts
// resources/book/actions/reindex.ts
const reindex = async (prisma: PrismaClient) => {
  // operate on the whole table
  return { success: true };
};

export default reindex;
```

```json
{
  "layout": {
    "table": {
      "tableActions": [
        { "id": "reindex", "label": "Reindex", "icon": "refresh", "procedure": "reindex" }
      ]
    }
  }
}
```

## Link actions

Navigate instead of calling the server. `{id}` is replaced with the record id:

```json
{
  "layout": {
    "table": {
      "rowActions": [
        {
          "type": "link",
          "id": "preview",
          "label": "Preview",
          "href": "/preview/{id}"
        }
      ]
    }
  }
}
```

## Conditional actions

Row-level actions accept a `condition` that is evaluated per row, so the button only appears when it applies:

```json
{
  "layout": {
    "table": {
      "rowActions": [
        {
          "id": "publish",
          "label": "Publish",
          "procedure": "publish",
          "condition": { "field": "published_at", "op": "notExists" }
        }
      ]
    }
  }
}
```

The `condition` object takes a `field`, an operator, and (except for the existence checks) a `value`:

| Operator | Meaning |
|----------|---------|
| `eq` (default) / `neq` | Strict equality / inequality against `value` |
| `gt` / `gte` / `lt` / `lte` | Numeric or date comparison against `value` |
| `exists` / `notExists` | Field is (not) null / undefined / empty string — no `value` needed |

## Display options

Table actions support `icon`, `label`, and `tooltip`; row actions support `label`. The HTTP `method` of a procedure action defaults to `post`.
