import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  type ApplyContext,
  type DbModel,
  type LoadedConfig,
  apply as applyDiff,
  buildResourceDiff,
  buildResourceDiffs,
  commit,
  introspect,
  listResourceNames,
  loadConfig,
  loadDatasources,
  makeRelationResolver,
  makeSchemaExportName,
  readExistingResource,
  recommendedResolver,
  resolve as resolveDiff,
  resolveDatasource,
  resolveFromRoot,
  resolveRuleset,
  backupSchema,
  fixZodImports,
  isGitDirty,
  prismaCaseFormat,
  prismaDbPull,
  prismaGenerate,
} from '@ghentcdh/crouton-codegen';
import { type DataSource } from '@ghentcdh/crouton-core';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DataSourceRegistry } from '../data-source';
import { IS_DEV } from '../dev-mode';

/**
 * Dev-only endpoints that reuse the `@ghentcdh/crouton-codegen` engine
 * (already built for the `crouton update resources` CLI command) directly
 * from a running backend request, so the visual resource builder can
 * generate a resource.json for a new DB table, or preview/apply a full
 * database sync, without shelling out to the CLI.
 *
 * Hard-gated to `IS_DEV` (`CROUTON_SCHEMA_EDITOR` env var) both at the
 * controller-registration level (see `crouton-api.module.ts`) and again on
 * every handler here, mirroring the pattern used by the schema editor's
 * PATCH/GET endpoints in `register-schema-endpoints.ts`.
 *
 * `pull` and `restart` (below) are the two handlers that go beyond reading
 * files: `pull` touches the live database and the Prisma schema file (needs
 * real DB credentials, mutates `schema.prisma` in place, backed up first,
 * mirroring the CLI); `restart` exits this very process. Every other handler
 * here only reads the Prisma client/Zod types already generated on disk.
 *
 * Note that `pull` regenerating the Prisma client on disk does not affect
 * *this* running process — `DataSourceRegistry` holds a client instance
 * built once at boot, so brand-new models exist in `schema.prisma` (and thus
 * in `GET models`) before they're actually usable here. See
 * `isAvailableOnClient` below; the backend needs an actual restart before a
 * newly pulled model can be generated/synced without throwing.
 */
@Controller('_app/resources')
@ApiTags('Dev tools')
export class DevResourcesController {
  constructor(private readonly dataSourceRegistry: DataSourceRegistry) {}

  private assertDev(): void {
    if (!IS_DEV) {
      throw new ForbiddenException(
        'The database sync tools are only available when CROUTON_SCHEMA_EDITOR is enabled.',
      );
    }
  }

