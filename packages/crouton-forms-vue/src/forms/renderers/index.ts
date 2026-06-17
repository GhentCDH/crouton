import { arrayRenderers } from './array/ArrayRenderers';
import { controlRenderers } from './controls';
import { readonlyControlRenderers } from './controls/readonly';
import { layoutRenderers } from './layout/LayoutRenderers';

export * from './array/ArrayRenderers';
export * from './controls';
export * from './controls/composables/useControlBinding';
export * from './controls/readonly';
export * from './layout/LayoutRenderers';

export const customRenderers = [
  layoutRenderers,
  controlRenderers,
  arrayRenderers,
].flat();

export const readonlyRenderers = [
  layoutRenderers,
  readonlyControlRenderers,
  arrayRenderers,
].flat();
