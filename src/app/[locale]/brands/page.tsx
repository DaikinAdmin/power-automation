'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import PageLayout from '@/components/layout/page-layout';
import { InfoSidebar } from '@/components/info/info-sidebar';
import { InfoBreadcrumb } from '@/components/info/info-breadcrumb';

interface Brand {
  alias: string;
  name: string;
  imageLink: string | null;
  isVisible: boolean;
}

export default function BrandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('info.brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/public/brands`);
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        <main>
          <div className="max-w-[90rem] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <InfoBreadcrumb locale={locale} pageName={t('title')} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
              <InfoSidebar locale={locale} />

              <div className="lg:col-span-3">
                <div className="rounded-lg border bg-white p-6 sm:p-8">
                  <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-gray-900">
                    {t('title')}
                  </h1>

                  {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-lg border-2 border-gray-200 bg-gray-100 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {brands.map((brand) => (
                        <Link
                          key={brand.alias}
                          href={`/${locale}/brand/${brand.alias}`}
                          className="group"
                        >
                          <div className="aspect-square rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 hover:shadow-md flex items-center justify-center">
                            {brand.imageLink ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={brand.imageLink}
                                  alt={brand.name}
                                  fill
                                  className="object-contain p-2"
                                />
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {brand.name}
                                </p>
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-center text-sm text-gray-700 group-hover:text-gray-900 font-medium">
                            {brand.name}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}

                  {!isLoading && brands.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      {t('noBrands')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