  /** Loads project config + resolves the datasource + Prisma schema path. Throws 404/400 with a clear message on misconfiguration. */
  private async loadProject(
    datasourceName?: string,
  ): Promise<{ loaded: LoadedConfig; ds: DataSource; schemaPath: string }> {
    let loaded: LoadedConfig;
    try {
      loaded = await loadConfig(process.cwd());
    } catch (e) {
      throw new NotFoundException(
        (e as Error).message ?? 'No crouton.json config found.',
      );
    }

    const datasources = await loadDatasources(loaded);
    let ds: DataSource;
    try {
      ds = resolveDatasource(datasources, datasourceName);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const schemaPath = resolveFromRoot(loaded.root, ds.prismaSchema);
    return { loaded, ds, schemaPath };
  }

  private async introspectModels(schemaPath: string): Promise<DbModel[]> {
    try {
      return await introspect({ schemaPath });
    } catch (e) {
      throw new BadRequestException(
        `Failed to read Prisma schema at ${schemaPath}: ${(e as Error).message}`,
      );
    }
  }

  private buildApplyContext(
    loaded: LoadedConfig,
    ds: DataSource,
  ): ApplyContext {
    return {
      resourcesDir: resolveFromRoot(loaded.root, loaded.config.resourcesDir),
      generatedTypesImport: ds.generatedTypesImport,
      schemaExportName: makeSchemaExportName(loaded.config),
    };
  }

  /**
   * True when `clientAccessor` exists on the *currently running* Prisma
   * client for this datasource. `DataSourceRegistry` holds a client instance
   * built once at process boot (see `data-source.registry.ts`); `prisma
   * generate` rewrites the generated client code on disk, but can't change
   * the shape of an already-instantiated object in a running Node process.
   * A model added by `pull` therefore exists in `schema.prisma` (and shows up
   * here via `introspect`, which reads that file directly) before it exists
   * on this live client — using it before a restart throws "Model ... not
   * found on the provided PrismaClient" from `createCrudRepository`.
   */
  private isAvailableOnClient(ds: DataSource, clientAccessor: string): boolean {
    try {
      const client = this.dataSourceRegistry.resolve(ds.name);
      return typeof client?.[clientAccessor] !== 'undefined';
    } catch {
      return false;
    }
  }

  @Get('models')
  @ApiOperation({
    summary:
      'Dev-only: list DB models from the Prisma schema, flagging which already have a resource.json and whether the running backend can actually use them yet',
  })
  @ApiResponse({
    status: 200,
    description: 'DB models and their resource/client status',
  })
  async listModels(): Promise<{
    models: {
      prismaName: string;
      clientAccessor: string;
      hasResource: boolean;
      availableOnClient: boolean;
    }[];
  }> {
    this.assertDev();
    const { loaded, ds, schemaPath } = await this.loadProject();
    const models = await this.introspectModels(schemaPath);
    const existing = new Set(await listResourceNames(loaded));

    return {
      models: models.map((m) => ({
        prismaName: m.prismaName,
        clientAccessor: m.clientAccessor,
        hasResource: existing.has(m.clientAccessor),
        availableOnClient: this.isAvailableOnClient(ds, m.clientAccessor),
      })),
    };
  }

  @Post('restart')
  @ApiOperation({
    summary:
      'Dev-only: exit this process so a dev watcher/process manager (nodemon, `nest start --watch`, pm2, a Docker restart policy, ...) restarts it with a fresh Prisma client. Does nothing useful if this process isn\'t supervised by one of those.',
  })
  @ApiResponse({
    status: 200,
    description: 'Restart scheduled — the connection will drop shortly after',
  })
  restart(): { restarting: true } {
    this.assertDev();
    // Give Nest/Express time to flush this response over the socket before
    // the process disappears — the frontend needs to see `{ restarting:
    // true }` to know the exit was intentional, not a crash mid-request.
    // A non-zero exit code is used deliberately: pm2, Docker restart
    // policies, and most "restart on crash" nodemon configs treat that as
    // "needs a restart" more reliably than a clean (0) exit, which several
    // tools instead read as "stopped on purpose, leave it stopped".
    setTimeout(() => {
      this.dataSourceRegistry
        .disconnectAll()
        .catch(() => undefined)
        .finally(() => process.exit(1));
    }, 250);
    return { restarting: true };
  }

  @Post('pull')
  @ApiOperation({
    summary:
      'Dev-only: run `prisma db pull` + case-format + `prisma generate` for a datasource, refreshing schema.prisma and the generated Prisma client/Zod types from the live database',
  })
  @ApiResponse({
    status: 200,
    description:
      'Result of each step, or requiresConfirmation if schema.prisma has uncommitted changes',
  })
  async pull(
    @Body() body: { datasource?: string; confirm?: boolean } = {},
  ): Promise<{
    requiresConfirmation?: boolean;
    dirtyFile?: string;
    ok?: boolean;
    /**
     * Always true on success: this process's Prisma client was built at boot
     * and can't pick up model changes from a fresh `prisma generate` without
     * restarting — see `isAvailableOnClient` above.
     */
    restartRequired?: boolean;
    backupPath?: string;
    dbPull?: { ok: boolean; output: string };
    caseFormat?: { ok: boolean; output: string };
    generate?: { ok: boolean; output: string };
    zodImportsFixed?: number;
  }> {
    this.assertDev();
    const { loaded, ds, schemaPath } = await this.loadProject(body.datasource);
    const prismaConfigPath = resolveFromRoot(loaded.root, ds.prismaConfig);

    // `db pull` overwrites schema.prisma — same uncommitted-changes guard the
    // CLI shows as an interactive confirm, surfaced here as a flag so the
    // frontend can show its own confirmation before retrying with confirm: true.
    if (!body.confirm && (await isGitDirty(loaded.root, schemaPath))) {
      return { requiresConfirmation: true, dirtyFile: ds.prismaSchema };
    }

    const backupPath = await backupSchema(schemaPath);

    const dbPull = await prismaDbPull(loaded.root, prismaConfigPath);
    if (!dbPull.ok) {
      throw new BadRequestException(`prisma db pull failed:\n${dbPull.output}`);
    }

    // Case-format and generate failures are surfaced but non-fatal, matching
    // the CLI: the pulled schema is still usable even if these steps fail.
    const caseFormat = await prismaCaseFormat(loaded.root, schemaPath);
    const generate = await prismaGenerate(loaded.root, prismaConfigPath);

    let zodImportsFixed = 0;
    if (generate.ok && ds.zodOutput) {
      zodImportsFixed = await fixZodImports(
        resolveFromRoot(loaded.root, ds.zodOutput),
      );
    }

    return {
      ok: true,
      restartRequired: true,
      backupPath,
      dbPull,
      caseFormat,
      generate,
      zodImportsFixed,
    };
  }

  @Post('sync')
  @ApiOperation({
    summary:
      'Dev-only: generate or update a single resource.json from its DB model, using recommended defaults (non-interactive)',
  })
  @ApiResponse({ status: 200, description: 'Files written for this resource' })
  async sync(@Body() body: { model: string; datasource?: string }): Promise<{
    resource: string;
    isNew: boolean;
    written: string[];
    skipped: string[];
  }> {
    this.assertDev();
    if (!body?.model) {
      throw new BadRequestException('"model" is required.');
    }

    const { loaded, ds, schemaPath } = await this.loadProject(body.datasource);
    const models = await this.introspectModels(schemaPath);
    const model = models.find(
      (m) => m.prismaName === body.model || m.clientAccessor === body.model,
    );
    if (!model) {
      throw new NotFoundException(
        `Model "${body.model}" not found in ${schemaPath}.`,
      );
    }

    const resolveRelationResource = await makeRelationResolver(loaded);
    const diff = await buildResourceDiff(model, {
      database: ds.name,
      ruleset: resolveRuleset(loaded.config),
      resolveRelationResource,
      readExisting: (name) => readExistingResource(loaded, name),
    });
    const resolved = await resolveDiff(diff, recommendedResolver);
    const plan = applyDiff(resolved, this.buildApplyContext(loaded, ds));
    const result = await commit(plan);

    return { resource: diff.name, isNew: diff.isNew, ...result };
  }

  @Post('plan')
  @ApiOperation({
    summary:
      'Dev-only: dry-run introspect + diff across all (or selected) DB models using recommended defaults — computes what would change, writes nothing',
  })
  @ApiResponse({ status: 200, description: 'Proposed per-resource changes' })
  async plan(
    @Body() body: { models?: string[]; datasource?: string } = {},
  ): Promise<{
    resources: {
      resource: string;
      model: string;
      isNew: boolean;
      decisions: unknown[];
      files: { path: string; action: string }[];
      notes: string[];
    }[];
  }> {
    this.assertDev();
    const { loaded, ds, schemaPath } = await this.loadProject(body.datasource);
    const allModels = await this.introspectModels(schemaPath);
    const models = body.models?.length
      ? allModels.filter(
          (m) =>
            body.models!.includes(m.prismaName) ||
            body.models!.includes(m.clientAccessor),
        )
      : allModels;

    const resolveRelationResource = await makeRelationResolver(loaded);
    const diffs = await buildResourceDiffs(models, {
      database: ds.name,
      ruleset: resolveRuleset(loaded.config),
      resolveRelationResource,
      readExisting: (name) => readExistingResource(loaded, name),
    });
    const applyCtx = this.buildApplyContext(loaded, ds);

    const resources: {
      resource: string;
      model: string;
      isNew: boolean;
      decisions: unknown[];
      files: { path: string; action: string }[];
      notes: string[];
    }[] = [];

    for (const diff of diffs) {
      const resolved = await resolveDiff(diff, recommendedResolver);
      const writePlan = applyDiff(resolved, applyCtx);
      // No-op diffs (nothing to write, nothing to warn about) are omitted —
      // re-running against an unchanged DB schema should show an empty list.
      if (writePlan.files.length === 0 && writePlan.notes.length === 0)
        continue;

      resources.push({
        resource: diff.name,
        model: diff.model,
        isNew: diff.isNew,
        decisions: diff.decisions,
        files: writePlan.files.map((f) => ({ path: f.path, action: f.action })),
        notes: writePlan.notes,
      });
    }

    return { resources };
  }

  @Post('apply')
  @ApiOperation({
    summary:
      'Dev-only: commit resource.json/schema.ts changes to disk for the given resources (or all, if omitted), using recommended defaults',
  })
  @ApiResponse({ status: 200, description: 'Per-resource commit results' })
  async apply(
    @Body() body: { resources?: string[]; datasource?: string } = {},
  ): Promise<{
    results: { resource: string; written: string[]; skipped: string[] }[];
  }> {
    this.assertDev();
    const { loaded, ds, schemaPath } = await this.loadProject(body.datasource);
    const allModels = await this.introspectModels(schemaPath);
    // `resources` filters by resource/directory name (== clientAccessor for
    // new resources) — matches what /plan returns as `resource`.
    const models = body.resources?.length
      ? allModels.filter((m) => body.resources!.includes(m.clientAccessor))
      : allModels;

    const resolveRelationResource = await makeRelationResolver(loaded);
    const diffs = await buildResourceDiffs(models, {
      database: ds.name,
      ruleset: resolveRuleset(loaded.config),
      resolveRelationResource,
      readExisting: (name) => readExistingResource(loaded, name),
    });
    const applyCtx = this.buildApplyContext(loaded, ds);

    const results: {
      resource: string;
      written: string[];
      skipped: string[];
    }[] = [];
    for (const diff of diffs) {
      const resolved = await resolveDiff(diff, recommendedResolver);
      const writePlan = applyDiff(resolved, applyCtx);
      if (writePlan.files.length === 0) continue;
      const result = await commit(writePlan);
      results.push({ resource: diff.name, ...result });
    }

    return { results };
  }
}
