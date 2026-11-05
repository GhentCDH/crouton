import z from 'zod';
/**
 * Shape of a `data-source.json`. The `type`/`name`/`default` keys are also read by crouton-api at runtime;
 * the rest are codegen-only.
 */
export const DataSourceShape = z.object({
  $schema: z.string().optional().describe('URL of the generated JSON Schema for editor autocomplete and validation. Ignored at runtime.'),
  name: z.string().describe('Datasource name. Matches the folder name and the "name" field in data-source.json.'),
  urlEnv: z.string().optional().describe('Environment variable holding the database connection URL. Required for Prisma adapters; optional for custom adapters that use a different connection config (secrets file, SDK key, etc.).'),
  generatedTypesImport: z.string().optional().describe('Import path for this datasource\'s generated Zod types, used in resource schema.ts files. Defaults to "@your-scope/generated/<name>".'),
  type: z.string().default('postgres').describe('Datasource type tag used for codegen hints. Default "postgres".'),
  default: z.boolean().default(false).describe('Mark this as the default datasource. Default false. Exactly one datasource should set this to true.'),
  adapter: z.enum(['prisma', 'custom']).default('prisma').describe('"prisma" (default) expects index.ts to default-export a PrismaClient. "custom" expects it to default-export a DataSourceAdapter. Use "custom" for non-Prisma data sources instead of kind:"custom" on the resource.'),
  prismaSchema: z.string().optional().describe('Path to the Prisma schema file, relative to the project root. Defaults to "prisma/<name>/schema.prisma".'),
  prismaConfig: z.string().optional().describe('Path to the Prisma config file, relative to the project root. Defaults to "prisma/<name>/prisma.config.ts".'),
  zodOutput: z.string().optional().describe('zod-prisma-types output directory, relative to the project root. Defaults to "generated/<name>/src".'),
  clientOutput: z.string().optional().describe('Prisma client output directory, relative to the project root. Defaults to "generated/<name>/client".'),
});

export const transformDataSource = <D extends z.infer<typeof DataSourceShape>>(
  data: D,
) => {
  const name = data.name ?? 'name';

  return {
    ...data,
    generatedTypesImport:
      data.generatedTypesImport ?? `@your-scope/generated/${name}`,
    prismaSchema: data.prismaSchema ?? `prisma/${name}/schema.prisma`,
    prismaConfig: data.prismaConfig ?? `prisma/${name}/prisma.config.ts`,
    zodOutput: data.zodOutput ?? `generated/${name}/src`,
    clientOutput: data.clientOutput ?? `generated/${name}/client`,
  };
};

export const DataSourceSchema = DataSourceShape.transform(transformDataSource);

export type DataSource = z.infer<typeof DataSourceSchema>;
