/**
 * @vitest-environment happy-dom
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ListResults from './ListResults.vue';
import { splitHighlight } from './highlight';

const XSS_LABEL = '<img src=x onerror="window.__xss=1">Evil';

describe('splitHighlight', () => {
  it('returns the whole text when the query is empty', () => {
    expect(splitHighlight('Ghent', '')).toEqual([{ text: 'Ghent', match: false }]);
  });

  it('flags case-insensitive matches', () => {
    expect(splitHighlight('Ghent and gHENT', 'ghent')).toEqual([
      { text: 'Ghent', match: true },
      { text: ' and ', match: false },
      { text: 'gHENT', match: true },
    ]);
  });

  it('treats regex characters in the query literally', () => {
    expect(splitHighlight('a.b axb', 'a.b')).toEqual([
      { text: 'a.b', match: true },
      { text: ' axb', match: false },
    ]);
  });
});

describe('ListResults', () => {
  it.each([
    ['without a query', undefined],
    ['with a matching query', 'Evil'],
    ['with a query matching inside the markup', 'img'],
  ])('renders option labels as text, never as HTML (%s)', (_, query) => {
    const wrapper = mount(ListResults, {
      props: { options: [{ label: XSS_LABEL, value: '1' }], query },
    });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('[role="option"]').text()).toBe(XSS_LABEL);
  });

  it('wraps the matched part in <mark>', () => {
    const wrapper = mount(ListResults, {
      props: { options: [{ label: 'Ghent University', value: '1' }], query: 'univ' },
    });

    expect(wrapper.find('mark').text()).toBe('Univ');
  });
});
