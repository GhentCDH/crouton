<template>
  <ControlWrapper v-bind="wrapperProps">
    <div ref="rootRef" class="dropdown" :class="{ 'dropdown-open': open }">
      <div class="flex items-center gap-1">
        <input
          :id="id"
          ref="inputRef"
          :class="[inputClass, width]"
          :type="withTime ? 'datetime-local' : 'date'"
          :value="inputValue"
          :min="boundMin"
          :max="boundMax"
          :disabled="!enabled"
          :placeholder="placeholder"
          :aria-invalid="!!errors"
          autocomplete="off"
          data-lpignore="true"
          data-bwignore="true"
          @input="onInput(($event.target as HTMLInputElement).value)"
          @blur="$emit('blur', $event)"
          @keydown.esc="close"
        />
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!enabled"
          :aria-expanded="open"
          aria-haspopup="dialog"
          :aria-label="open ? 'Hide calendar' : 'Show calendar'"
          @click="toggle"
        >
          <svg
            class="size-4 fill-none stroke-current"
            viewBox="0 0 24 24"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
        </button>
      </div>

      <div
        v-if="open"
        class="dropdown-content rounded-box bg-base-100 z-10 mt-1 w-72 p-3 shadow-lg"
        role="dialog"
        aria-modal="false"
        :aria-label="label ?? 'Choose a date'"
      >
        <div class="mb-2 flex items-center justify-between gap-1">
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square"
            aria-label="Previous month"
            @click="page(-1)"
          >
            <svg
              class="size-4 fill-none stroke-current"
              viewBox="0 0 24 24"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <span class="text-sm font-semibold" aria-live="polite">{{
            heading
          }}</span>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square"
            aria-label="Next month"
            @click="page(1)"
          >
            <svg
              class="size-4 fill-none stroke-current"
              viewBox="0 0 24 24"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>

        <div
          class="grid grid-cols-7 gap-0.5"
          role="grid"
          @keydown="onGridKeydown"
        >
          <span
            v-for="weekday in weekdays"
            :key="weekday"
            class="text-base-content/60 py-1 text-center text-[0.65rem] font-semibold uppercase"
            role="columnheader"
            :aria-label="weekday"
            >{{ weekday }}</span
          >

          <button
            v-for="cell in cells"
            :key="cell.key"
            type="button"
            class="btn btn-xs btn-square"
            :class="cellClass(cell)"
            :data-key="cell.key"
            :disabled="cell.disabled"
            :tabindex="cell.key === focusKey ? 0 : -1"
            :aria-selected="cell.isSelected"
            :aria-current="cell.isToday ? 'date' : undefined"
            role="gridcell"
            @click="select(cell)"
          >
            {{ cell.day }}
          </button>
        </div>

        <div class="mt-2 flex justify-between gap-2">
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            :disabled="!todaySelectable"
            @click="selectToday"
          >
            Today
          </button>
          <button
            v-if="clearable"
            type="button"
            class="btn btn-ghost btn-xs"
            :disabled="!modelValue"
            @click="clear"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  </ControlWrapper>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import {
  addClickOutsideEventListener,
  ControlWrapper,
  removeClickOutsideEventListener,
} from '@ghentcdh/ui';

import {
  DATE_PICKER_OWN_PROPS,
  DatePickerEmits,
  DatePickerProperties,
} from './DatePicker.properties';
import {
  buildMonthGrid,
  composeIso,
  type DateGridCell,
  fromInputValue,
  isWithinBounds,
  monthLabel,
  shiftMonth,
  toDateKey,
  toInputValue,
  weekdayLabels,
} from './useDateModel';
import { parseDate } from '../readonly/displayValue/formatDate';

const props = defineProps(DatePickerProperties);
const emit = defineEmits(DatePickerEmits);

const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const open = ref(false);
/** `yyyy-MM-dd` of the cell holding the roving tabindex while the popover is open. */
const focusKey = ref<string | null>(null);

const selectedDate = computed(() => parseDate(props.modelValue));

/** The month the popover opens on: the selected day, else today. */
const initialView = () => {
  const base = parseDate(props.modelValue) ?? new Date();

  return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
};

/** The month currently on screen. Follows the value, but the user can page away. */
const view = ref(initialView());

/**
 * Everything except this component's own props, so the label / error /
 * description / width behaviour is handled by ControlWrapper and nothing leaks
 * onto the fieldset as a stray attribute. Filtering by our own key list keeps
 * this independent of what `@ghentcdh/ui` exports at runtime.
 */
