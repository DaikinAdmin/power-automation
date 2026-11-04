/**
 * Згода на cookies (vanilla-cookieconsent).
 *
 * Константи спільні для інлайн-скрипта Google Consent Mode у <head>
 * (src/app/[locale]/layout.tsx), який читає cookie ще до завантаження GTM,
 * і для вікна згоди (src/components/cookie-consent.tsx).
 */

export const CONSENT_COOKIE = 'cc_cookie';

/**
 * Збільшити, коли змінюється перелік сервісів/cookies (новий трекер тощо) —
 * збережена згода зі старою ревізією стає недійсною і вікно показується знову.
 */
export const CONSENT_REVISION = 2;

export type ConsentCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface ConsentState {
  /** Онлайн-чат Tawk.to */
  functional: boolean;
  /** Google Analytics 4 + Microsoft Clarity */
  analytics: boolean;
  /** Google Ads (конверсії, ремаркетинг) + збереження gclid */
  marketing: boolean;
}

const CONSENT_EVENT = 'pa:consent';

type ConsentWindow = Window & { __paConsent?: ConsentState };

/** Повідомляє компоненти, що залежать від згоди, про її поточний стан. */
export function publishConsent(state: ConsentState): void {
  (window as ConsentWindow).__paConsent = state;
  window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: state }));
}

/**
 * Викликає `cb` одразу, якщо рішення відвідувача вже відоме, і щоразу при
 * його зміні. Повертає функцію відписки.
 */
export function subscribeConsent(cb: (state: ConsentState) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentState>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  const current = (window as ConsentWindow).__paConsent;
  if (current) cb(current);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

/** Відкриває панель налаштувань cookies (лише на доменах, де показується вікно згоди). */
export async function showCookiePreferences(): Promise<void> {
  const CookieConsent = await import('vanilla-cookieconsent');
  CookieConsent.showPreferences();
}
