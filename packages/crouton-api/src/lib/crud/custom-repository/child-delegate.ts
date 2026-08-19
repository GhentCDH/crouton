import { NotImplementedException } from '@nestjs/common';

import { type ListRequest, offsetOf } from '@ghentcdh/crouton-core';

import { type CustomOp, PARENT_METHOD } from './custom-repository.types';
import type { Resource } from '../resource/ResourceConfig.schema';
import type { SubResourceConfig } from '../resource/SubResource.schema';

/**
 * Delegation to a **custom sub-resource's** own repository.
 *
 * A sub-resource is declared by a relation column on the parent and served
 * through the parent's controller, but a `kind: "custom"` child owns its data
 * access and has no Prisma model to query. The parent's repositories therefore
 * call the child's `repository.ts` instead of `prisma[childModel]`.
 *
 * The child implements the same parent-aware operations a top-level nested
 * resource does (`findAllByParent`, `createByParent`, …), so one contract covers
 * both ways of nesting.
 *
 * Shared by ReadRepository and WriteRepository so the two cannot drift.
 */

/** Resolve the child's method for `op`, or throw naming what is missing. */
export const childRepositoryFn = (
  sub: SubResourceConfig,
  op: CustomOp,
  parentName: string,
): ((...args: any[]) => Promise<any>) => {
  const repo = sub.repository as Record<string, any> | undefined;
  const method = PARENT_METHOD[op];

  if (!repo) {
    throw new NotImplementedException(
      `Sub-resource "${sub.childRoute}" of "${parentName}" is a custom resource but no repository.ts was loaded for it.`,
    );
  }

  // `patch` falls back to the update variant, matching every other path.
  const fn =
    repo[method] ??
    (op === 'patch' ? repo[PARENT_METHOD.update] : undefined);

  if (typeof fn !== 'function') {
    throw new NotImplementedException(
      `Sub-resource "${sub.childRoute}" of "${parentName}" does not implement "${method}" in its repository.ts.`,
    );
  }
  return fn.bind(repo);
};

/** Context handed to a custom child's repository. */
export const childCtx = ({
  parentConfig,
  prisma,
  op,
  parentId,
  params,
  id,
  request,
}: {
  parentConfig: Resource;
  prisma: any;
  op: CustomOp;
  parentId: string | number;
  params?: ListRequest;
  id?: string | number;
  request?: any;
}): any => ({
  prisma,
  dataSources: { resolve: () => prisma, entries: () => [] },
  config: parentConfig,
  op,
  offset: params ? offsetOf(params) : 0,
  ...(id !== undefined && { id }),
  ...(request !== undefined && { request }),
  // Served under the parent's `:id`, so that is the param name here — unlike a
  // top-level nested resource, which names its own param.
  parent: { route: parentConfig.route, param: 'id', id: parentId },
});

/**
 * Parent id for a child write.
 *
 * `updateChild`/`deleteChild` are called without it — the route binds it as
 * `:id`, so it is read back off the request the handler already receives.
 */
export const parentIdFromRequest = (
  request: any,
  fallback?: string | number,
): string | number | undefined => {
  const raw = request?.params?.id;
  return raw === undefined || raw === null || raw === '' ? fallback : raw;
};
