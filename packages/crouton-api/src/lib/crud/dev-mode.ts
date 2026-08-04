/**
 * Parses a boolean-ish env var value. Accepts "true"/"1"/"yes" (case-insensitive)
 * as truthy; everything else — including `undefined` (unset) — is falsy.
 */
const parseBooleanEnv = (value: string | undefined): boolean =>
  !!value && ['true', '1', 'yes'].includes(value.trim().toLowerCase());

/**
 * `true` when the visual resource builder (and its dev-only hot-reload
 * behavior for schemas/layout/resource.json) should be enabled.
 *
 * Read from the `CROUTON_SCHEMA_EDITOR` env var — set it in the consuming
 * app's `.env` file (loaded via `dotenv/config` in `main.ts`, as the
 * generated app templates already do). Defaults to `false` when unset, so
 * production deployments never expose these endpoints unless explicitly
 * opted in.
 */
export const IS_DEV = parseBooleanEnv(process.env['CROUTON_SCHEMA_EDITOR']);
