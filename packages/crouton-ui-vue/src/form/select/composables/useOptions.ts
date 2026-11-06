// ─── Helpers ─────────────────────────────────────────────────────────────────
import type { Ref } from 'vue';
import { ref } from 'vue';

import type { OptionValue } from '../ListResults.properties';

type OptionsProperties = {
  labelKey: string;
  valueKey: string;
};

export const getLabel = (item: unknown, props: OptionsProperties) => {
  if (!item) return undefined;
  return typeof item === 'object' ? (item as Record<string, unknown>)[props.labelKey] : item;
};

const getValue = (item: unknown, props: OptionsProperties) => {
  if (!item) return undefined;
  return typeof item === 'object' ? (item as Record<string, unknown>)[props.valueKey] : item;
};

type OptionsStrategy<ITEM> = {
  options: Ref<OptionValue[]>;

  setOptions: (options: ITEM[] | undefined) => void;
  getOption: (options: ITEM) => OptionValue | undefined;
  getOriginal: (options: OptionValue) => ITEM | undefined;
  getOriginals: (...options: OptionValue[]) => ITEM[];
  getLabels: (...options: ITEM[]) => string[];
  getValues: (...options: ITEM[]) => string[];
};

const DefaultOptionsStrategy = <ITEM>(
  props: OptionsProperties,
): OptionsStrategy<ITEM> => {
  const options = ref<OptionValue[]>([]);
  const originalMap = new Map<string, ITEM>();
  const optionMap = new Map<string, OptionValue>();

  const setOptions = (_options: ITEM[] | undefined) => {
    const optionList = [] as OptionValue[];
    originalMap.clear();
    optionMap.clear();

    _options?.forEach((option) => {
      const optionValue: OptionValue = {
        value: getValue(option, props),
        label: getLabel(option, props),
        ...((option as Record<string, unknown>)?.['disabled'] !== undefined && { disabled: !!(option as Record<string, unknown>)['disabled'] }),
      };

      originalMap.set(optionValue.value, option);
      optionMap.set(optionValue.value, optionValue);

      optionList.push(optionValue);
    });

    options.value = optionList;
  };

  const getOriginal = (option: OptionValue): ITEM | undefined => {
    return originalMap.get(option.value);
  };

  const getOriginals = (...optionList: OptionValue[]): ITEM[] => {
    return optionList.map(getOriginal).filter(Boolean) as ITEM[];
  };

  const getOption = (option: ITEM): OptionValue | undefined => {
    const val = getValue(option, props);
    return val != null ? optionMap.get(String(val)) : undefined;
  };

  const getLabels = (...optionList: ITEM[]): string[] => {
    return optionList.map((option) => {
      // When storeValue is used, the stored value is a primitive — look up label from optionMap.
      if (option !== null && option !== undefined && typeof option !== 'object') {
        return optionMap.get(String(option))?.label ?? String(option);
      }
      return getLabel(option, props);
    });
  };

  const getValues = (...optionList: ITEM[]): string[] => {
    return optionList.map((option) => getValue(option, props));
  };

  return {
    options,
    setOptions,
    getOriginal,
    getLabels,
    getValues,
    getOption,
    getOriginals,
  };
};

export const useOptions = <ITEM = unknown>(props: OptionsProperties) => {
  const strategy = DefaultOptionsStrategy<ITEM>(props);

  return strategy;
};
