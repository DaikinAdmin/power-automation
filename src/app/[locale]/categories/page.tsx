import type { Metadata } from "next";
import CategoriesPage from '@/components/layout/categories-page'
import { Suspense, use } from 'react'
import { getBaseUrl } from "@/lib/domain-config";

const CATEGORIES_META: Record<string, { title: string; description: string }> = {
  ua: {
    title: "Усі категорії товарів | Power Automation",
    description:
      "Каталог промислового обладнання: контактори, реле, датчики, ПЛК, приводи, генератори та інше. Широкий вибір від провідних виробників.",
  },
  pl: {
    title: "Wszystkie kategorie | Power Automation",
    description: "Katalog osprzętu przemysłowego: styczniki, przekaźniki, czujniki, sterowniki PLC i inne.",
  },
  en: {
    title: "All Categories | Power Automation",
    description: "Catalog of industrial equipment: contactors, relays, sensors, PLCs, drives, generators and more.",
  },
  es: {
    title: "Todas las categorías | Power Automation",
    description: "Catálogo de equipos industriales: contactores, relés, sensores, PLCs, variadores y más.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = CATEGORIES_META[locale] ?? CATEGORIES_META.ua;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${getBaseUrl()}/${locale}/categories` },
  };
}

export const dynamic = 'force-dynamic';

export default function CategoryPage ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
    const { locale } = use(params);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoriesPage locale={locale} />
    </Suspense>
  )
}