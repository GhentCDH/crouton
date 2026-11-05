import type { CroutonUser } from '@crouton/auth';
import { type User, UserManager, type UserManagerSettings } from 'oidc-client-ts';
import { type Ref, computed, ref } from 'vue';

let manager: UserManager | null = null;
const oidcUser: Ref<User | null> = ref(null);
let configuredRolesClaim = 'roles';

const getNestedClaim = (profile: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, profile);

export const setupOidcManager = (settings: UserManagerSettings, rolesClaim?: string) => {
  if (rolesClaim) configuredRolesClaim = rolesClaim;
  manager = new UserManager(settings);
  manager.events.addUserLoaded((u) => {
    oidcUser.value = u;
  });
  manager.events.addUserUnloaded(() => {
    oidcUser.value = null;
  });
  manager.events.addSilentRenewError((e) => console.warn('[crouton-auth] silent renew error', e));
};

export const useAuth = () => {
  const isAuthenticated = computed(() => !!oidcUser.value && !oidcUser.value.expired);

  const user = computed<CroutonUser | null>(() => {
    const u = oidcUser.value;
    if (!u || u.expired) return null;
    const profile = u.profile as Record<string, unknown>;
    const rawRoles = configuredRolesClaim ? getNestedClaim(profile, configuredRolesClaim) : undefined;
    return {
      id: String(profile['sub'] ?? ''),
      email: profile['email'] ? String(profile['email']) : undefined,
      name: profile['name'] ? String(profile['name']) : undefined,
      roles: Array.isArray(rawRoles) ? rawRoles.filter((r): r is string => typeof r === 'string') : [],
      provider: 'oidc',
      claims: profile,
    };
  });

  const login = () => manager?.signinRedirect();
  const logout = () => manager?.signoutRedirect();
  const hasRole = (role: string) => user.value?.roles.includes(role) ?? false;
  const getToken = () => oidcUser.value?.access_token ?? null;

  return { user, isAuthenticated, login, logout, hasRole, getToken };
};

export const loadOidcUser = async () => {
  if (!manager) return null;
  const u = await manager.getUser();
  oidcUser.value = u;
  return u;
};

export const handleCallback = async () => {
  if (!manager) return null;
  const u = await manager.signinRedirectCallback();
  oidcUser.value = u;
  return u;
};

export const tryRenewOidcUser = async () => {
  if (!manager) return null;
  try {
    const u = await manager.signinSilent();
    if (u) oidcUser.value = u;
    return u;
  } catch {
    oidcUser.value = null;
    return null;
  }
};
