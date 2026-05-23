"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

const CONSENT_KEY = "cookie_consent";

export default function CookieConsent({ requireConsent }: { requireConsent: boolean }) {
  const t = useTranslations("cookieConsent");
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // UA domain: auto-accept, no banner needed (not subject to ePrivacy like EU)
    if (!requireConsent) {
      if (!localStorage.getItem(CONSENT_KEY)) {
        localStorage.setItem(CONSENT_KEY, 'accepted');
      }
      return;
    }
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, [requireConsent]);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      });
      (window as any).gtag("event", "cookie_consent_accepted");
    }
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("title")}
      className="fixed bottom-0 left-0 right-0 z-[9999999999] bg-white border-t border-gray-200 shadow-lg p-4 md:p-6"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm md:text-base mb-1">
            {t("title")}
          </p>
          <p className="text-gray-600 text-xs md:text-sm">
            {t("description")}{" "}
            <Link
              href="/privacy-policy"
              className="underline text-red-600 hover:text-red-800 whitespace-nowrap"
            >
              {t("learnMore")}
            </Link>
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("decline")}
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}