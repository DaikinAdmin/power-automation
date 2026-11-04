"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CookieConsentConfig, Translation } from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { getPathname } from "@/i18n/navigation";
import {
  CONSENT_COOKIE,
  CONSENT_REVISION,
  publishConsent,
  type ConsentCategory,
  type ConsentState,
} from "@/lib/consent";

type GtagFn = (...args: unknown[]) => void;
type TrackingWindow = Window & {
  gtag?: GtagFn;
  dataLayer?: unknown[];
};

// vanilla-cookieconsent тримає стан на рівні модуля — run() викликаємо один раз
// за завантаження сторінки (зміна мови робить повний reload, див. languge-switcher).
let started = false;

/**
 * GA4, Google Ads і Microsoft Clarity вантажаться через GTM і самі читають
 * сигнали Google Consent Mode (analytics_storage / ad_storage), тож тут
 * достатньо оновити consent state.
 */
function applyConsent(state: ConsentState) {
  const w = window as TrackingWindow;
  const ads = state.marketing ? "granted" : "denied";

  w.gtag?.("consent", "update", {
    analytics_storage: state.analytics ? "granted" : "denied",
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  });

  publishConsent(state);
}

/** Подія для тригерів GTM — лише коли відвідувач щойно зробив або змінив вибір. */
function pushConsentEvent(state: ConsentState) {
  const w = window as TrackingWindow;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event: "cookie_consent_update",
    consent_functional: state.functional,
    consent_analytics: state.analytics,
    consent_marketing: state.marketing,
  });
  if (state.analytics || state.marketing) {
    w.gtag?.("event", "cookie_consent_accepted");
  }
}

export default function CookieConsent({ requireConsent }: { requireConsent: boolean }) {
  const t = useTranslations("cookieConsent");
  const locale = useLocale();

  useEffect(() => {
    // UA-домен: згода не потрібна (не підпадає під ePrivacy), вікно не показуємо —
    // consent mode у <head> уже "granted".
    if (!requireConsent) {
      applyConsent({ functional: true, analytics: true, marketing: true });
      return;
    }
    if (started) return;

    let cancelled = false;
    const privacyHref = getPathname({ href: "/privacy-policy", locale });
    const privacyLink = (chunks: string) => `<a href="${privacyHref}">${chunks}</a>`;

    const translation: Translation = {
      consentModal: {
        title: t("title"),
        description: t("description"),
        // Навмисно без acceptNecessaryBtn / closeIconLabel: на першому екрані лише
        // «Прийняти все» і «Налаштувати». Відмовитися можна в налаштуваннях —
        // там усі необов'язкові категорії вимкнені за замовчуванням.
        acceptAllBtn: t("acceptAll"),
        showPreferencesBtn: t("customize"),
        footer: privacyLink(t("privacyPolicy")),
      },
      preferencesModal: {
        title: t("preferences.title"),
        acceptAllBtn: t("acceptAll"),
        savePreferencesBtn: t("preferences.save"),
        closeIconLabel: t("preferences.close"),
        sections: [
          {
            title: t("preferences.intro.title"),
            description: t("preferences.intro.description"),
          },
          {
            title: t("preferences.necessary.title"),
            description: t("preferences.necessary.description"),
            linkedCategory: "necessary",
          },
          {
            title: t("preferences.functional.title"),
            description: t("preferences.functional.description"),
            linkedCategory: "functional",
          },
          {
            title: t("preferences.analytics.title"),
            description: t("preferences.analytics.description"),
            linkedCategory: "analytics",
          },
          {
            title: t("preferences.marketing.title"),
            description: t("preferences.marketing.description"),
            linkedCategory: "marketing",
          },
          {
            title: t("preferences.more.title"),
            description: t.markup("preferences.more.description", { link: privacyLink }),
          },
        ],
      },
    };

    import("vanilla-cookieconsent").then((CC) => {
      if (cancelled || started) return;
      started = true;

      // Стара згода (до вікна з категоріями) не покривала Clarity — питаємо заново.
      try {
        localStorage.removeItem("cookie_consent");
      } catch {}

      const accepted = (category: ConsentCategory) => CC.acceptedCategory(category);
      const currentState = (): ConsentState => ({
        functional: accepted("functional"),
        analytics: accepted("analytics"),
        marketing: accepted("marketing"),
      });
      // onFirstConsent спрацьовує перед onConsent, а подія для GTM має йти
      // після consent update — тому лише позначаємо і шлемо її в onConsent.
      let isFirstConsent = false;

      const config: CookieConsentConfig = {
        revision: CONSENT_REVISION,
        cookie: {
          name: CONSENT_COOKIE,
          secure: window.location.protocol === "https:",
        },
        disablePageInteraction: true,
        guiOptions: {
          consentModal: { layout: "box wide", position: "middle center" },
          preferencesModal: { layout: "box", equalWeightButtons: true },
        },
        categories: {
          necessary: { enabled: true, readOnly: true },
          functional: {
            // Віджет Tawk.to не вивантажується без перезавантаження сторінки.
            autoClear: {
              cookies: [{ name: /^twk_/ }, { name: "TawkConnectionTime" }, { name: "__tawkuuid" }],
              reloadPage: true,
            },
          },
          analytics: {
            autoClear: {
              cookies: [{ name: /^_ga/ }, { name: "_gid" }, { name: /^_cl(ck|sk)$/ }],
              reloadPage: true,
            },
          },
          marketing: {
            autoClear: {
              cookies: [{ name: /^_gcl_/ }, { name: "pa_ad_visitor" }],
            },
          },
        },
        onFirstConsent: () => {
          isFirstConsent = true;
        },
        onConsent: () => {
          const state = currentState();
          applyConsent(state);
          if (isFirstConsent) {
            isFirstConsent = false;
            pushConsentEvent(state);
          }
        },
        onChange: () => {
          const state = currentState();
          applyConsent(state);
          pushConsentEvent(state);
        },
        language: {
          default: locale,
          translations: { [locale]: translation },
        },
      };

      CC.run(config);
    });

    return () => {
      cancelled = true;
    };
  }, [requireConsent, locale, t]);

  return null;
}
