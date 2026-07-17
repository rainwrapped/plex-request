import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../state/auth.store';

/** Allows navigation only when a user session is present, else routes to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.currentUser() ? true : router.createUrlTree(['/login']);
};

/** Allows navigation only for admins, else routes back to the catalog. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.currentUser()?.role === 'admin' ? true : router.createUrlTree(['/']);
};

/** Keeps authenticated users away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.currentUser() ? router.createUrlTree(['/']) : true;
};
