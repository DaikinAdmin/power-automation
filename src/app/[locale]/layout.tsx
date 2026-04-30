import type { Viewport } from "next";
import { Montserrat } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CartProvider } from "@/components/cart-context";
import { CompareProvider } from "@/components/compare-context";
import { CurrencyProvider } from "@/hooks/useCurrency";
import type { SupportedCurrency } from "@/helpers/currency";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import Script from 'next/script';
import { GoogleTagManager } from '@next/third-parties/google';
import { getServerDomainConfig } from '@/lib/server-domain';
import { getVatBySlug } from '@/helpers/db/vat-queries';
import CookieConsent from "@/components/cookie-consent";

export { generateLayoutMetadata as generateMetadata } from "@/lib/seo-metadata";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

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

  // Domain-specific GTM ID and currency
  const domainConfig = await getServerDomainConfig();
  const gtmId = domainConfig.gtmId;
  const domainCurrencyMap: Record<string, SupportedCurrency> = { pl: 'PLN', ua: 'UAH' };
  const initialCurrency: SupportedCurrency = domainCurrencyMap[domainConfig.key] ?? 'EUR';

  // VAT configuration per domain — Ukraine uses 20% (slug='ua'), all others use 23% (slug='pl')
  const vatSlug = domainConfig.key === 'ua' ? 'ua' : 'pl';
  const vatPercentage = await getVatBySlug(vatSlug);
  const vatInclusive = true;

  return (
    <html lang={locale} className="overflow-x-hidden">
      <head>
        <Script
          id="consent-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer=window.dataLayer||[];
              function gtag(){dataLayer.push(arguments);}
              window.gtag=gtag;
              ${domainConfig.key === 'ua' ? `
              gtag('consent','default',{
                analytics_storage:'granted',ad_storage:'granted',
                ad_user_data:'granted',ad_personalization:'granted',
                functionality_storage:'granted',security_storage:'granted'
              });
              ` : `
              try{
                var c=localStorage.getItem('cookie_consent');
                var s=c==='accepted'?'granted':'denied';
                gtag('consent','default',{
                  analytics_storage:s,ad_storage:s,
                  ad_user_data:s,ad_personalization:s,
                  functionality_storage:'granted',security_storage:'granted',
                  wait_for_update:c?0:500
                });
              }catch(e){
                gtag('consent','default',{
                  analytics_storage:'denied',ad_storage:'denied',
                  ad_user_data:'denied',ad_personalization:'denied',
                  functionality_storage:'granted',security_storage:'granted',
                  wait_for_update:500
                });
              }
              `}
            `,
          }}
        />
      </head>
      <GoogleTagManager gtmId={gtmId} />
      <body
        className={`${montserrat.variable} antialiased font-sans overflow-x-hidden`}
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <NextIntlClientProvider>
          <CartProvider>
            <CompareProvider>
              <CurrencyProvider initialCurrency={initialCurrency} vatPercentage={vatPercentage} vatInclusive={vatInclusive}>{children}</CurrencyProvider>
            </CompareProvider>
          </CartProvider>
          <Toaster />
          <CookieConsent requireConsent={domainConfig.key !== 'ua'} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
