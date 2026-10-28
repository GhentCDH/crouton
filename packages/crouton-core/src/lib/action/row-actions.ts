import {
  type ResourceRowAction,
  type ResourceTableAction,
  isRowProcedureAction,
  isTableProcedureAction,
} from './action.types';

type WithActions = {
  actions?: ResourceRowAction[];
  tableActions?: ResourceTableAction[];
};

export const getRowActions = (resource: WithActions): ResourceRowAction[] =>
  resource.actions ?? [];

export const getTableActions = (resource: WithActions): ResourceTableAction[] =>
  resource.tableActions ?? [];

export const getRowProcedureActions = (resource: WithActions) =>
  getRowActions(resource).filter(isRowProcedureAction);

export const getTableProcedureActions = (resource: WithActions) =>
  getTableActions(resource).filter(isTableProcedureAction);
