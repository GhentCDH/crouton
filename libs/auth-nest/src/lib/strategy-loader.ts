import type { AuthProviderAdapter } from '@crouton/auth';
import {
  type LoadedProvider,
  OAUTH2_ENV,
  PRESETS,
  createOidcVerifier,
  getDefaultEnv,
  microsoftTenant,
  resolveEnv,
} from '@crouton/auth/server';
import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';

import { BEARER_STRATEGY_SUFFIX, type TokenVerifier, createBearerStrategy } from './strategies/bearer.strategy';
import { createDevStrategy } from './strategies/dev.strategy';
import { createGoogleStrategy } from './strategies/google.strategy';
import { createMicrosoftStrategy } from './strategies/microsoft.strategy';
import { createOidcStrategy } from './strategies/openidconnect.strategy';

export type StrategyClasses = {
  /** OAuth2 login strategy (login + callback flow). Undefined when env vars are missing. */
  oauth?: Type<unknown>;
  /** Bearer token API protection strategy. Always present. */
  bearer: Type<unknown>;
  /** Token verifier (preset providers only) — also used to verify tokens returned by the OAuth2 callback. */
  verify?: TokenVerifier;
};

const resolveProviderEnv = (provider: LoadedProvider): Record<string, string> => {
  const envMap = { ...getDefaultEnv(provider.config.provider), ...(provider.config.env ?? {}) };
  return resolveEnv(envMap);
};

/** Resolves OAuth2-only env vars (clientSecret, callbackUrl). Returns null if any are missing. */
const resolveOAuth2Env = (provider: LoadedProvider): Record<string, string> | null => {
  const oauth2Map = OAUTH2_ENV[provider.config.provider] ?? {};
  const resolved: Record<string, string> = {};
  for (const [key, envVar] of Object.entries(oauth2Map)) {
    const val = process.env[envVar];
    if (!val) return null;
    resolved[key] = val;
  }
  return resolved;
};

const createCustomBearerStrategy = (strategyName: string, adapter: AuthProviderAdapter): Type<unknown> => {
  @Injectable()
  class CustomBearerStrategy extends PassportStrategy(BearerStrategy, `${strategyName}${BEARER_STRATEGY_SUFFIX}`) {
    async validate(token: string): Promise<unknown> {
      return adapter.authenticate({ headers: { authorization: `Bearer ${token}` } });
    }
  }
  return CustomBearerStrategy;
};

export const createStrategiesForProvider = (provider: LoadedProvider): StrategyClasses => {
  const { config, strategyName } = provider;

  if (config.provider === 'dev') {
    const env = resolveProviderEnv(provider);
    return { bearer: createDevStrategy(strategyName, env['token'] ?? '') };
  }

  if (config.provider === 'custom') {
    if (!provider.adapter) throw new Error(`Custom provider "${strategyName}" has no adapter`);
    return { bearer: createCustomBearerStrategy(strategyName, provider.adapter) };
  }

  const env = resolveProviderEnv(provider);
  const preset = PRESETS[config.provider];
  if (!preset) throw new Error(`Unknown provider: ${config.provider}`);

  const rolesClaim = config.roles?.claim ?? preset.rolesClaim;
  const verify = createOidcVerifier({
    issuer: preset.verifyIssuer?.(env) ?? preset.issuer(env),
    clientId: env['clientId'] ?? '',
    audience: preset.audience?.(env),
    rolesClaim,
    providerName: strategyName,
    config,
    jwksUrl: preset.jwksUrl(env),
  });
  const bearer = createBearerStrategy(strategyName, verify);

  // OAuth2 env vars are optional — if missing, only Bearer strategy is registered.
  const oauth2Env = resolveOAuth2Env(provider);
  if (!oauth2Env) return { bearer, verify };

  const oidcEnv = {
    issuer: preset.issuer(env),
    authorizationUrl: preset.authorizationUrl(env),
    tokenUrl: preset.tokenUrl(env),
    userinfoUrl: preset.userinfoUrl(env),
    clientId: env['clientId'] ?? '',
    clientSecret: oauth2Env['clientSecret'] ?? '',
    callbackUrl: oauth2Env['callbackUrl'] ?? '',
  };

  let oauth: Type<unknown> | undefined;
  switch (config.provider) {
    case 'google':
      oauth = createGoogleStrategy(strategyName, oidcEnv);
      break;
    case 'microsoft':
      oauth = createMicrosoftStrategy(strategyName, { ...oidcEnv, tenant: microsoftTenant(env) });
      break;
    case 'keycloak':
    case 'auth0':
    case 'oidc':
      oauth = createOidcStrategy(strategyName, oidcEnv);
      break;
  }

  return { oauth, bearer, verify };
};
