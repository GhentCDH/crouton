import type { ControlVariant } from './control-variant';
import { stringVariants } from './string.variants';

/** Registry for the isolated /controls/:control e2e test page. */
export const controlVariants: Record<string, ControlVariant[]> = {
  string: stringVariants,
};
