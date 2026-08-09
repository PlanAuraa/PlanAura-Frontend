import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ClientProfileStateService } from '../../../core/services/client-profile-state.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { createActiveRouteTitle } from '../../../shared/utils/active-route-title';
import { confirmLogout } from '../../../shared/utils/confirm-logout';
import { NotificationBell } from '../../../shared/ui/notification-bell/notification-bell';

@Component({
  selector: 'app-client-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell, TranslatePipe],
  templateUrl: './client-shell.html',
  styleUrl: './client-shell.css',
})
export class ClientShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly clientProfileState = inject(ClientProfileStateService);
  // Public so the top-bar language toggle can bind to it.
  protected readonly language = inject(LanguageService);
  protected readonly pageTitle = createActiveRouteTitle('Overview');

  /**
   * Maps the route's English data.title (see app.routes.ts) to an i18n key so the
   * top-bar heading translates too, without changing the shared routing config.
   * Unmapped titles fall through as-is (the translate pipe then echoes them back).
   */
  private readonly pageTitleKeys: Record<string, string> = {
    'Overview': 'nav.overview',
    'Browse Vendors': 'nav.browseVendors',
    'Vendor Details': 'nav.title.vendorDetails',
    'New Booking': 'nav.title.newBooking',
    'My Event Plans': 'nav.myEventPlans',
    'New Event Plan': 'nav.title.newEventPlan',
    'Event Plan Details': 'nav.title.eventPlanDetails',
    'Edit Event Plan': 'nav.title.editEventPlan',
    'AI Invitation': 'nav.title.aiInvitation',
    'My Bookings': 'nav.myBookings',
    'My Profile': 'nav.myProfile',
    'AI Event Visualizer': 'nav.title.aiVisualizer',
  };
  protected readonly pageTitleKey = computed(
    () => this.pageTitleKeys[this.pageTitle()] ?? this.pageTitle(),
  );

  /** Flips true if the avatar image fails to load, forcing the initial-letter fallback. */
  protected readonly avatarBroken = signal(false);

  ngOnInit(): void {
    // clientGuard only fetches /me on a cold load when role signals are
    // empty; a same-session login already has isClient() true without ever
    // populating currentUser(), so the topbar profile needs its own fetch.
    if (!this.currentUser()) {
      this.authService.fetchCurrentUser().subscribe();
    }
    this.clientProfileState.load();
  }

  protected async logout(): Promise<void> {
    const confirmed = await confirmLogout();
    if (!confirmed) {
      return;
    }
    this.authService.logout();
    this.router.navigateByUrl('/auth');
  }
}
