import { BuilderWithElements } from './builder';
import type { CategoryBuilder } from './category.builder';
import type { ControlBuilder, ControlTypes } from './control.builder';
import type { GroupBuilder } from './group.builder';
import type { TextCellBuilder } from '../table/builder';

export type ElementBuilder<TYPE> =
  | ControlBuilder<TYPE>
  | LayoutBuilder<TYPE>
  | CategoryBuilder<TYPE>
  | GroupBuilder<TYPE>
  | TextCellBuilder<TYPE>;

export const LayoutTypes = {
  HorizontalLayout: 'HorizontalLayout',
  VerticalLayout: 'VerticalLayout',
  CollapseLayout: 'CollapseLayout',
  GridLayout: 'GridLayout',
} as const;

type _LayoutTypes = (typeof LayoutTypes)[keyof typeof LayoutTypes];

export type LayoutType = {
  type: 'LayoutTypes';
  elements: Array<ControlTypes | LayoutType>;
};

export class LayoutBuilder<TYPE> extends BuilderWithElements<LayoutType, TYPE> {
  private options: any;

  protected constructor(type: _LayoutTypes, options = {}) {
    super(type);
    this.options = options;
  }

  static horizontal<TYPE>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutTypes.HorizontalLayout);
  }
  static collapse<TYPE>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutTypes.CollapseLayout);
  }

  static vertical<TYPE>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutTypes.VerticalLayout);
  }

  static grid<TYPE>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutTypes.GridLayout);
  }

  titleKey(titleKey: string) {
    return this.addOptions({ titleKey });
  }

  title(title: string) {
    return this.addOptions({ title });
  }

  private addOptions(options: Partial<any>) {
    this.options = {
      ...this.options,
      ...options,
    };
    return this;
  }

  override build(): LayoutType {
    return {
      type: this.type,
      elements: this.buildElements(),
      options: this.options,
    } as LayoutType;
  }
}
