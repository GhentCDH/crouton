import { type ZodObject, type ZodRawShape } from 'zod';

import { findModule, importDefault } from './module.loader';
import { type ResourceHooks, loadResourceHooks } from '../hooks';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';


export type ResourceFile = {
  jsonFile: string;
  basePath: string;
  resourcePath: string;
  schema: ZodObject<ZodRawShape> | undefined;
  hooks: ResourceHooks | undefined;
  children: ResourceFile[] | undefined;
};

const RESOURCE_FILE_NAME = 'resource.json';

const getResourcePath = (basePath: string, resourcePath: string) =>
  path.join(basePath, resourcePath);
const getResourceJson = (basePath: string, resourcePath: string) =>
  path.join(getResourcePath(basePath, resourcePath), RESOURCE_FILE_NAME);

const hasResourceFile = (basePath: string) => (resourcePath: string) => {
  return existsSync(getResourceJson(basePath, resourcePath));
};

const buildResourceObject =
  (basePath: string) => async (resourcePath: string) => {
    const resourceBasePath = getResourcePath(basePath, resourcePath);
    const jsonFile = getResourceJson(basePath, resourcePath);
    const schemaFile = findModule(resourceBasePath, 'schema');
    const schema = schemaFile
      ? await importDefault<ZodObject<ZodRawShape>>(schemaFile)
      : undefined;

    const hooks = await loadResourceHooks(resourceBasePath);

    const children = await ScanForResourceFile(resourceBasePath);

    return {
      basePath,
      resourcePath: resourceBasePath,
      children,
      jsonFile,
      schema,
      hooks,
    } as ResourceFile;
  };

const ScanForResourceFile = (resourcePath: string) => {
  return Promise.all(
    readdirSync(resourcePath)
      .filter(hasResourceFile(resourcePath))
      .map(buildResourceObject(resourcePath)),
  );
};

export const BuildResourceTree = (resourcePath: string): Promise<ResourceFile[]> => {
  return ScanForResourceFile(resourcePath);
};
