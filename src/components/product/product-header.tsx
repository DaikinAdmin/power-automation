'use client';

import { useTranslations } from 'next-intl';

interface ProductHeaderProps {
  productName: string;
  articleId: string;
}

export function ProductHeader({ productName, articleId }: ProductHeaderProps) {
  const t = useTranslations('product');
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">{productName}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('articleId')}: {articleId}</p>
    </div>
  );
}
