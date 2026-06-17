# Hooks

Hooks let you run custom logic inside the generated repositories — transform a payload before it is written, or decorate rows after they are read. Add a `hooks.ts` to the resource directory that default-exports a `ResourceHooks` object.

```ts
// resources/book/hooks.ts
import type { ResourceHooks } from '@ghentcdh/crouton-api';

const hooks: ResourceHooks = {
  beforeWrite: async (data, ctx) => {
    // runs before Prisma create / update / upsert / delete
    return data;
  },
  afterWrite: async (result, ctx) => {
    // runs after Prisma create / update / upsert / delete
    return result;
  },
  afterRead: async (row, ctx) => {
    // runs on every row returned by findAll / findOne
    return row;
  },
};

export default hooks;
```

## beforeWrite

```ts
beforeWrite?: (data, ctx: { prisma; op: 'create' | 'update' | 'upsert' | 'delete'; id? }) => any;
```

Called with the validated payload right before it is passed to Prisma. Whatever you return is what gets written. `ctx.id` is set for updates, `undefined` for creates.

Typical use: resolve or create related entities. For example, a form's autocomplete field submits an object — the hook reduces it to a foreign key, creating the related record if needed:

```ts
const hooks: ResourceHooks = {
  beforeWrite: async (data, ctx) => {
    const prisma = ctx.prisma as PrismaClient;

    // the autocomplete control submits { id, name, ... } — unwrap it
    const authorId =
      typeof data.author_id === 'object' && data.author_id !== null
        ? data.author_id.id
        : data.author_id;

    let author = await prisma.author.findUnique({ where: { id: authorId } });
    if (!author) {
      author = await prisma.author.create({ data: { id: authorId } });
    }

    return { ...data, author_id: author.id };
  },
};
```

## afterWrite

```ts
afterWrite?: (result, ctx: { prisma; op: 'create' | 'update' | 'delete'; id? }) => any;
```

Called with the persisted record right after Prisma writes it. Whatever you return is sent as the response. `ctx.id` is set for updates and deletes, `undefined` for creates.

For upsert operations the `op` is resolved to `'create'` or `'update'` based on whether a matching record existed before the operation — so your hook always receives a specific op, never `'upsert'`.

Typical use: trigger side-effects after a write, such as sending a notification or invalidating a cache:

```ts
const hooks: ResourceHooks = {
  afterWrite: async (result, ctx) => {
    if (ctx.op === 'create') {
      await notify(`New book created: ${result.title}`);
    }
    return result;
  },
};
```

## afterRead

```ts
afterRead?: (row, ctx: { prisma; op: 'findAll' | 'findOne' }) => any;
```

Called for **every row** returned by the list and detail endpoints. Use it to add derived fields:

```ts
const hooks: ResourceHooks = {
  afterRead: async (row) => ({
    ...row,
    display_name: `${row.title} (${row.year})`,
  }),
};
```

::: warning
`afterRead` runs per row — keep it cheap. Avoid extra queries inside it for list endpoints; prefer [`include`](./resource-json.md#includes) or [calculated columns](./resource-json.md#calculated-columns) to fetch related data in the main query.
:::

## Sub-resource hooks

Sub-resources (relations) can have their own hooks. Place them in a `hooks/` directory named after the sub-resource:

```
resources/book/
├── resource.json
├── resource.author.json
├── hooks.ts             # hooks for book itself
└── hooks/
    └── author.ts        # hooks for the author sub-resource
```
