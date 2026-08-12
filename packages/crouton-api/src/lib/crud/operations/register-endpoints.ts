import { type OperationContext } from './operation-context';
import {
  registerActionRoutes,
  registerTableActionRoutes,
} from './register-actions';
import {
  registerCreate,
  registerFindOne,
  registerPatch,
  registerUpdate,
  registerUpsert,
} from './register-crud';
import { deleteChild, registerDelete } from './register-delete';
import { childFindAll, registerFindAll } from './register-findall';
import {
  registerDefinitionEndpoint,
  registerResourceColumnsEndpoint,
  registerResourceJsonEndpoint,
  registerResourceJsonPatchEndpoint,
  registerResourceJsonRawGetEndpoint,
  registerResourceJsonRawPutEndpoint,
  registerSchemasEndpoint,
} from './register-schema-endpoints';
import { registerSubResourceRoute } from './register-sub-resources';
import type { SubResourceConfig } from '../resource/SubResource.schema';

export const registerEndpoints = (ctx: OperationContext): void => {
  // ── Register operations (order matters: static routes before :id routes) ──
  registerFindAll(ctx);
  registerDefinitionEndpoint(ctx);
  registerSchemasEndpoint(ctx);
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
  registerFindAll(ctx, childFindAll(sub));
  registerDelete(ctx, deleteChild(sub));
  registerSubResourceRoute(ctx, sub);
};
