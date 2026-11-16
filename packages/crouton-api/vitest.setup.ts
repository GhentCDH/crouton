// Schema tests load crouton.json from the working directory (see bootCase in
// src/testing/schema-test-utils.ts). Pin it to this package so the suite also
// passes when vitest runs from the repo root; a no-op under `nx run crouton-api:test`.
process.chdir(import.meta.dirname);
