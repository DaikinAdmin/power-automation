'use client';

import { useEffect, useState } from 'react';
import { Search, Download, X, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdClick } from '@/db/schema';

function formatUtcDate(value: string) {
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
  const utcValue = hasTimezone ? value : `${value.replace(' ', 'T')}Z`;
  return new Date(utcValue).toLocaleString('uk-UA');
}

export default function AdClicksPage() {
  const t = useTranslations('adminDashboard.adClicks');
  const [adClicks, setAdClicks] = useState<AdClick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAdClicks(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadAdClicks = async (searchTerm: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/ad-clicks?${params}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to fetch ad clicks' }));
        throw new Error(data.error || 'Failed to fetch ad clicks');
      }

      const data = (await response.json()) as { adClicks: AdClick[] };
      setAdClicks(data.adClicks ?? []);
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    setSearch('');
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    window.location.href = `/api/admin/ad-clicks/export?${params}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-gray-600">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('resultsHint', { count: adClicks.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {t('search')}
            </button>
            {search && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {t('clear')}
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('export')}
            </button>
          </form>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : adClicks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-sm">{t('table.date')}</th>
                    <th className="text-left p-3 font-semibold text-sm">{t('table.gaClientId')}</th>
                    <th className="text-left p-3 font-semibold text-sm">{t('table.gclid')}</th>
                    <th className="text-left p-3 font-semibold text-sm">{t('table.campaign')}</th>
                    <th className="text-left p-3 font-semibold text-sm">{t('table.landingPage')}</th>
                    <th className="text-left p-3 font-semibold text-sm">{t('table.domain')}</th>
                  </tr>
                </thead>
                <tbody>
                  {adClicks.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatUtcDate(row.createdAt)}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {row.gaClientId || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="p-3 font-mono text-xs">{row.gclid}</td>
                      <td className="p-3 text-sm">{row.utmCampaign || <span className="text-gray-400">—</span>}</td>
                      <td className="p-3 text-sm max-w-xs truncate" title={row.landingPage}>
                        {row.landingPage}
                      </td>
                      <td className="p-3 text-sm uppercase">{row.domain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
