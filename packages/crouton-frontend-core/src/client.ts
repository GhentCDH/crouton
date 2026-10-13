import type { HttpClient, KeyValueStorage, LinkOpener, Notifier } from './api/ports';
import { createResourceApi } from './api/resource-api';
import { createBackendActionExecutor } from './resource/backend-action';
import { ResourceDefinitionRepository } from './resource/resource-definition';

export interface CroutonClientOptions {
  http: HttpClient;
  notifier: Notifier;
  storage?: KeyValueStorage;
  linkOpener?: LinkOpener;
  /** Returns current language for FormDef cache keying. */
  getLanguage?: () => string;
}

const noopLinkOpener: LinkOpener = {
  open: (href, blank) => {
    if (blank) window.open(href, '_blank');
    else window.location.href = href;
  },
};

export const createCroutonClient = ({
  http,
  notifier,
  storage,
  linkOpener = noopLinkOpener,
  getLanguage = () => '',
}: CroutonClientOptions) => {
  const formDefs = new ResourceDefinitionRepository(http, getLanguage);
  const resourceApi = createResourceApi(http, notifier);
  const backendActionExecutor = createBackendActionExecutor(http, notifier, linkOpener);

  return {
    http,
    notifier,
    storage,
    linkOpener,
    formDefs,
    resourceApi,
    backendActionExecutor,
  };
};

export type CroutonClient = ReturnType<typeof createCroutonClient>;
