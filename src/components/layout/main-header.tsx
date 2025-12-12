"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {ChevronDown, Menu, X } from "lucide-react";
import { FaFacebook, FaLinkedin } from "react-icons/fa";
import { FaPhone } from "react-icons/fa6";
import LanguageSwitcher from "@/components/languge-switcher";
import { useTranslations } from "next-intl";

const NAV_LINKS = [
  { href: "/about", labelKey: "about" },
  { href: "/brands", labelKey: "brands" },
  { href: "/purchase-delivery", labelKey: "purchaseDelivery" },
  { href: "/refunding", labelKey: "refunding" },
  { href: "/contacts", labelKey: "contacts" },
];

const SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/Powerautomation.eu",
    icon: <FaFacebook size={18} />,
    label: "Facebook",
  },
  {
    href: "https://www.linkedin.com/company/encontradeukraine/",
    icon: <FaLinkedin size={18} />,
    label: "LinkedIn",
  },
];

const navLinkClass =
  "inline-flex items-center text-header text-[#474747] hover:text-opacity-60 transition-colors whitespace-nowrap";
const otherTriggerClass =
  "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors whitespace-nowrap";

export default function MainHeader() {
  const t = useTranslations("header");
  const [visibleCount, setVisibleCount] = useState<number>(NAV_LINKS.length);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navContainerRef = useRef<HTMLElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const measurementRefs = useRef<(HTMLSpanElement | null)[]>(
    NAV_LINKS.map(() => null)
  );
  const otherMeasurementRef = useRef<HTMLSpanElement | null>(null);

  const computeVisibleItems = useCallback(() => {
    const container = navContainerRef.current;
    if (!container) {
      setVisibleCount(NAV_LINKS.length);
      return;
    }

    const containerWidth = container.offsetWidth;
    if (containerWidth <= 0) {
      setVisibleCount(NAV_LINKS.length);
      return;
    }

    const styles = getComputedStyle(container);
    const gap = parseFloat(styles.columnGap || styles.gap || "0");
    const linkWidths = measurementRefs.current.map(
      (el) => el?.offsetWidth ?? 0
    );
    const otherWidth = otherMeasurementRef.current?.offsetWidth ?? 0;

    const calculateRequiredWidth = (count: number) => {
      let total = 0;
      for (let i = 0; i < count; i += 1) {
        if (i > 0) total += gap;
        total += linkWidths[i];
      }

      const needsOverflowMenu = count < linkWidths.length;
      if (needsOverflowMenu) {
        if (count > 0) total += gap;
        total += otherWidth;
      }
      return total;
    };

    let nextVisible = linkWidths.length;
    while (nextVisible >= 0) {
      const requiredWidth = calculateRequiredWidth(nextVisible);
      if (requiredWidth <= containerWidth || nextVisible === 0) {
        break;
      }
      nextVisible -= 1;
    }

    const finalCount = Math.max(nextVisible, 0);
    setVisibleCount((prev) => (prev !== finalCount ? finalCount : prev));
    if (finalCount >= linkWidths.length) {
      setIsOverflowOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      window.requestAnimationFrame(() => computeVisibleItems());
    };

    handleResize();

    const container = navContainerRef.current;
    const resizeObserver =
      container && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleResize)
        : null;
    if (container && resizeObserver) {
      resizeObserver.observe(container);
    }

    window.addEventListener("resize", handleResize);

    const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
    fontSet?.addEventListener("loadingdone", handleResize);

    const timer = window.setTimeout(handleResize, 200);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      fontSet?.removeEventListener("loadingdone", handleResize);
      window.clearTimeout(timer);
    };
  }, [computeVisibleItems]);

  useEffect(() => {
    if (!isOverflowOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!overflowMenuRef.current) return;
      if (overflowMenuRef.current.contains(event.target as Node)) return;
      setIsOverflowOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOverflowOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOverflowOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const visibleItems = NAV_LINKS.slice(0, visibleCount);
  const overflowItems = NAV_LINKS.slice(visibleCount);

  return (
    <header className="bg-transparent max-w-[90rem] mx-auto">
      <div className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="inline-flex items-center"
              aria-label="Go to homepage"
            >
              <Image
                src="/imgs/Logo.webp"
                alt="Shop logo"
                width={200}
                height={62}
                className="h-[62px] w-[200px]"
                priority
              />
            </Link>
          </div>

          <nav
            ref={navContainerRef}
            className="hidden min-w-0 flex-1 items-center justify-center gap-6 md:flex"
            aria-label="Primary navigation"
          >
            {visibleItems.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass}>
                {t(`nav.${item.labelKey}`)}
              </Link>
            ))}
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-opacity-75 duration-200 text-[#474747] transition-colors"
                  aria-label={item.label}
                >
                  {item.icon}
                </a>
              ))}
            </div>

            {overflowItems.length > 0 && (
              <div className="relative" ref={overflowMenuRef}>
                <button
                  type="button"
                  className={otherTriggerClass}
                  onClick={() => setIsOverflowOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={isOverflowOpen}
                >
                  {t("nav.other")}
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isOverflowOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOverflowOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                    {overflowItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsOverflowOpen(false)}
                      >
                        {t(`nav.${item.labelKey}`)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <a
              href="tel:+1234567890"
              className="hidden items-center gap-2 text-contact-phone text-[#474747] transition-colors hover:text-blue-600 sm:flex"
            >
              <FaPhone size={23} className="text-white bg-[#474747] rounded-full p-[5px]" />
              +1 (234) 567-890
            </a>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 transition-colors hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative ml-auto flex h-full w-72 flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-4">
              <span className="text-lg font-semibold text-gray-900">
                {t("nav.menu")}
              </span>
              <button
                type="button"
                className="rounded-md p-2 text-gray-600 transition-colors hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav
              className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4"
              aria-label="Mobile navigation"
            >
              {NAV_LINKS.map((item) => (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  className="rounded-md px-2 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={closeMobileMenu}
                >
                  {t(`nav.${item.labelKey}`)}
                </Link>
              ))}
            </nav>
            <div className="border-t px-4 py-4 space-y-4">
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
              <a
                href="tel:+1234567890"
                className="flex items-center gap-2 text-base font-semibold text-gray-800 transition-colors hover:text-blue-600"
              >
                <FaPhone size={20} />
                +1 (234) 567-890
              </a>
            </div>
          </div>
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 -z-10 h-0 overflow-hidden opacity-0"
      >
        <div className="flex items-center gap-6">
          {NAV_LINKS.map((item, index) => (
            <span
              key={`${item.href}-measure`}
              ref={(el) => {
                measurementRefs.current[index] = el;
              }}
              className={navLinkClass}
            >
              {t(`nav.${item.labelKey}`)}
            </span>
          ))}
          <span ref={otherMeasurementRef} className={otherTriggerClass}>
            {t("nav.other")}
          </span>
        </div>
      </div>
    </header>
  );
}