const OWN_PROPS = new Set<string>(DATE_PICKER_OWN_PROPS);

const wrapperProps = computed(() =>
  Object.fromEntries(
    Object.entries(props).filter(([key]) => !OWN_PROPS.has(key)),
  ),
);

const inputClass = computed(
  () => (props.styles as any)?.control?.input ?? 'input',
);

const inputValue = computed(() =>
  toInputValue(props.modelValue, props.withTime),
);
const boundMin = computed(
  () => toInputValue(props.min, props.withTime) || undefined,
);
const boundMax = computed(
  () => toInputValue(props.max, props.withTime) || undefined,
);

const cells = computed(() =>
  buildMonthGrid({
    year: view.value.year,
    month: view.value.month,
    selected: props.modelValue,
    min: props.min,
    max: props.max,
    firstDayOfWeek: props.firstDayOfWeek,
  }),
);

const weekdays = computed(() =>
  weekdayLabels(props.locale, props.firstDayOfWeek),
);

const heading = computed(() =>
  monthLabel(view.value.year, view.value.month, props.locale),
);

const todaySelectable = computed(() =>
  isWithinBounds(new Date(), props.min, props.max),
);

const cellClass = (cell: DateGridCell) => {
  if (cell.isSelected) return 'btn-primary';
  if (cell.isToday) return 'btn-ghost btn-outline';
  if (!cell.inMonth) return 'btn-ghost text-base-content/40';

  return 'btn-ghost';
};

let clickOutsideListener: ReturnType<typeof addClickOutsideEventListener> =
  null;

const teardownClickOutside = () => {
  if (!clickOutsideListener) return;
  removeClickOutsideEventListener(clickOutsideListener);
  clickOutsideListener = null;
};

const close = () => {
  if (!open.value) return;
  open.value = false;
  focusKey.value = null;
  teardownClickOutside();
};

const emitValue = (next: string | undefined) => {
  emit('update:modelValue', next);
  emit('change', next);
};

const onInput = (raw: string) => {
  emitValue(fromInputValue(raw, props.withTime));
};

const select = (cell: DateGridCell) => {
  if (cell.disabled) return;
  emitValue(composeIso(cell.date, props.modelValue, props.withTime));
  close();
};

const selectToday = () => {
  const now = new Date();
  if (!isWithinBounds(now, props.min, props.max)) return;
  emitValue(composeIso(now, props.modelValue, props.withTime));
  close();
};

const clear = () => {
  emitValue(undefined);
  emit('clear');
  close();
};

const page = (delta: number) => {
  view.value = shiftMonth(view.value.year, view.value.month, delta);
};

/** Move the roving focus by `days`, paging the view when it leaves the month. */
const moveFocus = (days: number) => {
  const from = focusKey.value
    ? (parseDate(focusKey.value) ?? new Date())
    : (selectedDate.value ?? new Date());
  const next = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate() + days,
    ),
  );

  focusKey.value = toDateKey(next);
  if (
    next.getUTCMonth() !== view.value.month ||
    next.getUTCFullYear() !== view.value.year
  )
    view.value = { year: next.getUTCFullYear(), month: next.getUTCMonth() };
};

const KEY_MOVES: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
  PageUp: -28,
  PageDown: 28,
};

const onGridKeydown = (event: KeyboardEvent) => {
  if (event.key in KEY_MOVES) {
    event.preventDefault();
    moveFocus(KEY_MOVES[event.key]);

    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    const cell = cells.value.find((c) => c.key === focusKey.value);
    if (!cell) return;
    event.preventDefault();
    select(cell);

    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    inputRef.value?.focus();
  }
};

const toggle = async () => {
  if (open.value) {
    close();
    inputRef.value?.focus();

    return;
  }

  view.value = initialView();
  focusKey.value = toDateKey(selectedDate.value ?? new Date());
  open.value = true;

  await nextTick();
  clickOutsideListener = addClickOutsideEventListener(rootRef.value, close);
};

/** Keep DOM focus on whichever cell the roving tabindex points at. */
watch([focusKey, cells], async () => {
  if (!open.value || !focusKey.value) return;
  await nextTick();
  rootRef.value
    ?.querySelector<HTMLButtonElement>(`[data-key="${focusKey.value}"]`)
    ?.focus();
});

// Follow the value when it changes from outside (form reset, autosave, another field).
watch(
  () => props.modelValue,
  () => {
    if (!open.value) view.value = initialView();
  },
);

onBeforeUnmount(teardownClickOutside);
</script>
