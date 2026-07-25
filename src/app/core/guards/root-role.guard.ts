import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guards the '' route only. Unlike authGuard/clientGuard, this never blocks
 * anonymous visitors — RootPage decides what an anonymous visitor sees
 * (the public landing) vs. a signed-in client (the existing Home splash).
 * The only thing this guard does is keep vendors/admins from landing on
 * RootPage at all, sending them straight to their own dashboards — the same
 * eventual destination guestGuard already sends them to, just without the
 * redundant bounce through /auth.
 *
 * isAdmin()/isVendor() only reflect roles already loaded into memory, so a
 * cold load/refresh falls back to GET /api/auth/me first, matching the
 * pattern in guestGuard/clientGuard/vendorGuard.
 */
export const rootRoleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  if (authService.isAdmin()) {
    return of(router.parseUrl('/admin/dashboard'));
  }

  if (authService.isVendor()) {
    return of(router.parseUrl('/vendor/dashboard'));
  }

  if (authService.isClient()) {
    return true;
  }

  return authService.fetchCurrentUser().pipe(
    map(() => {
      if (authService.isAdmin()) {
        return router.parseUrl('/admin/dashboard');
      }
      if (authService.isVendor()) {
        return router.parseUrl('/vendor/dashboard');
      }
      return true;
    }),
    // An expired/invalid token shouldn't block RootPage — it'll just render
    // the anonymous (public landing) branch.
    catchError(() => of(true)),
  );
};
