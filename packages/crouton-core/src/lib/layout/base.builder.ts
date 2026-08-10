import type {
  Layout,
  Rule,
  RuleEffect,
  SchemaBasedCondition,
  UISchemaElement,
} from '@jsonforms/core';

import type { CroutonElementOptions, CroutonLayoutOptions } from './layout.options';

/** Anything that can be built into a JSON Forms UI-schema element. */
export type Buildable = { build(): UISchemaElement };

/**
 * Options for the string form of `addControl`. `type` selects the control format
 * (e.g. `textarea`, `boolean`, `relation`); omit it for a plain control. Every other
 * key is a normal element option (`label`, `colspan`, `styles`).
 */
export type ControlShortcut = CroutonElementOptions & { type?: string };

/** Effect names for a rule; kept as string literals so no runtime enum import is needed. */
export type RuleEffectName = 'SHOW' | 'HIDE' | 'ENABLE' | 'DISABLE';

/** Minimal base: a typed discriminator plus a `build()` contract. */
export abstract class Builder<OUT> {
  protected constructor(protected readonly type: string) {}
  abstract build(): OUT;
}

/**
 * Base for elements that carry a typed `options` bag and an optional JSON Forms `rule`.
 *
 * `label` / `colspan` and the `showWhen` / `hideWhen` / `disableWhen` helpers are shared by
 * every layout and control, so labels and conditional rules are expressed in the builder
 * chain instead of being mutated onto the built object afterwards.
 */
export abstract class ElementBuilder<
  OUT extends UISchemaElement,
  OPT extends CroutonElementOptions = CroutonElementOptions,
> extends Builder<OUT> {
  protected options: Partial<OPT> = {};
  protected _rule?: Rule;

  label(label: string): this {
    return this.opt({ label } as Partial<OPT>);
  }

  colspan(colspan: number): this {
    return this.opt({ colspan } as Partial<OPT>);
  }

  showWhen(scope: string, schema: Record<string, unknown>): this {
    return this.rule('SHOW', scope, schema);
  }

  hideWhen(scope: string, schema: Record<string, unknown>): this {
    return this.rule('HIDE', scope, schema);
  }

  disableWhen(scope: string, schema: Record<string, unknown>): this {
    return this.rule('DISABLE', scope, schema);
  }

  rule(effect: RuleEffectName, scope: string, schema: Record<string, unknown>): this {
    this._rule = {
      effect: effect as RuleEffect,
      condition: { scope, schema } as SchemaBasedCondition,
    };
    return this;
  }

  /** Merge a patch into the typed options bag. */
  opt(patch: Partial<OPT>): this {
    this.options = { ...this.options, ...patch };
    return this;
  }

  /** `options` / `rule` fields, emitted only when non-empty. */
  protected baseFields(): { options?: Partial<OPT>; rule?: Rule } {
    return {
      ...(Object.keys(this.options).length ? { options: this.options } : {}),
      ...(this._rule ? { rule: this._rule } : {}),
    };
  }
}

/**
 * Base for layouts that hold child elements. Exposes the overloaded `addControl` /
 * `addControls` surface: pass a fully-configured builder, or a bare property name (with
 * optional shortcut options). Each concrete container turns a shortcut into its own leaf
 * builder via `resolveShortcut`, so this base never imports a control/cell builder and
 * there is no dependency cycle.
 */
export abstract class ContainerBuilder<
  OUT extends Layout,
  OPT extends CroutonLayoutOptions = CroutonLayoutOptions,
> extends ElementBuilder<OUT, OPT> {
  protected children: Buildable[] = [];

  /** Turn a shortcut (property name + options) into a concrete leaf builder. */
  protected abstract resolveShortcut(name: string, options?: ControlShortcut): Buildable;

  addControl(builder: Buildable): this;
  addControl(name: string, options?: ControlShortcut): this;
  addControl(arg: string | Buildable, options?: ControlShortcut): this {
    this.children.push(
      typeof arg === 'string' ? this.resolveShortcut(arg, options) : arg,
    );
    return this;
  }

  addControls(...builders: Buildable[]): this;
  addControls(map: Record<string, ControlShortcut | undefined>): this;
  addControls(
    first: Buildable | Record<string, ControlShortcut | undefined>,
    ...rest: Buildable[]
  ): this {
    if (first && typeof first === 'object' && !('build' in first)) {
      for (const [name, options] of Object.entries(first)) {
        this.addControl(name, options);
      }
    } else if (first) {
      for (const builder of [first as Buildable, ...rest]) {
        this.addControl(builder);
      }
    }
    return this;
  }

  protected buildElements(): UISchemaElement[] {
    return this.children.map((child) => child.build());
  }
}
