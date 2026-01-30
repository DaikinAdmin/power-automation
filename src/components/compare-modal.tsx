'use client';

import { X } from 'lucide-react';
import { CompareItem } from './compare-context';
import { useCurrency } from '@/hooks/useCurrency';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import parse from 'html-react-parser';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  compareItems: CompareItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export default function CompareModal({
  isOpen,
  onClose,
  compareItems,
  onRemoveItem,
  onClearAll,
}: CompareModalProps) {
  const { formatPriceFromBase } = useCurrency();
  const t = useTranslations('compare');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 bg-white rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-xl md:text-2xl font-bold">
            {t('title')} ({compareItems.length}/5)
          </h2>
          <div className="flex gap-2">
            {compareItems.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-4 py-2 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors"
              >
                {t('clearAll')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {compareItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-xl mb-2">{t('empty')}</p>
              <p className="text-sm">{t('emptyDescription')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-gray-50 p-4 text-left font-semibold border-b w-32">
                    </th>
                    {compareItems.map((item) => (
                      <th
                        key={item.id}
                        className="p-4 border-b min-w-[260px] max-w-[260px] w-[260px] align-top"
                      >
                        {/* Порожнє місце для вирівнювання */}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Images */}
                  <tr className="border-b">
                    <td className="sticky left-0 bg-gray-50 p-4 font-medium">
                      {t('photo')}
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-4 text-center align-top min-w-[260px] max-w-[260px] w-[260px]">
                        <div className="relative w-full aspect-square max-w-[220px] mx-auto">
                          {/* Хрестик видалення */}
                          <button
                            onClick={() => onRemoveItem(item.slug)}
                            className="absolute top-1 right-1 z-10 p-1 bg-red-100 hover:bg-red-200 rounded-full transition-colors"
                            title={t('remove')}
                          >
                            <X size={18} className="text-red-600" />
                          </button>
                          <Link href={`/product/${item.slug}`} className="block w-full h-full">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400">
                                  {t('noImage')}
                                </span>
                              </div>
                            )}
                          </Link>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Name */}
                  <tr className="border-b bg-gray-50">
                    <td className="sticky left-0 bg-gray-50 p-4 font-medium">
                      {t('name')}
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-4 min-w-[260px] max-w-[260px] w-[260px]">
                        <Link
                          href={`/product/${item.slug}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {item.name}
                        </Link>
                      </td>
                    ))}
                  </tr>

                  {/* Brand */}
                  <tr className="border-b">
                    <td className="sticky left-0 bg-gray-50 p-4 font-medium">
                      {t('brand')}
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.slug} className="p-4 min-w-[260px] max-w-[260px] w-[260px]">
                        {item.brandImage ? (
                          <div className="relative w-24 h-12 mx-auto">
                            <Image
                              src={item.brandImage}
                              alt={item.brand || ''}
                              fill
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-700">
                            {item.brand || t('noBrand')}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Price */}
                  <tr className="border-b bg-gray-50">
                    <td className="sticky left-0 bg-gray-50 p-4 font-medium">
                      {t('price')}
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.slug} className="p-4 min-w-[260px] max-w-[260px] w-[260px]">
                        <div className="text-center">
                          {item.specialPrice != null ? (
                            <>
                              <div className="text-xl font-bold text-red-600">
                                {formatPriceFromBase(item.specialPrice)}
                              </div>
                              <div className="text-sm text-gray-500 line-through">
                                {formatPriceFromBase(item.price)}
                              </div>
                            </>
                          ) : (
                            <div className="text-xl font-bold">
                              {formatPriceFromBase(item.price)}
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Description */}
                  <tr className="border-b">
                    <td className="sticky left-0 bg-gray-50 p-4 font-medium">
                      {t('description')}
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.slug} className="p-4 align-top min-w-[260px] max-w-[260px] w-[260px]">
                        <div className="text-sm text-gray-600 max-h-60 overflow-auto whitespace-pre-line">
                          {parse(item.description || t('noDescription'))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
