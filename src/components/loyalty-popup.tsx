"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Percent } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

const SHOWN_KEY = "loyalty_popup_shown";
const SHOW_DELAY_MS = 20000;

const EXCLUDED_PATH_PREFIXES = [
  "/checkout",
  "/admin",
  "/dashboard",
  "/signin",
  "/signup",
];

export default function LoyaltyPopup() {
  const t = useTranslations("loyaltyPromo");
  const pathname = usePathname();
  const session = authClient.useSession();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isExcludedPath = EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isLoggedIn = !!session.data?.user;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isExcludedPath || isLoggedIn || session.isPending) return;
    if (sessionStorage.getItem(SHOWN_KEY)) return;

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(SHOWN_KEY, "1");
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isExcludedPath, isLoggedIn, session.isPending]);

  function handleClose() {
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[9999999999] flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 lg:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <Percent className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-3">{t("title")}</h2>
        <p className="text-gray-600 text-sm text-center mb-6">
          {t("description")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 text-sm font-semibold border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("continueShopping")}
          </button>
          <Link
            href="/signup"
            onClick={handleClose}
            className="flex flex-1 items-center justify-center px-4 py-3 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            {t("register")}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
