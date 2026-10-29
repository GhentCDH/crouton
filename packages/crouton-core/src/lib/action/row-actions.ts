import {
  type ResourceRowAction,
  type ResourceTableAction,
  isRowProcedureAction,
  isTableProcedureAction,
} from './action.types';
import { type CompiledResource } from '../compile';
import { resolveTableNode } from '../layout/layout-table-order';

/**
 * Every action declared in the layout is a runtime action at heart: the only
 * difference is `procedure`, which holds a file name until the API loader
 * resolves it in place. Cast through `unknown[]` with a typed helper — valid
 * at runtime once the loader has run.
 */
const toActionList = <T>(actions: readonly unknown[] | undefined): T[] =>
  (actions ?? []) as T[];

/**
 * Actions live on the table layout node — the single source of truth.
 *
 * At compile time the actions are plain `JsonAction`s (`procedure` is a file
 * name). The API loader resolves each procedure module in place on that same
 * node, so at runtime these arrays carry the loaded procedures.
 */
export const getRowActions = (
  resource: CompiledResource,
): ResourceRowAction[] =>
  toActionList<ResourceRowAction>(resolveTableNode(resource.layout?.table)?.rowActions);

export const getTableActions = (
  resource: CompiledResource,
): ResourceTableAction[] =>
  toActionList<ResourceTableAction>(
    resolveTableNode(resource.layout?.table)?.tableActions,
  );

export const getRowProcedureActions = (resource: CompiledResource) =>
  getRowActions(resource).filter(isRowProcedureAction);

export const getTableProcedureActions = (resource: CompiledResource) =>
  getTableActions(resource).filter(isTableProcedureAction);
