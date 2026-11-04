import { generatorHandler } from '@prisma/generator-helper';

import {
  fixEsmBarrels,
  fixZodImports,
  normalizeSchema,
  resolveBin,
  runProcess,
} from '@ghentcdh/crouton-codegen';

import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const run = async (cmd: string, args: string[], cwd: string) => {
  const { code, stdout, stderr } = await runProcess(cmd, args, cwd);
  return { code, out: stdout + stderr };
};

/** Strip all generator blocks from a schema SDL string. */
const stripGenerators = (schema: string): string =>
  schema.replace(/^generator\s+\w+\s*\{[^}]*\}/gms, '').replace(/\n{3,}/g, '\n\n').trim();

generatorHandler({
  onManifest() {
    return {
      prettyName: 'Crouton',
      defaultOutput: './generated/types',
      requiresGenerators: [],
    };
  },

  async onGenerate(options) {
    const { config } = options.generator;
    const schemaPath = options.schemaPath;
    const schemaDir = dirname(schemaPath);

    const zodOutput = config['zodOutput'];
    if (!zodOutput) throw new Error('[crouton-prisma] zodOutput is required in generator config');
    const zodOutputStr = Array.isArray(zodOutput) ? zodOutput[0] : zodOutput;

    const absZodOutput = resolve(schemaDir, zodOutputStr);

    // 1. Normalize: rename relation fields per normalize-schema.json, write back to schema.prisma
    await normalizeSchema(schemaPath);

    // 2. Build temp schema: datasource + normalized models + generator zod block (no crouton/client)
    const normalized = await readFile(schemaPath, 'utf-8');
    const modelsOnly = stripGenerators(normalized);

    // zod-prisma-types config (hardcoded; matches what the scaffold template used to emit)
    const zodBlock = `generator zod {
  provider                         = "zod-prisma-types"
  output                           = "${absZodOutput}"
  addInputTypeValidation           = "false"
  createInputTypes                 = "false"
  createModelTypes                 = "true"
  createOptionalDefaultValuesTypes = "false"
  createRelationValuesTypes        = "true"
  useMultipleFiles                 = "true"
  writeBarrelFiles                 = "true"
}`;

    const tmpSchema = `${zodBlock}\n\n${modelsOnly}\n`;

    // Write temp schema next to the real one (same dir = same .env lookup)
    const tmpSchemaPath = join(schemaDir, '.crouton-gen-tmp.prisma');
    await writeFile(tmpSchemaPath, tmpSchema, 'utf-8');

    try {
      // 3. Run zod-prisma-types via prisma generate --schema <tmp>
      const [bin, prefix] = resolveBin('prisma', schemaDir);
      const result = await run(bin, [...prefix, 'generate', '--schema', tmpSchemaPath], schemaDir);
      if (result.code !== 0) {
        throw new Error(`[crouton-prisma] zod generation failed:\n${result.out}`);
      }
    } finally {
      // Clean up temp schema
      await rm(tmpSchemaPath, { force: true });
    }

    // 4. Fix missing zod imports in generated output
    await fixZodImports(absZodOutput);

    // 5. Fix ESM directory imports and ensure barrel index files exist
    await fixEsmBarrels(absZodOutput);
  },
});
