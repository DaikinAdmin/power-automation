import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { CartProvider } from "@/components/cart-context";
import { CurrencyProvider } from "@/hooks/useCurrency";
import "./globals.css";
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Power Automation",
  description: "Best deals on electronics, fashion, and more!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} antialiased font-sans`}
      >
        <CartProvider>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </CartProvider>
      </body>
    </html>
  );
}
