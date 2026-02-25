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

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Power Automation",
  description: "Best deals on electronics, fashion, and more!",
};

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(d, w, s) {
      var widgetHash = '4dwo56b2g413yzwxtkuk',
      gcw = d.createElement(s);
      gcw.type = 'text/javascript';
      gcw.async = true;
      gcw.src = '//widgets.binotel.com/getcall/widgets/' + widgetHash + '.js';
      var sn = d.getElementsByTagName(s)[0];
      sn.parentNode.insertBefore(gcw, sn);
    })(document, window, 'script');`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(d, w, s) {
      var widgetHash = 'GcDTf4yHGBF3OHLyulIi',
      bch = d.createElement(s);
      bch.type = 'text/javascript';
      bch.async = true;
      bch.src = '//widgets.binotel.com/chat/widgets/' + widgetHash + '.js';
      var sn = d.getElementsByTagName(s)[0];
      sn.parentNode.insertBefore(bch, sn);
    })(document, window, 'script');`,
          }}
        />
      </body>
    </html>
  );
}
