'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

interface PageContent {
  id: number;
  slug: string;
  locale: string;
  title: string;
  isPublished: boolean;
  updatedAt: string;
}

interface GroupedPages {
  [slug: string]: PageContent[];
}

const LOCALES = [
  { code: 'ua', name: 'Українська' },
  { code: 'en', name: 'English' },
  { code: 'pl', name: 'Polski' },
  { code: 'es', name: 'Español' },
];

export default function PagesAdminPage() {
  const router = useRouter();
  const [groupedPages, setGroupedPages] = useState<GroupedPages>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/pages');
      if (response.ok) {
        const data = await response.json();
        setGroupedPages(data);
      } else {
        console.error('Failed to fetch pages');
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Ви впевнені, що хочете видалити цю сторінку?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPages();
      } else {
        alert('Помилка при видаленні сторінки');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Помилка при видаленні сторінки');
    }
  };

  const togglePublish = async (page: PageContent) => {
    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !page.isPublished,
        }),
      });

      if (response.ok) {
        fetchPages();
      } else {
        alert('Помилка при оновленні статусу публікації');
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
      alert('Помилка при оновленні статусу публікації');
    }
  };

  const getPageByLocale = (pages: PageContent[], locale: string) => {
    return pages.find(p => p.locale === locale);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управління сторінками</h1>
          <p className="text-muted-foreground">
            Створюйте та редагуйте статичні сторінки для різних мов
          </p>
        </div>
        <Button onClick={() => router.push('/admin/pages/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Створити нову сторінку
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.entries(groupedPages).map(([slug, pages]) => (
          <Card key={slug}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{slug.replace(/-/g, ' ')}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Slug: {slug}
                </span>
              </CardTitle>
              <CardDescription>
                Доступні переклади: {pages.length} з {LOCALES.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {LOCALES.map(locale => {
                  const page = getPageByLocale(pages, locale.code);
                  
                  if (page) {
                    return (
                      <div
                        key={locale.code}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{locale.name}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              page.isPublished
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {page.isPublished ? 'Опубліковано' : 'Чернетка'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {page.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Оновлено: {new Date(page.updatedAt).toLocaleDateString('uk-UA')}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/pages/${page.id}/edit`)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Редагувати
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePublish(page)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {page.isPublished ? 'Приховати' : 'Показати'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(page.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={locale.code}
                        className="border border-dashed rounded-lg p-4 space-y-3 bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">
                            {locale.name}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                            Відсутня
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Переклад не створено
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            router.push(`/admin/pages/new?slug=${slug}&locale=${locale.code}`)
                          }
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Створити
                        </Button>
                      </div>
                    );
                  }
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(groupedPages).length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Сторінок поки немає. Створіть першу!
                </p>
                <Button onClick={() => router.push('/admin/pages/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Створити сторінку
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
