'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, X, Loader2, Check } from 'lucide-react';

const LOCALES = [
  { code: 'pl', label: 'Polish (PL)' },
  { code: 'ua', label: 'Ukrainian (UA)' },
  { code: 'en', label: 'English (EN)' },
  { code: 'es', label: 'Spanish (ES)' },
] as const;

type LocaleCode = 'pl' | 'ua' | 'en' | 'es';

type TranslationFields = {
  id?: string;
  itemName: string;
  description: string;
  specifications: string | null;
  metaDescription: string | null;
  metaKeyWords: string | null;
};

type ItemTranslationData = {
  item: { slug: string; articleId: string | null; brandSlug: string | null };
  locales: Record<string, TranslationFields>;
};

interface TranslateItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlugs: string[];
}

export function TranslateItemsModal({ isOpen, onClose, selectedSlugs }: TranslateItemsModalProps) {
  const t = useTranslations('adminDashboard');
  const [items, setItems] = useState<Record<string, ItemTranslationData>>({});
  const [removedSlugs, setRemovedSlugs] = useState<Set<string>>(new Set());
  const [sourceLang, setSourceLang] = useState<LocaleCode>('pl');
  const [targetLangs, setTargetLangs] = useState<Set<LocaleCode>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [translationDone, setTranslationDone] = useState(false);

  const activeSlugs = selectedSlugs.filter(s => !removedSlugs.has(s));

  // Fetch translation data when modal opens
  const fetchData = useCallback(async () => {
    if (activeSlugs.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/items/translate?slugs=${activeSlugs.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.items || {});
    } catch {
      toast.error('Failed to load translation data');
    } finally {
      setIsLoading(false);
    }
  }, [activeSlugs.join(',')]);

  useEffect(() => {
    if (isOpen && activeSlugs.length > 0) {
      setTranslationDone(false);
      setRemovedSlugs(new Set());
      setTargetLangs(new Set());
      fetchData();
    }
  }, [isOpen]);

  const toggleTargetLang = (code: LocaleCode) => {
    setTargetLangs(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleExpanded = (slug: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const removeItem = (slug: string) => {
    setRemovedSlugs(prev => new Set(prev).add(slug));
  };

  const handleTranslate = async () => {
    const slugsToTranslate = activeSlugs.filter(s => !removedSlugs.has(s));
    const langs = Array.from(targetLangs).filter(l => l !== sourceLang);

    if (slugsToTranslate.length === 0) {
      toast.error('No items to translate');
      return;
    }
    if (langs.length === 0) {
      toast.error('Select at least one target language');
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/admin/items/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slugs: slugsToTranslate,
          sourceLang,
          targetLangs: langs,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Translation failed');
      }

      const data = await res.json();
      const { summary } = data;

      toast.success('Translation completed', {
        description: `Created: ${summary.created}, Updated: ${summary.updated}${summary.errors > 0 ? `, Errors: ${summary.errors}` : ''}`,
        duration: 5000,
      });

      setTranslationDone(true);

      // Re-fetch to show updated translations
      const refreshRes = await fetch(`/api/admin/items/translate?slugs=${slugsToTranslate.join(',')}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setItems(refreshData.items || {});
      }
    } catch (err: any) {
      toast.error('Translation failed', { description: err.message });
    } finally {
      setIsTranslating(false);
    }
  };

  const currentItems = Object.entries(items).filter(([slug]) => !removedSlugs.has(slug));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('translateModal.title')}</DialogTitle>
          <DialogDescription>
            {translationDone
              ? t('translateModal.done')
              : t('translateModal.summary', { count: currentItems.length })}
          </DialogDescription>
        </DialogHeader>

        {/* Language Controls */}
        {!translationDone && (
          <div className="flex flex-wrap items-center gap-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">{t('translateModal.sourceLabel')}</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as LocaleCode)}
                className="px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LOCALES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">{t('translateModal.targetLabel')}</label>
              {LOCALES.filter(l => l.code !== sourceLang).map(l => (
                <label
                  key={l.code}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={targetLangs.has(l.code)}
                    onChange={() => toggleTargetLang(l.code)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">{t('translateModal.loading')}</span>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{t('translateModal.empty')}</div>
          ) : (
            currentItems.map(([slug, data]) => {
              const isExpanded = expandedItems.has(slug);
              const localeKeys = Object.keys(data.locales);

              return (
                <div key={slug} className="border rounded-lg">
                  {/* Accordion Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpanded(slug)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-sm">
                        {data.item.articleId || slug}
                      </span>
                      {data.item.brandSlug && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {data.item.brandSlug}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {localeKeys.length > 0
                          ? `${t('translateModal.localesLabel')} ${localeKeys.join(', ').toUpperCase()}`
                          : t('translateModal.noTranslationsAvailable')}
                      </span>
                    </div>
                    {!translationDone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(slug);
                        }}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t">
                      {localeKeys.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">{t('translateModal.noTranslations')}</p>
                      ) : (
                        <div className="space-y-3 pt-3">
                          {localeKeys.map(locale => {
                            const fields = data.locales[locale];
                            return (
                              <div key={locale} className="bg-gray-50 rounded-md p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                    {locale}
                                  </span>
                                  {translationDone && targetLangs.has(locale as LocaleCode) && (
                                    <span className="flex items-center gap-1 text-xs text-green-600">
                                      <Check className="w-3 h-3" /> {t('translateModal.translated')}
                                    </span>
                                  )}
                                </div>
                                <div className="grid gap-1.5 text-xs">
                                  <div>
                                    <span className="font-medium text-gray-500">{t('translateModal.fields.name')} </span>
                                    <span className="text-gray-800">{fields.itemName}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-500">{t('translateModal.fields.description')} </span>
                                    <span className="text-gray-800 line-clamp-2">{fields.description}</span>
                                  </div>
                                  {fields.specifications && (
                                    <div>
                                      <span className="font-medium text-gray-500">{t('translateModal.fields.specifications')} </span>
                                      <span className="text-gray-800 line-clamp-2">{fields.specifications}</span>
                                    </div>
                                  )}
                                  {fields.metaDescription && (
                                    <div>
                                      <span className="font-medium text-gray-500">{t('translateModal.fields.metaDescription')} </span>
                                      <span className="text-gray-800 line-clamp-1">{fields.metaDescription}</span>
                                    </div>
                                  )}
                                  {fields.metaKeyWords && (
                                    <div>
                                      <span className="font-medium text-gray-500">{t('translateModal.fields.metaKeywords')} </span>
                                      <span className="text-gray-800 line-clamp-1">{fields.metaKeyWords}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          {translationDone ? (
            <Button onClick={onClose}>{t('translateModal.close')}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={isTranslating}>
                {t('translateModal.cancel')}
              </Button>
              <Button
                onClick={handleTranslate}
                disabled={isTranslating || targetLangs.size === 0 || currentItems.length === 0}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('translateModal.translating')}
                  </>
                ) : (
                  t('translateModal.translateBtn', { count: currentItems.length })
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
