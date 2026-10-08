Status: planned
# Unify Root & Child Resource Build Logic — Phase Plan

## Goal

Root resources and `subResources` (children) already share the endpoint wiring,
but each `register-*.ts` still carries a `default*` (root) and `child*` (child)
descriptor pair. The two branches differ in only five dimensions; everything
else is duplicated. This plan collapses that duplication so root and child are
one code path whose **only fork is the URL** (and the parent id/param binding
that the URL implies).

Out of scope for the early phases: the `parent` / `ParentRef` mechanism, which
*already* delivers "same logic, different URL" — it runs the root descriptors
unchanged and only prefixes the controller path. It is revisited in the optional
final phase.

## Current state

Two distinct child mechanisms exist:

- **`parent` / `ParentRef`** (`config.parent`) — child is its own controller,
  own repo, mounted at `<parent.route>/:<param>/<route>`. Uses the root
  descriptors verbatim (`sub` is undefined). Already fully unified.
  `kind: custom` only.
- **`subResources` / `SubResourceConfig`** (`config.subResources`) — child
  endpoints grafted onto the parent's controller, served by a separate repo
  method family (`findAllByParent`, `findOneChild`, `createChild`,
  `updateChild`, `deleteChild`). This is where the duplication lives.

### What actually differs (root vs child, per operation)

| dimension        | root                                        | child                                                   |
|------------------|---------------------------------------------|---------------------------------------------------------|
| route            | `''` / `:id`                                | `:id/${childRoute}` / `:id/${childRoute}/:childId`      |
| methodName       | `findAll`, `create`, …                      | `findAllBy_${childRoute}`, `createChild_${childRoute}`, … |
| enable source    | `ctx.definition` + `isOperationExternal`    | `sub.operations` (no external check)                    |
| repo call        | `repo.findAll(...)`                          | `repo.findAllByParent(id, childRoute, ...)`             |
| param binding    | `Param('id')`, `Req`                        | extra parent `Param('id')` + `Param('childId')`         |
| display name     | `config.name`                               | `sub.childRoute`                                        |

The shared wrapper (HTTP verb + route, `ApiOperation`, `ApiResponse`,
`ApiNotFound`, `secure()`) is already common.

### Known latent bug this refactor prevents

`register-delete.ts` once bound the parent id param incorrectly (`parentId`
arrived `undefined`, disabling the cross-parent foreign-key guard). That is the
exact copy-paste drift class the merge removes.

---

## Phase 0 — Baseline & safety net

**Intent:** lock current behavior before touching structure.

- Inventory the six operations (`findAll`, `findOne`, `create`, `update`,
  `patch`, `delete`) × two variants (root/child) = 12 descriptor builders.
- Confirm/expand integration coverage of both root and `subResources` routes:
  full CRUD on a root resource, and full CRUD on at least one `subResource`
  (assert the parent-id scoping — the delete guard especially).
- Capture the generated OpenAPI/Swagger paths for a fixture app as a golden
  snapshot (route strings, method names, param metadata). This is the primary
  regression oracle for phases 1–2.

**Exit:** green tests + a committed route/schema snapshot. No production code
changed.

---

## Phase 1 — Extract the shared operation registrar (controller layer)

**Intent:** one generic registrar consumes a per-operation descriptor; kill the
duplicated wrapper code. No behavior change.

- Define a single `OperationSpec` shape returned by a descriptor:
  `{ route, methodName, name, handler, paramDecorators, enabled, httpMethod,
  apiSummary, apiResponses }`.
- Add `registerOperation(ctx, spec)` that does all shared wiring currently
  copy-pasted in each `register-*.ts`: `def()`, `desc()`, the HTTP verb
  decorator + route, `ApiOperation`/`ApiResponse`/`ApiNotFound`, then
  `spec.paramDecorators()`, then `ctx.secure(methodName, op, sub)`.
- Rewrite each `register-*.ts` so `registerX(ctx, sub?)` builds one `spec`
  (still via the existing `default*`/`child*` pair internally) and hands it to
  `registerOperation`. The `default*`/`child*` split still exists here — this
  phase only centralizes the *wrapper*.

