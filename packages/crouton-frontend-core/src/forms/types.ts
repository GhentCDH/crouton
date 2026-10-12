export type { JsonSchema } from '@jsonforms/core';

export interface UiElementOptions {
  format?: string;
  colspan?: number;
  styles?: { width?: string; control?: { wrapper?: string } };
  uri?: string;
  valueKey?: string;
  labelKey?: string;
  enableCreate?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  label?: string;
  hideLabel?: boolean;
  readonly?: boolean;
  visible?: boolean;
  layout?: 'row' | 'column';
  hideActions?: boolean;
  dataField?: string;
  skipAuth?: boolean;
  type?: string;
}

export interface UiElement {
  type:
    | 'Control'
    | 'GridLayout'
    | 'VerticalLayout'
    | 'HorizontalLayout'
    | 'CollapseLayout';
  scope?: string;
  elements?: UiElement[];
  options?: UiElementOptions;
  label?: string;
}
