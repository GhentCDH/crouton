import type { FieldType } from '@ghentcdh/crouton-core';

type EnumValue = { value: unknown; label: string };

export type FieldOption = {
  label: string;
  value: string;
  type?: FieldType;
  values?: EnumValue[];
};
