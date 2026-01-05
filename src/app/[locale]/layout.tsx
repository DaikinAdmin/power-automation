import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { CartProvider } from "@/components/cart-context";
import { CurrencyProvider } from "@/hooks/useCurrency";
import "./globals.css";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Power Automation",
  description: "Best deals on electronics, fashion, and more!",
};
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
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
    <html lang={locale}>
      <body
        className={`${montserrat.variable} antialiased font-sans`}
      >
        <NextIntlClientProvider>
          <CartProvider>
            <CurrencyProvider>
              {children}
            </CurrencyProvider>
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
