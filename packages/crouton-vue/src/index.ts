import './styles.css';

export { isCustomFormat } from './resource/renderers';

export { croutonApiCall } from './resource/resource.api';

export * from './router';
export * from './composables/useCrouton';
export * from './resource/resource-modal';
export * from './resource/useResources';
export * from './relation/useRelationBinding';
export { default as RelationButton } from './relation/RelationButton.vue';
export { default as RelationInline } from './relation/RelationInline.vue';
/**
 * Dev-only panel for the visual resource builder's database sync tools
 * (generate a resource.json for a new DB table, or reload/diff everything
 * against the current Prisma schema). Only renders anything useful when the
 * connected backend has `CROUTON_SCHEMA_EDITOR` enabled — mount it wherever
 * your app's shell/sidebar makes sense (crouton-vue has no opinion on that).
 */
export { default as DevResourcesPanel } from './dev-tools/DevResourcesPanel.vue';
export * from './utils/computedAsync';
export * from './utils/custom-component';
export * from './utils/PageService';
export * from './runtime.config';
export * from './status';

export { rankWith } from '@jsonforms/core';
