import type { CroutonUser } from '@crouton/auth';

export const getCroutonUser = (req: { user?: CroutonUser }): CroutonUser | undefined => req.user;
