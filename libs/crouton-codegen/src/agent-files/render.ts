const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;

export const renderAgentFile = (
  template: string,
  context: { resourcesDir: string; dataSourcesDir: string; version: string },
): string => {
  const filled = template
    .replace(/<resourcesDir>/g, context.resourcesDir)
    .replace(/<dataSourcesDir>/g, context.dataSourcesDir);

  const match = FRONTMATTER_RE.exec(filled);
  if (!match) return filled;

  const updatedFrontmatter = match[1].replace(
    /^crouton-version:.*$/m,
    `crouton-version: ${context.version}`,
  );
  return `---\n${updatedFrontmatter}\n---\n` + filled.slice(match[0].length);
};
