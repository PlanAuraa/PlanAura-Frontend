import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { StaticTranslateLoader } from './core/i18n/static-translate-loader';
import { LanguageService } from './core/i18n/language.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    // i18n: runtime language switching (EN/AR) with a bundled, SSR-safe loader.
    provideTranslateService({
      fallbackLang: 'en',
      lang: 'en',
      loader: provideTranslateLoader(StaticTranslateLoader),
    }),
    // Resolves any session already sitting in localStorage before the
    // Router's first navigation runs. Blocking app-init here (rather than
    // letting guards fetch lazily) is what makes guards synchronous and
    // guarantees GET /api/auth/me fires at most once per page load.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).initializeSession())),
    // Reads the language cookie (SSR + browser) and sets <html lang/dir> before
    // the first render, so SSR output and hydration agree on language/direction.
    provideAppInitializer(() => inject(LanguageService).init()),
  ]
};
