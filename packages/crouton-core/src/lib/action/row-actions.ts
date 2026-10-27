import { type ResourceJson } from '../resource';
import { isRowProcedureAction, isTableProcedureAction } from './action.types';

export const getRowActions = (resource: ResourceJson) => {
  // should come from resource.layout  the row actions

  return [];
};

export const getRowProcedureAction = (resource: ResourceJson) => {
  return getRowActions(resource).filter(isRowProcedureAction);
};

export const getTableProcedureActions = (resource: ResourceJson) => {
  return getRowActions(resource).filter(isTableProcedureAction);
};
