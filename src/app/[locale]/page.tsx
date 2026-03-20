import type { Metadata } from "next";
import HomePageClient from "@/components/home/home-page-client";

const HOME_META: Record<string, { title: string; description: string; keywords: string }> = {
  ua: {
    title: "Power Automation — промислова автоматизація, Siemens, Pilz, Atlas Copco в Україні",
    description:
      "Інтернет-магазин промислового обладнання в Україні. Siemens, Pilz, Atlas Copco, OMRON та інші бренди. Офіційний постачальник. Наявність на складі в Києві, швидка доставка по всій Україні.",
    keywords:
      "промислова автоматизація, промислове обладнання, Siemens Україна, Pilz Україна, Atlas Copco, купити контактор, ПЛК, датчики",
  },
  pl: {
    title: "Power Automation — automatyka przemysłowa, Siemens, Pilz, Atlas Copco",
    description:
      "Sklep z osprzętem automatyki przemysłowej. Siemens, Pilz, Atlas Copco, OMRON. Dostawa na terenie całego kraju.",
    keywords: "automatyka przemysłowa, osprzęt przemysłowy, Siemens, Pilz, Atlas Copco",
  },
  en: {
    title: "Power Automation — Industrial Automation, Siemens, Pilz, Atlas Copco",
    description:
      "Online store for industrial automation equipment. Siemens, Pilz, Atlas Copco, OMRON and more. Fast delivery.",
    keywords: "industrial automation, industrial equipment, Siemens, Pilz, Atlas Copco",
  },
  es: {
    title: "Power Automation — Automatización Industrial, Siemens, Pilz, Atlas Copco",
    description:
      "Tienda online de automatización industrial. Siemens, Pilz, Atlas Copco, OMRON y más. Entrega rápida.",
    keywords: "automatización industrial, equipos industriales, Siemens, Pilz",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = HOME_META[locale] ?? HOME_META.ua;
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `https://powerautomation.com.ua/${locale}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://powerautomation.com.ua/${locale}`,
      images: ["/imgs/Logo.webp"],
    },
  };
}

export default function Home() {
  return <HomePageClient />;
}
