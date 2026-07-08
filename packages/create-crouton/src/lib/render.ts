/**
 * Tiny template engine: `{{key}}` placeholders + `{{#if key}}...{{/if}}` conditionals.
 */
export const render = (template: string, tokens: Record<string, string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(tokens)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, body) => (tokens[key] ? body : ''),
  );
  return result;
};
