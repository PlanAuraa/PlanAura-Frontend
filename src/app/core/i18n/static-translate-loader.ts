import { Injectable } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import en from '../../../assets/i18n/en.json';
import ar from '../../../assets/i18n/ar.json';

/**
 * SSR-safe translation loader. Instead of fetching the locale JSON over HTTP
 * (which needs an absolute URL on the server and double-fetches on hydration),
 * both dictionaries are statically imported and therefore bundled. Switching
 * language at runtime is then a synchronous in-memory swap — no network, no
 * flash, and identical output on server and browser.
 */
@Injectable({ providedIn: 'root' })
export class StaticTranslateLoader implements TranslateLoader {
  private readonly dictionaries: Record<string, TranslationObject> = {
    en: en as unknown as TranslationObject,
    ar: ar as unknown as TranslationObject,
  };

  getTranslation(lang: string): Observable<TranslationObject> {
    return of(this.dictionaries[lang] ?? this.dictionaries['en']);
  }
}
