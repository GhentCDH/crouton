import { loadDataSourcesFromDir } from '../src/lib/crud/data-source/index.ts';
import { FileSystemResourceConfigLoader } from '../src/lib/crud/loader/fs-resource-config.loader.ts';
import { loadResourceConfigsFromDir } from '../src/lib/crud/loader/loadResources.ts';
import fs from 'node:fs';

const basePath = './examples/book-collection';
const dataSourcePath = `${basePath}/apps/backend/src/app/data-sources`;
const resourcePath = `${basePath}/apps/backend/src/app/resources`;

const enumsFile = `${basePath}/crouton.enums.json`;
const croutonFile = `${basePath}/crouton.json`;

const dataSources = await loadDataSourcesFromDir(dataSourcePath);

const baseUrl = 'http://localhost:4444/';

const loader = new FileSystemResourceConfigLoader(
  resourcePath,
  baseUrl,
  enumsFile,
);

const configs = await loadResourceConfigsFromDir(
  resourcePath,
  baseUrl,
  enumsFile,
);

const generatedDir = './packages/crouton-api/generated';

// Ensure the target directory exists before writing files
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
} else {
  // Optional: Clean up existing files in the directory if desired
  const files = fs.readdirSync(generatedDir);
  for (const file of files) {
    fs.unlinkSync(`${generatedDir}/${file}`);
  }
}

for (const config of dataSources) {
  // Stringify the configuration object since fs.writeFileSync expects a string or buffer
  fs.writeFileSync(
    `${generatedDir}/dataSources.${config.config.name}.json`,
    JSON.stringify(config, null, 2),
  );
}

for (const config of configs) {
  // Stringify the configuration object since fs.writeFileSync expects a string or buffer
  const baseName = config.resourcePath.replaceAll('/', '_');
  const fileName = `${baseName}_resource.json`;
  fs.writeFileSync(
    `${generatedDir}/${fileName}.json`,
    JSON.stringify(config, null, 2),
  );
}
