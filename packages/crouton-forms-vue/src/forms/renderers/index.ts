import { arrayRenderers } from './array/ArrayRenderers';
import { controlRenderers } from './controls';
import { readonlyControlRenderers } from './controls/readonly';
import {
  layoutRenderers,
  readonlyLayoutRenderers,
} from './layout/LayoutRenderers';

export * from './controls';
export * from './controls/composables/useControlBinding';

export const customRenderers = [
  layoutRenderers,
  controlRenderers,
  arrayRenderers,
].flat();

export const readonlyRenderers = [
  readonlyLayoutRenderers,
  readonlyControlRenderers,
  arrayRenderers,
].flat();
