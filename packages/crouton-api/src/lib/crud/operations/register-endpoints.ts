import { type OperationContext } from './operation-context';
import {
  registerActionRoutes,
  registerTableActionRoutes,
} from './register-actions';
import { childCreate, registerCreate } from './register-create';
import { registerUpsert } from './register-crud';
import { deleteChild, registerDelete } from './register-delete';
import { childFindAll, registerFindAll } from './register-findall';
import { childFindOne, registerFindOne } from './register-findone';
import { childPatch, registerPatch } from './register-patch';
import {
  registerDefinitionEndpoint,
  registerResourceColumnsEndpoint,
  registerResourceJsonEndpoint,
  registerResourceJsonPatchEndpoint,
  registerResourceJsonRawGetEndpoint,
  registerResourceJsonRawPutEndpoint,
} from './register-schema-endpoints';
import { childSchemas, registerSchemas } from './register-schemas';
import { childUpdate, registerUpdate } from './register-update';
import type { SubResourceConfig } from '../resource/SubResource.schema';

export const registerEndpoints = (ctx: OperationContext): void => {
  // ── Register operations (order matters: static routes before :id routes) ──
  registerFindAll(ctx);
  registerDefinitionEndpoint(ctx);
  registerSchemas(ctx);
  registerResourceJsonEndpoint(ctx);
  registerResourceColumnsEndpoint(ctx);
  registerResourceJsonPatchEndpoint(ctx);
  registerResourceJsonRawGetEndpoint(ctx);
  registerResourceJsonRawPutEndpoint(ctx);
  registerActionRoutes(ctx);
  registerTableActionRoutes(ctx);
  registerSubResourceRoutes(ctx);
  registerFindOne(ctx);
  registerCreate(ctx);
  registerUpdate(ctx);
  registerPatch(ctx);
  registerUpsert(ctx);
  registerDelete(ctx);
};

/** Register all routes for all sub-resources (schemas endpoint + CRUD). */
export const registerSubResourceRoutes = (ctx: OperationContext): void => {
  for (const sub of ctx.config.subResources ?? []) {
    registerSubResourceEndpoints(ctx, sub);
  }
};

export const registerSubResourceEndpoints = (
  ctx: OperationContext,
  sub: SubResourceConfig,
): void => {
  registerSchemas(ctx, childSchemas(sub));
  registerFindAll(ctx, childFindAll(sub));
  registerFindOne(ctx, childFindOne(sub));
  registerCreate(ctx, childCreate(sub));
  registerUpdate(ctx, childUpdate(sub));
  registerPatch(ctx, childPatch(sub));
  registerDelete(ctx, deleteChild(sub));
};