import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Home } from '../home/home';
import { Landing } from '../landing/landing';

/**
 * The actual component behind the '' route. rootRoleGuard has already sent
 * vendors/admins to their own dashboards by the time this mounts, so the
 * only decision left here is client (existing post-login splash) vs.
 * anonymous (public landing) — kept as one thin switch so Home never needs
 * to know it's being conditionally rendered, and stays byte-for-byte as it
 * was before this page existed.
 */
@Component({
  selector: 'app-root-page',
  standalone: true,
  imports: [Home, Landing],
  templateUrl: './root-page.html',
})
export class RootPage {
  private readonly authService = inject(AuthService);

  protected readonly isSignedInClient = computed(
    () => this.authService.isAuthenticated() && this.authService.isClient(),
  );
}
