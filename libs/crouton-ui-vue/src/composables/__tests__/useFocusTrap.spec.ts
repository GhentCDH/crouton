import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

import { withSetup } from './withSetup';
import { useFocusTrap } from '../useFocusTrap';

const createContainer = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <button id="first">First</button>
    <input id="middle" type="text" />
    <button id="last">Last</button>
  `;
  document.body.appendChild(container);
  return container;
};

describe('useFocusTrap', () => {
  let container: HTMLElement;
  let outsideButton: HTMLElement;

  beforeEach(() => {
    outsideButton = document.createElement('button');
    outsideButton.id = 'outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    container = createContainer();
  });

  afterEach(() => {
    container.remove();
    outsideButton.remove();
  });

  it('should focus first focusable element on activate', async () => {
    const containerRef = ref<HTMLElement | null>(container);
    const isActive = ref(false);

    withSetup(() => useFocusTrap({ containerRef, isActive }));

    isActive.value = true;
    await nextTick();

    expect(document.activeElement).toBe(container.querySelector('#first'));
  });

  it('should wrap Tab from last to first element', async () => {
    const containerRef = ref<HTMLElement | null>(container);
    const isActive = ref(true);

    withSetup(() => useFocusTrap({ containerRef, isActive }));
    await nextTick();

    const last = container.querySelector<HTMLElement>('#last')!;
    last.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(container.querySelector('#first'));
  });

  it('should wrap Shift+Tab from first to last element', async () => {
    const containerRef = ref<HTMLElement | null>(container);
    const isActive = ref(true);

    withSetup(() => useFocusTrap({ containerRef, isActive }));
    await nextTick();

    const first = container.querySelector<HTMLElement>('#first')!;
    first.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(container.querySelector('#last'));
  });

  it('should call onEscape when ESC pressed', async () => {
    const containerRef = ref<HTMLElement | null>(container);
    const isActive = ref(true);
    const onEscape = vi.fn();

    withSetup(() => useFocusTrap({ containerRef, isActive, onEscape }));
    await nextTick();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('should restore focus on deactivate', async () => {
    const containerRef = ref<HTMLElement | null>(container);
    const isActive = ref(false);

    outsideButton.focus();
    expect(document.activeElement).toBe(outsideButton);

    withSetup(() => useFocusTrap({ containerRef, isActive }));

    isActive.value = true;
    await nextTick();
    expect(document.activeElement).toBe(container.querySelector('#first'));

    isActive.value = false;
    await nextTick();
    expect(document.activeElement).toBe(outsideButton);
  });
});
