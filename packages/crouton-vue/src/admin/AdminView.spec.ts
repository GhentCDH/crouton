/**
 * @vitest-environment happy-dom
 *
 * The admin sidebar header renders the configured app title through the
 * translatable `admin.title` key instead of a hard-coded " Admin" suffix (#544).
 */
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

vi.mock('@ghentcdh/crouton-ui-vue', () => ({
  Drawer: { name: 'Drawer', template: '<div><slot /><slot name="left-drawer" /></div>' },
}));
vi.mock('../router', () => ({ CROUTON_DEV_RESOURCES: 'dev', CROUTON_FORM: 'form' }));
vi.mock('../i18n/LanguageSelect.vue', () => ({ default: { name: 'LanguageSelect', render: () => null } }));
vi.mock('../composables/useApi', () => ({ useApi: () => ({}) }));
vi.mock('../composables/useCrouton', () => ({
  useCrouton: () => ({
    title: computed(() => 'X admin'),
    sidebar: [],
    isDev: computed(() => false),
    version: '1.0.0',
  }),
}));

import { setUiDictionary } from '../i18n/useLanguage';
import AdminView from './AdminView.vue';

const heading = () =>
  mount(AdminView, { global: { stubs: { RouterView: true, RouterLink: true } } }).find('h2').text();

describe('AdminView header', () => {
  afterEach(() => setUiDictionary({}));

  it('renders the title through the default admin.title template', () => {
    expect(heading()).toBe('X admin Admin');
  });

  it('lets admin.title override the suffix (no hard-coded " Admin")', () => {
    setUiDictionary({ admin: { title: '{title}' } });
    expect(heading()).toBe('X admin');
  });
});
