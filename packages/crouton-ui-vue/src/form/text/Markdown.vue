<template>
  <ControlWrapper v-bind="properties">
    <div
      :class="sizeClass"
      :style="sizeStyle"
      class="card bg-base-100 border border-base-300 w-full"
    >
      <!-- Toolbar -->
      <div
        class="flex items-center gap-1 px-3 py-2 border-b border-base-300 bg-base-200"
      >
        <button
          v-for="action in actions"
          :key="action.name"
          tabindex="-1"
          type="button"
          class="btn btn-sm btn-ghost"
          :class="{ 'btn-active': editor?.isActive(action.name) }"
          :title="action.label"
          :disabled="!enabled"
          @click="action.action(editor)"
        >
          <span v-html="action.label" />
        </button>
      </div>

      <!-- Editor: the ProseMirror surface itself is the labelled textbox. -->
      <div class="card-body p-3">
        <EditorContent
          :editor="editor"
          class="prose prose-sm max-w-none h-full"
        />
      </div>
    </div>
  </ControlWrapper>
</template>

<script lang="ts" setup>
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { Markdown } from 'tiptap-markdown';
import { computed, onBeforeUnmount, watch } from 'vue';

import { MarkdownComponentProperties, MarkdownEmits } from './MarkdownComponent.properties';
import ControlWrapper from '../core/ControlWrapper.vue';

const properties = defineProps(MarkdownComponentProperties);

const emit = defineEmits(MarkdownEmits);
const model = defineModel();

// `minHeight` is a CSS length ('200px') from resource options, or a utility class.
const isCssLength = computed(() => /^\d/.test(properties.minHeight ?? ''));
const sizeClass = computed(() => (isCssLength.value ? undefined : properties.minHeight));
const sizeStyle = computed(() => (isCssLength.value ? { minHeight: properties.minHeight } : undefined));

const getMarkdown = (): string =>
  (editor.value?.storage as { markdown?: { getMarkdown(): string } } | undefined)?.markdown?.getMarkdown() ?? '';

const editor = useEditor({
  content: model.value ?? '',
  editable: properties.enabled,
  editorProps: {
    // Name the editable surface, not the wrapper (which also holds the toolbar).
    attributes: () => ({
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': properties.label ?? '',
      'aria-invalid': properties.errors ? 'true' : 'false',
    }),
  },
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      hardBreak: false,
    }) as any,
    Markdown.configure({
      html: false,
      transformPastedText: true, // parse markdown on paste
    }),
  ],
  onUpdate({ editor }) {
    const markdown = (editor.storage as any).markdown.getMarkdown();
    model.value = markdown;
    emit('change', markdown);
  },
});

watch(
  () => properties.enabled,
  (enabled) => editor.value?.setEditable(enabled),
);

// Follow value changes from outside (form reset, autosave refresh).
watch(model, (value) => {
  const next = (value as string | null | undefined) ?? '';
  if (editor.value && next !== getMarkdown()) editor.value.commands.setContent(next, { emitUpdate: false });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>
