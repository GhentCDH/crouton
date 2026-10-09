import { type Ref, computed } from 'vue';

export const useFilter = (
  items: Ref<Array<Record<string, any>>>,
  modelValue: Ref<Array<any>>,
  valueKey: Ref<string>,
  emit: (event: 'update:modelValue', value: Array<any>) => void,
) => {
  const allIds = computed(() =>
    items.value.map((item) => item[valueKey.value]),
  );

  const isSelected = (id: any) => modelValue.value.includes(id);

  const selectedLabel = computed(() => {
    const count = modelValue.value.length;
    if (count === 0) return 'None';
    if (count === allIds.value.length) return 'All';
    return `${count}`;
  });

  const selectAll = () => emit('update:modelValue', [...allIds.value]);

  const selectNone = () => emit('update:modelValue', []);

  const toggleItem = (id: any, checked: boolean) => {
    if (checked) {
      emit('update:modelValue', [...modelValue.value, id]);
    } else {
      emit(
        'update:modelValue',
        modelValue.value.filter((v) => v !== id),
      );
    }
  };

  return { isSelected, selectedLabel, selectAll, selectNone, toggleItem };
};
