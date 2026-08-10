import type { Layout } from '@jsonforms/core';

import { Builder, ContainerBuilder } from '../layout/base.builder';
import type { Buildable } from '../layout/base.builder';
import { LayoutType } from '../layout/layout.options';
import type { CroutonLayoutOptions } from '../layout/layout.options';

export interface TextCellOption {
  format: 'TextCell';
  sortId?: string;
  sortable?: boolean;
}

export interface KeyValueOption extends Omit<TextCellOption, 'format'> {
  format: 'keyValue';
  key: string;
}

export type TextCellType = {
  type: 'TextCell';
  scope: string;
  options?: KeyValueOption;
};
export class TextCellBuilder<TYPE> extends Builder<TextCellType> {
  private options: KeyValueOption | TextCellOption | undefined;

  protected constructor(
    private readonly scope: string,
    type = 'TextCell',
  ) {
    super(type);
  }

  static properties<TYPE>(property: keyof TYPE): TextCellBuilder<TYPE> {
    return new TextCellBuilder<TYPE>(`#/properties/${property as string}`);
  }

  key(key: string): TextCellBuilder<TYPE> {
    this.options = {
      format: 'keyValue',
      key: key,
    };
    return this;
  }

  setSortId(sortId: string): TextCellBuilder<TYPE> {
    this.options = {
      ...(this.options ?? { format: this.type as TextCellOption['format'] }),
      sortId: sortId,
    };
    return this;
  }

  override build(): TextCellType {
    return {
      type: this.type,
      scope: this.scope,
      options: this.options,
    } as TextCellType;
  }
}

export class BooleanCellBuilder extends TextCellBuilder<boolean> {
  protected constructor(scope: string) {
    super(scope, 'BooleanCell');
  }
  static override properties<TYPE>(property: keyof TYPE): BooleanCellBuilder {
    return new BooleanCellBuilder(`#/properties/${property as string}`);
  }
}

/**
 * Builds a `HorizontalLayout` of table cells. Shares the overloaded
 * `addControl` / `addControls` surface with `LayoutBuilder`; its shortcut form
 * resolves to a `TextCellBuilder` instead of a form control.
 */
export class TableBuilder<TYPE = Record<string, unknown>> extends ContainerBuilder<
  Layout,
  CroutonLayoutOptions
> {
  private constructor() {
    super(LayoutType.Horizontal);
  }

  static init<TYPE = Record<string, unknown>>(): TableBuilder<TYPE> {
    return new TableBuilder<TYPE>();
  }

  protected resolveShortcut(name: string): Buildable {
    return TextCellBuilder.properties<TYPE>(name as keyof TYPE);
  }

  override build(): Layout {
    return {
      type: this.type,
      elements: this.buildElements(),
      ...this.baseFields(),
    };
  }
}
