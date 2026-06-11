import { BuilderWithElements } from './builder';
import type { ElementBuilder } from './layout.builder';

export type GroupType<TYPE> = {
  type: 'Group';
  label: string;
  elements?: ElementBuilder<TYPE>[];
};

export class GroupBuilder<TYPE> extends BuilderWithElements<
  GroupType<TYPE>,
  TYPE
> {
  private constructor(private readonly label: string) {
    super(label);
  }

  static label(label: string) {
    return new GroupBuilder(label);
  }

  override build(): GroupType<TYPE> {
    return {
      type: 'Group',
      label: this.label,
      elements: this.buildElements(),
    } as unknown as GroupType<TYPE>;
  }
}