**Exit:** route/schema snapshot from Phase 0 is byte-identical; all tests green.
Diff should be net-negative in the wrapper code.

---

## Phase 2 — Collapse `default*` / `child*` into one descriptor

**Intent:** each operation has a single descriptor factory parameterized by
`sub?`. URL + param binding become the only fork.

- Merge each `default*(ctx)` / `child*(sub)(ctx)` pair into
  `describeX(ctx, sub?)` that computes the five differing fields from `sub`:
  - route via a small helper, e.g. `opRoute(baseRoute, sub)` →
    root `:id` vs `:id/${sub.childRoute}/:childId`.
  - methodName via `opMethodName('findAll', sub)`.
  - enabled: `sub ? isOperationEnabled(sub.operations, op)
    : isOperationEnabled(ctx.definition, op) && !isOperationExternal(...)`.
  - name: `sub?.childRoute ?? config.name`.
  - handler + paramDecorators: still branch on `sub` here, because the repo
    method family differs (resolved in Phase 3). Keep the branch minimal and
    local to the handler closure.
- Delete the now-unused `default*`/`child*` exports.

**Exit:** ~half of `register-findall/findone/create/update/patch/delete.ts`
removed; snapshot still identical; tests green. This is the recommended
stopping point for a first shippable PR.

---

## Phase 3 — Unify the repository boundary (optional, larger blast radius)

**Intent:** remove the last fork (handler + param binding) by giving root and
child a single repo signature. After this, the descriptor's only `sub`-dependent
output is the route string and the extra path param.

- Introduce a `scope` argument on the core repo methods:
  ```ts
  findAll(params, scope?, req)      // scope?: { parentId, sub }
  findOne(id, scope?, req)
  create(body, scope?, req)
  update(id, body, scope?, req)
  patch(id, body, scope?, req)
  delete(id, scope?, req)
  ```
  Root = `scope` undefined; child = `{ parentId, sub }`.
- Fold `findAllByParent`/`findOneChild`/`createChild`/`updateChild`/
  `deleteChild` into the scoped methods inside `ReadRepository`,
  `WriteRepository`, and the adapter surface (`DataSourceAdapter`,
  `PrismaDataSourceAdapter`, custom repositories). Keep the old method names as
  thin deprecated shims for one release to avoid breaking custom `repository.ts`
  implementations.
- Update `crud-repository.factory.ts` (both the adapter path and the legacy
  Prisma path) to expose the unified signatures.
- In the controller, the handler closure becomes single-path; param decorators
  still add `:childId` when `sub` is present, but read from one binding helper.

**Exit:** one descriptor per operation, no `sub` branch in the handler body;
CRUD snapshot unchanged; custom-repo shim path tested.

**Risk:** touches read/write repos, the adapter interface, and any project's
custom `repository.ts`. Sequence carefully and keep the deprecated shims until
downstream apps migrate.

---

## Phase 4 — (Optional / strategic) reconcile `subResources` and `parent`

**Intent:** decide whether two child mechanisms should coexist long-term.

- `parent`/`ParentRef` already achieves "same logic, different URL" but is
  `kind: custom` only; `subResources` reuses the parent's Prisma model/relation.
- Evaluate whether Prisma-relation nesting can be expressed as a `parent`-style
  mount over the scoped repo from Phase 3, eliminating the `subResources`
  grafting entirely — or whether they stay separate by design (relation-nested
  vs independently-addressed child).
- Document the decision as an ADR; do not implement without sign-off.

---

## Sequencing & shippability

- Phases 0 → 1 → 2 are a clean, low-risk PR with no behavior change and a large
  duplication win. Recommended first deliverable.
- Phase 3 is a separate PR, gated on whether sub-resources keep growing.
- Phase 4 is a design decision, not a code change.

## Regression oracle (all phases)

The Phase 0 OpenAPI route/method/param snapshot must remain identical through
Phases 1–3. Any diff in a registered path, method name, or param metadata is a
behavior change and must be justified, not absorbed.
