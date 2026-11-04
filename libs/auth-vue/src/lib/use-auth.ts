import type { CroutonUser } from '@crouton/auth';
import { type User, UserManager, type UserManagerSettings } from 'oidc-client-ts';
import { type Ref, computed, ref } from 'vue';

let manager: UserManager | null = null;
const oidcUser: Ref<User | null> = ref(null);

export const setupOidcManager = (settings: UserManagerSettings) => {
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
    return {
      id: String(profile['sub'] ?? ''),
      email: profile['email'] ? String(profile['email']) : undefined,
      name: profile['name'] ? String(profile['name']) : undefined,
      roles: Array.isArray(profile['roles']) ? (profile['roles'] as string[]) : [],
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
