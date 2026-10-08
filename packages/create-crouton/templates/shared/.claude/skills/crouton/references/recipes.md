# Recipes — common tasks

## Add a resource for an existing Prisma model

1. Confirm the model exists in `schema.prisma`.
2. Run `crouton update` and select the model when prompted.
3. Crouton writes `<resourcesDir>/<name>/resource.json`.
4. Edit `resource.json`: set labels, choose fieldInput types, add relations.
5. Run `crouton validate`.

## Add a manyToOne relation (autocomplete)

In `resource.json` of the child resource (the one holding the FK):

```json
{
  "columns": {
    "authorId": {
      "fieldInput": { "type": "autocomplete", "resource": "author", "labelField": "name" }
    }
  },
  "relations": {
    "author": { "type": "manyToOne", "resource": "author", "foreignKey": "authorId" }
    }
}
```

Run `crouton validate` after editing.

## Add an enum select

1. Add the enum to `crouton.enums.json` (or let `crouton update` create it).
2. In `resource.json`:

```json
{
  "columns": {
    "status": {
      "fieldInput": {
        "type": "select",
        "options": [
          { "value": "draft", "label": "Draft" },
          { "value": "published", "label": "Published" }
        ]
      }
    }
  }
}
```

## Custom field input + renderer registration

1. Create a Vue component `MyInput.vue`.
2. Register it globally in the frontend entry or via `useCrouton`:
   ```ts
   crouton.registerRenderer('MyInput', MyInput);
   ```
3. Reference in `resource.json`:
   ```json
   { "fieldInput": { "type": "custom", "component": "MyInput" } }
   ```

## Config-only resource (kind: custom)

Use when the resource has no Prisma model or uses fully custom data logic.

1. Create `<resourcesDir>/<name>/resource.json` with `"kind": "custom"`.
2. Create `<resourcesDir>/<name>/repository.ts` implementing the crouton repository interface.
3. Register the repository in the NestJS module.
4. Run `crouton validate`.
