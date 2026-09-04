import type { Layout } from '@jsonforms/core';

import type { Buildable, ControlShortcut } from './base.builder';
import { ContainerBuilder } from './base.builder';
import { ControlBuilder } from './control.builder';
import type { ControlOption } from './control.builder';
import { LayoutType } from './layout.options';
import type { CroutonLayoutOptions } from './layout.options';

/**
 * Property name for the `addControl` shortcut. Known keys of `TYPE` get autocomplete and
 * typo-checking; any string is still accepted so the shortcut works without a generic.
 */
type Name<TYPE> = (keyof TYPE & string) | (string & {});

export class LayoutBuilder<TYPE = Record<string, unknown>> extends ContainerBuilder<
  Layout,
  CroutonLayoutOptions
> {
  private constructor(type: string) {
    super(type);
  }

  static horizontal<TYPE = Record<string, unknown>>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutType.Horizontal);
  }

  static vertical<TYPE = Record<string, unknown>>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutType.Vertical);
  }

  static grid<TYPE = Record<string, unknown>>(columns?: number): LayoutBuilder<TYPE> {
    const layout = new LayoutBuilder<TYPE>(LayoutType.Grid);
    return columns === undefined ? layout : layout.opt({ columns });
  }

  static collapse<TYPE = Record<string, unknown>>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutType.Collapse);
  }

  static group<TYPE = Record<string, unknown>>(): LayoutBuilder<TYPE> {
    return new LayoutBuilder<TYPE>(LayoutType.Group);
  }

  /** Collapse layout title. */
  title(title: string): this {
    return this.opt({ title });
  }

  /** Collapse layout: resolve the title from a field value at render time. */
  titleKey(titleKey: string): this {
    return this.opt({ titleKey });
  }

  // Narrow the shortcut name to TYPE's keys (still accepts any string).
  override addControl(builder: Buildable): this;
  override addControl(name: Name<TYPE>, options?: ControlShortcut): this;
  override addControl(arg: string | Buildable, options?: ControlShortcut): this {
    return super.addControl(arg as string, options);
  }

  protected resolveShortcut(name: string, options?: ControlShortcut): Buildable {
    const control = ControlBuilder.properties<TYPE>(name as keyof TYPE);
    if (options) {
      const { type, ...rest } = options;
      if (type) control.control(type, rest);
      else if (Object.keys(rest).length) control.opt(rest as Partial<ControlOption>);
    }
    return control;
  }

  override build(): Layout {
    return {
      type: this.type,
      elements: this.buildElements(),
      ...this.baseFields(),
    };
  }
}
