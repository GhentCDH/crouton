# Unique fields

Mark a column `unique` to validate its value as the user types — the form asks
the API whether that value is already taken and shows an inline error before
submit — and to turn a database unique-constraint violation on write into a
friendly, field-scoped error instead of a 500.

```jsonc
// resources/user/resource.json
{
  "name": "user",
  "model": "User",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "name": {},
    "email": { "unique": true }
  }
}
```

Type an email that already exists and the field shows *"Email already exists"*;
submit is blocked while the check runs and while the value is taken.

## Two layers

Uniqueness is enforced in two places, and you want both:

- **Client (UX).** The form debounces keystrokes and calls
  `GET /<resource>/unique?field=&value=` as you type. It is advisory and
  *fail-open*: if the request errors, the form does not block you — the server
  is still the source of truth.
- **Server (guarantee).** On create/update the API catches the Prisma `P2002`
  unique-constraint error and returns a `400` whose error is attributed to the
  offending field, so two users who race the check still get a clean error on
  the right field.

::: warning Requires a real database constraint
`unique: true` does **not** create a database constraint. It is only truly
enforceable when the underlying column has a matching `@unique` (or
`@@unique([...])`) in your Prisma schema. Without it the client check still
works, but the write-time guarantee — and the race protection — is gone.
:::

## Options

`unique` is either `true` or an object:

```jsonc
"email": {
  "unique": {
    "caseInsensitive": true,
    "message": "That email is already registered",
    "scope": ["tenantId"]
  }
}
```

| Key | Meaning |
| --- | --- |
| `caseInsensitive` | Compare case-insensitively (Prisma `mode: "insensitive"`). |
| `message` | Error text shown on the field. Defaults to `"<Label> already exists"`. |
| `scope` | Field ids the value must be unique *within* — composite uniqueness. |

### Composite (scoped) uniqueness

`scope` makes the value unique per combination. For "email unique per tenant",
declare `"scope": ["tenantId"]` and add a matching `@@unique([email, tenantId])`
to the Prisma model. The form sends the current `tenantId` with the check, and a
composite `P2002` is attributed to the scoped field (here `email`), not to every
column in the index.

Each `scope` entry must reference a real column id on the same resource — the
[resource validator](validate-resource-json.md) reports an error otherwise.

## The check endpoint

Registered automatically for any resource that has at least one `unique` column
and an enabled `findAll`:

```
GET /<resource>/unique?field=<columnId>&value=<value>&excludeId=<id?>&scope=<json?>
→ 200 { "unique": true | false }
```

- Returns **only** a boolean — never the matching record.
- Rejects any `field` that is not declared `unique`, so it can't be used as a
  generic existence probe.
- `excludeId` is sent automatically in edit mode so a record doesn't clash with
  itself.
- It reuses the resource's `findAll` security.
