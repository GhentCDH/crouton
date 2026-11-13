# `@ghentcdh/crouton-ui-vue/testing`

Playwright harnesses for `@ghentcdh/crouton-ui-vue` components. Each harness wraps a
`Locator` and exposes the actions a test would perform on that one widget —
no knowledge of routes, forms, or fixtures.

## Layering

| Suffix     | Where it lives                                      | Knows about                                 |
|------------|-----------------------------------------------------|---------------------------------------------|
| `*Harness` | `@ghentcdh/crouton-ui-vue/testing`                  | one `Locator`, one UI component             |
| `*Fixture` | `@ghentcdh/json-forms-vue-test`                     | a JsonForm-bound entity, composes harnesses |
| `*Page`    | the consuming e2e suite (`ui-e2e`, `vue-e2e`, mela) | a route + page-level navigation             |

Reach for a harness when you want to drive a single control. Reach for a
fixture when you want to fill an entire form. Reach for a page when you
want to navigate the app.

## Usage

```ts
import { AutocompleteHarness, ModalHarness } from '@ghentcdh/crouton-ui-vue/testing';

const author = AutocompleteHarness.byLabel(page, 'Author');
await author.fill('Tolstoy');

const modal = ModalHarness.byTitle(page, 'Create new author');
await modal.close();
```

See the `ui-e2e` package for end-to-end examples.

## Resolving harnesses

Each harness ships at least one factory:

- `byLabel(parent, label)` — match the control's visible / aria label
- `byId(parent, id)` — match the `aria-label="{id}"` set by lib components
- `for(locator)` — wrap an existing Locator you've already scoped

JsonForm-specific callers use `byScopeName` from
`@ghentcdh/json-forms-vue-test`, which is the same as `byId` but documents
the JsonForm scope-path convention.
