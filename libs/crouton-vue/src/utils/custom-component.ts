import type { Component } from 'vue';

export interface CustomComponentEntry {
  tester: (element: string) => number;
  renderer: Component;
}

export const customComponentIs =
  (type: string, rank: number): CustomComponentEntry['tester'] =>
  (element) =>
    element === type ? rank : -1;

export const findCustomComponent = (
  registry: CustomComponentEntry[],
  element: string | null | undefined,
): Component | undefined => {
  if (!element) return undefined;

  let best: { rank: number; renderer: Component } | undefined;
  for (const entry of registry) {
    const rank = entry.tester(element);
    if (rank > -1 && (!best || rank > best.rank)) {
      best = { rank, renderer: entry.renderer };
    }
  }

  if (!best?.renderer) {
    console.error('no renderer found for ', element);
  }

  return best?.renderer;
};
