/**
 * resolve: turn a `ResourceDiff` into a `ResolvedDiff` by collecting a choice
 * per decision. The engine never prompts — a `DecisionResolver` supplies the
 * choices. The CLI plugs in an interactive resolver; a backend can plug in an
 * auto-policy or request-driven resolver.
 */

import type { Decision, ResolvedDiff, ResourceDiff } from './decision';

export interface DecisionResolver {
  /**
   * Resolve the given decisions to `{ decisionId → choice }`. Implementations
   * must return a choice for every decision (fall back to `decision.recommended`).
   */
  resolve(
    decisions: Decision[],
    diff: ResourceDiff,
  ): Promise<Record<string, string>> | Record<string, string>;
}

/** Non-interactive resolver: always picks each decision's recommended choice. */
export const recommendedResolver: DecisionResolver = {
  resolve(decisions) {
    const out: Record<string, string> = {};
    for (const d of decisions) out[d.id] = d.recommended;
    return out;
  },
};

export const resolve = async (
  diff: ResourceDiff,
  resolver: DecisionResolver = recommendedResolver,
): Promise<ResolvedDiff> => {
  const raw = await resolver.resolve(diff.decisions, diff);
  const resolutions = new Map<string, string>();
  for (const d of diff.decisions) {
    resolutions.set(d.id, raw[d.id] ?? d.recommended);
  }
  return { diff, resolutions };
};
