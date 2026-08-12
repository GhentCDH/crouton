import { type OperationContext } from './operation-context';
import {
  registerActionRoutes,
  registerTableActionRoutes,
} from './register-actions';
import { registerCreate } from './register-create';
import { registerDelete } from './register-delete';
import { childFindAll, registerFindAll } from './register-findall';
import { childFindOne, registerFindOne } from './register-findone';
import { registerPatch } from './register-patch';
import {
  registerDefinitionEndpoint,
  registerResourceColumnsEndpoint,
  registerResourceJsonEndpoint,
  registerResourceJsonPatchEndpoint,
  registerResourceJsonRawGetEndpoint,
  registerResourceJsonRawPutEndpoint,
} from './register-schema-endpoints';
import { registerSchemas } from './register-schemas';
import { registerUpdate } from './register-update';
import type { SubResourceConfig } from '../resource/SubResource.schema';

export const registerEndpoints = (ctx: OperationContext): void => {
  // ── Register operations (order matters: static routes before :id routes) ──
  //first register subresource routes
  registerSubResourceRoutes(ctx);
  //register other routes
  registerFindAll(ctx);
  registerResourceJsonRawGetEndpoint(ctx);
  registerResourceJsonRawPutEndpoint(ctx);

  registerDefinitionEndpoint(ctx);
  registerEndpoint(ctx);
  registerResourceJsonEndpoint(ctx);
  registerResourceColumnsEndpoint(ctx);
  registerResourceJsonPatchEndpoint(ctx);
  registerActionRoutes(ctx);
  registerTableActionRoutes(ctx);
};

/** Register all routes for all sub-resources (schemas endpoint + CRUD). */
export const registerSubResourceRoutes = (ctx: OperationContext): void => {
  for (const sub of ctx.config.subResources ?? []) {
    registerEndpoint(ctx, sub);
  }
};

export const registerEndpoint = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  registerSchemas(ctx, sub);
  registerFindAll(ctx, sub);
  registerFindOne(ctx, sub);
  registerCreate(ctx, sub);
  registerUpdate(ctx, sub);
  registerPatch(ctx, sub);
  registerDelete(ctx, sub);
};
