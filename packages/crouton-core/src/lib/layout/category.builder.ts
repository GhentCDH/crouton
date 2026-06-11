import { BuilderWithElements } from './builder';
import type { ElementBuilder } from './layout.builder';

type Rule = {
  effect: 'SHOW';
  condition: any;
};
export type CategoryType<TYPE> = {
  type: 'Category';
  label: string;
  elements?: ElementBuilder<TYPE>[];
  rule?: Rule;
};

export class CategoryBuilder<TYPE> extends BuilderWithElements<
  CategoryType<TYPE>,
  TYPE
> {
  private rule: Rule = {
    effect: 'SHOW',
    condition: {},
  };

  private constructor(private readonly label: string) {
    super(label);
  }

  static label(label: string) {
    return new CategoryBuilder(label);
  }

  override build(): CategoryType<TYPE> {
    return {
      type: 'Category',
      label: this.label,
      rule: this.rule,
      elements: this.buildElements(),
    } as unknown as CategoryType<TYPE>;
  }
}
