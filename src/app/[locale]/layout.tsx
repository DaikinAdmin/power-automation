import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CartProvider } from "@/components/cart-context";
import { CompareProvider } from "@/components/compare-context";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import BinotelScripts from "@/components/binotel-scripts";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const SITE_META: Record<string, { title: string; description: string }> = {
  ua: {
    title: "Power Automation — промислова автоматизація в Україні",
    description:
      "Інтернет-магазин промислового обладнання. Siemens, Pilz, Atlas Copco та інші бренди. Наявність на складі, швидка доставка по Україні.",
  },
  pl: {
    title: "Power Automation — automatyka przemysłowa",
    description:
      "Sklep internetowy z osprzętem przemysłowym. Siemens, Pilz, Atlas Copco i inne marki. Szybka dostawa.",
  },
  en: {
    title: "Power Automation — Industrial Automation",
    description:
      "Online store for industrial equipment. Siemens, Pilz, Atlas Copco and more. Fast delivery.",
  },
  es: {
    title: "Power Automation — Automatización Industrial",
    description:
      "Tienda online de equipos industriales. Siemens, Pilz, Atlas Copco y más. Entrega rápida.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = SITE_META[locale] ?? SITE_META.ua;
  return {
    title: {
      default: meta.title,
      template: "%s | Power Automation",
    },
    description: meta.description,
    metadataBase: new URL("https://powerautomation.com.ua"),
    alternates: {
      canonical: `https://powerautomation.com.ua/${locale}`,
    },
    openGraph: {
      siteName: "Power Automation",
      locale: locale === "ua" ? "uk_UA" : locale,
      type: "website",
    },
    robots: locale === "ua" ? "index, follow" : "noindex, nofollow",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;

  // Get messages for client components
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  return (
    <html lang={locale} className="overflow-x-hidden">
      <body
        className={`${montserrat.variable} antialiased font-sans overflow-x-hidden`}
      >
        <NextIntlClientProvider>
          <CartProvider>
            <CompareProvider>
              <CurrencyProvider>{children}</CurrencyProvider>
            </CompareProvider>
          </CartProvider>
        </NextIntlClientProvider>
        <Toaster />
        <BinotelScripts />
      </body>
    </html>
  );
}
