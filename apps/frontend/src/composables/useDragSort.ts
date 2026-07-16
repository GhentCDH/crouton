import { ref } from 'vue';

export const useDragSort = (onReorder: (fromIndex: number, toIndex: number) => void) => {
  const dragIndex = ref<number | null>(null);
  const dragOverIndex = ref<number | null>(null);

  const onDragStart = (event: DragEvent, index: number) => {
    dragIndex.value = index;
    event.dataTransfer!.effectAllowed = 'move';
  };

  const onDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    dragOverIndex.value = index;
  };

  const onDragLeave = () => {
    dragOverIndex.value = null;
  };

  const onDrop = (event: DragEvent, targetIndex: number) => {
    event.preventDefault();
    const sourceIndex = dragIndex.value;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    onReorder(sourceIndex, targetIndex);
    dragIndex.value = null;
    dragOverIndex.value = null;
  };

  const onDragEnd = () => {
    dragIndex.value = null;
    dragOverIndex.value = null;
  };

  return {
    dragIndex,
    dragOverIndex,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  };
};
