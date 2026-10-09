<template>
  <ControlWrapper v-bind="properties">
    <div
      :class="[minHeight]"
      :aria-label="id"
      role="textbox"
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
          @click="action.action(editor)"
        >
          <span v-html="action.label" />
        </button>
      </div>

      <!-- Editor -->
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
import { onBeforeUnmount } from 'vue';

import { MarkdownComponentProperties, MarkdownEmits } from './MarkdownComponent.properties';
import ControlWrapper from '../core/ControlWrapper.vue';

const properties = defineProps(MarkdownComponentProperties);

const emit = defineEmits(MarkdownEmits);
const model = defineModel();

const editor = useEditor({
  content: model.value ?? '',
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
    }),
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

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>
