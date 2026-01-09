'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';

const LOCALES = [
  { code: 'ua', name: 'Українська' },
  { code: 'en', name: 'English' },
  { code: 'pl', name: 'Polski' },
  { code: 'es', name: 'Español' },
];

interface EditPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function EditPage({ params }: EditPageProps) {
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const [pageId, setPageId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const [formData, setFormData] = useState({
    slug: '',
    locale: 'ua',
    title: '',
    isPublished: false,
  });
  const [pageContent, setPageContent] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    params.then(p => setPageId(p.id));
  }, [params]);

  useEffect(() => {
    if (!pageId) return;
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/pages/${pageId}`);
      if (response.ok) {
        const page = await response.json();
        setFormData({
          slug: page.slug,
          locale: page.locale,
          title: page.title,
          isPublished: page.isPublished,
        });
        setPageContent(page.content);
      } else {
        alert('Помилка при завантаженні сторінки');
        router.push('/admin/pages');
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      alert('Помилка при завантаженні сторінки');
    } finally {
      setIsLoading(false);
    }
  };

  const initEditor = async (content: any) => {
    if (!isClient || isEditorReady) return;

    try {
      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const EditorJSClass = (await import('@editorjs/editorjs')).default;
      const HeaderTool = (await import('@editorjs/header')).default;
      const ListTool = (await import('@editorjs/list')).default;
      const ParagraphTool = (await import('@editorjs/paragraph')).default;
      const QuoteTool = (await import('@editorjs/quote')).default;
      const CodeTool = (await import('@editorjs/code')).default;
      const WarningTool = (await import('@editorjs/warning')).default;
      const DelimiterTool = (await import('@editorjs/delimiter')).default;
      const TableTool = (await import('@editorjs/table')).default;
      const ChecklistTool = (await import('@editorjs/checklist')).default;
      const RawTool = (await import('@editorjs/raw')).default;

      if (editorRef.current && editorRef.current.destroy) {
        await editorRef.current.destroy();
        editorRef.current = null;
      }

      const editor = new EditorJSClass({
        holder: 'editorjs',
        placeholder: 'Почніть писати або натисніть TAB для вибору блоку...',
        autofocus: true,
        tools: {
          header: {
            class: HeaderTool as any,
            config: {
              placeholder: 'Введіть заголовок',
              levels: [1, 2, 3, 4, 5, 6],
              defaultLevel: 2,
            },
          },
          paragraph: {
            class: ParagraphTool as any,
            inlineToolbar: true,
            config: {
              placeholder: 'Введіть текст...'
            }
          },
          list: {
            class: ListTool as any,
            inlineToolbar: true,
          },
          quote: QuoteTool as any,
          code: CodeTool as any,
          warning: WarningTool as any,
          delimiter: DelimiterTool as any,
          table: {
            class: TableTool as any,
            inlineToolbar: true,
          },
          checklist: ChecklistTool as any,
          raw: RawTool as any,
        },
        data: content || { blocks: [] },
        onReady: () => {
          console.log('Editor.js is ready to work!');
          editorRef.current = editor;
          setIsEditorReady(true);
        },
      });

    } catch (error) {
      console.error('Error initializing editor:', error);
    }
  };

  useEffect(() => {
    if (!isClient || isEditorReady || isLoading || !pageContent) return;
    
    // Initialize editor once client-side and data is loaded
    if (formData.slug) {
      initEditor(pageContent);
    }
  }, [isClient, isEditorReady, isLoading, pageContent, formData.slug]);

  useEffect(() => {
    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      alert('Заповніть заголовок');
      return;
    }

    try {
      setIsSaving(true);
      const content = await editorRef.current.save();

      const response = await fetch(`/api/admin/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: content,
          isPublished: formData.isPublished,
        }),
      });

      if (response.ok) {
        router.push('/admin/pages');
      } else {
        const error = await response.json();
        alert(`Помилка: ${error.error || 'Не вдалося оновити сторінку'}`);
      }
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Помилка при оновленні сторінки');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSaving}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Редагувати сторінку</h1>
          <p className="text-muted-foreground">
            {formData.slug} ({LOCALES.find(l => l.code === formData.locale)?.name})
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={formData.slug} disabled />
              </div>

              <div className="space-y-2">
                <Label>Мова</Label>
                <Input 
                  value={LOCALES.find(l => l.code === formData.locale)?.name} 
                  disabled 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Заголовок <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Про нас"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPublished: checked })
                }
              />
              <Label htmlFor="isPublished">
                {formData.isPublished ? 'Опубліковано' : 'Чернетка'}
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Контент</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              id="editorjs" 
              className="prose max-w-none border rounded-lg p-4 min-h-[400px]"
              style={{ 
                '--tw-prose-body': '#374151',
                '--tw-prose-headings': '#111827',
              } as any}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Скасувати
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Збереження...' : 'Зберегти зміни'}
          </Button>
        </div>
      </form>
    </div>
  );
}
