import z from 'zod';
/**
 * Shape of a `data-source.json`. The `type`/`name`/`default` keys are also read by crouton-api at runtime;
 * the rest are codegen-only.
 */
export const DataSourceShape = z.object({
  /** Datasource name (folder + `name` in data-source.json). */
  name: z.string(),
  /** Env var holding the connection URL. */
  urlEnv: z.string(),
  /** Import path for this datasource's generated Zod types (for resource `schema.ts`). */
  generatedTypesImport: z.string().optional(),
  /** Datasource type tag. Default `postgres`. */
  type: z.string().default('postgres'),
  /** Mark this as the default datasource. Default `false`. */
  default: z.boolean().default(false),
  /** Prisma schema path, relative to project root. Default `prisma/<name>/schema.prisma`. */
  prismaSchema: z.string().optional(),
  /** Prisma config path, relative to project root. Default `prisma/<name>/prisma.config.ts`. */
  prismaConfig: z.string().optional(),
  /** zod-prisma-types output dir, relative to project root. Default `generated/<name>/src`. */
  zodOutput: z.string().optional(),
  /** Prisma client output dir, relative to project root. Default `generated/<name>/client`. */
  clientOutput: z.string().optional(),
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
