# Hooks

Hooks let you run custom logic inside the generated repositories — transform a payload before it is written, or decorate
rows after they are read. Add a `hooks.ts` to the resource directory that default-exports a `ResourceHooks` object.

::: tip Hooks apply to [custom resources](custom-resource.md) too, wrapping whatever their `repository.ts`
returns. If you need to *replace* the data access rather than decorate it, that is what a custom resource is for.
:::

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
beforeWrite ? : (data, ctx: {
  prisma;
  op: 'create' | 'update' | 'patch' | 'upsert' | 'delete';
  id?;
  request?;
  parent?
}) => any;
```

Called with the validated payload right before it is passed to Prisma. Whatever you return is what gets written.
`ctx.id` is set for updates, `undefined` for creates.

Typical use: resolve or create related entities. For example, a form's autocomplete field submits an object — the hook
reduces it to a foreign key, creating the related record if needed:

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
afterWrite ? : (result, ctx: {
  prisma;
  op: 'create' | 'update' | 'patch' | 'upsert' | 'delete';
  id?;
  request?;
  parent?
}) => any;
```

Called with the persisted record right after Prisma writes it. Whatever you return is sent as the response. `ctx.id` is
set for updates and deletes, `undefined` for creates.

For upsert operations the `op` is resolved to `'create'` or `'update'` based on whether a matching record existed before
the operation — so your hook always receives a specific op, never `'upsert'`.

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
afterRead ? : (row, ctx: { prisma; op: 'findAll' | 'findOne'; request?; parent? }) => any;
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
`afterRead` runs per row — keep it cheap. Avoid extra queries inside it for list endpoints; prefer [
`include`](resource-json.md#includes) or [calculated columns](resource-json.md#calculated-columns) to fetch related data
in the main query.
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

When the child has its own directory, a `hooks.ts` beside its `resource.json` is picked up too — usually where you want
it for a `kind: "custom"` child, next to its
`repository.ts`:

```
resources/groups/
├── resource.json        # relation column → ./expense
└── expense/
    ├── resource.json
    ├── repository.ts
    └── hooks.ts         # hooks for the expense sub-resource
```

The parent-scoped `hooks/<name>.ts` wins if both exist.

### Getting the parent id

`ctx.parent` carries the parent a nested read or write is scoped to:

```ts
const hooks: ResourceHooks<PrismaClient> = {
  beforeWrite: async (data, { parent, prisma }) => {
    if (!parent) return data;                 // a top-level write
    return { ...data, group_id: parent.id };
  },
};
```

```ts
parent ? : { route: string; param: string; id: string | number };
```

`param` names where the id came from, and it differs between the two ways of nesting: a sub-resource is served by the
parent's controller, so its parent arrives as the parent's own `:id`, while a resource that declares
[`parent`](custom-resource.md#as-a-standalone-nested-route-parent) names its own (`groupId`). Reading
`parent.id`
works either way — which is the point of the field, since digging through `ctx.request.params` means knowing which name
applies.

It is `undefined` on a top-level write, and also when the request carried no parent id: a hook is never handed a
fabricated one. Same shape a custom resource's
[`repository.ts`](custom-resource.md#the-context-object) receives as
`ctx.parent`.
