import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export type AppLanguage = 'en' | 'ar';

const SUPPORTED: readonly AppLanguage[] = ['en', 'ar'];
const DEFAULT_LANG: AppLanguage = 'en';
const LANG_COOKIE = 'planaura_lang';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Runtime language + direction control, SSR-safe.
 *
 * The chosen language is persisted in a cookie (NOT localStorage) so the SSR
 * render can read it and emit the correct <html lang/dir> and translated text
 * up-front — the browser then hydrates against a matching DOM (no flash, no
 * mismatch). On the server the cookie is read from the injected REQUEST; in the
 * browser from document.cookie. dir/lang are set on documentElement, which
 * Angular serializes into the SSR HTML.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  // REQUEST is the web-standard Request on the server, null in the browser.
  private readonly request = inject(REQUEST, { optional: true });

  private readonly _lang = signal<AppLanguage>(DEFAULT_LANG);
  readonly currentLang = this._lang.asReadonly();
  readonly isRtl = computed(() => this._lang() === 'ar');

  /** Runs once at app init (server + browser): reads the cookie, applies language + direction. */
  async init(): Promise<void> {
    this.translate.setFallbackLang(DEFAULT_LANG);
    await this.apply(this.readCookieLang() ?? DEFAULT_LANG, false);
  }

  /** User-initiated change (browser): applies and persists to the cookie. */
  async setLanguage(lang: AppLanguage): Promise<void> {
    await this.apply(lang, true);
  }

  toggle(): void {
    void this.setLanguage(this._lang() === 'en' ? 'ar' : 'en');
  }

  private async apply(lang: AppLanguage, persist: boolean): Promise<void> {
    const normalized = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;

    await firstValueFrom(this.translate.use(normalized));
    this._lang.set(normalized);

    const html = this.document.documentElement;
    html.setAttribute('lang', normalized);
    html.setAttribute('dir', normalized === 'ar' ? 'rtl' : 'ltr');

    if (persist && isPlatformBrowser(this.platformId)) {
      this.document.cookie = `${LANG_COOKIE}=${normalized}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    }
  }

  private readCookieLang(): AppLanguage | null {
    const header = isPlatformBrowser(this.platformId)
      ? this.document.cookie
      : (this.request?.headers?.get('cookie') ?? null);
    if (!header) {
      return null;
    }
    const entry = header
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${LANG_COOKIE}=`));
    if (!entry) {
      return null;
    }
    const value = decodeURIComponent(entry.substring(LANG_COOKIE.length + 1)) as AppLanguage;
    return SUPPORTED.includes(value) ? value : null;
  }
}
