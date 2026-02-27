'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Category } from '@/helpers/types/item';

const LOCALES = ['pl', 'en', 'es', 'ua'] as const;
type Locale = typeof LOCALES[number];

type TranslationMap = Record<Locale, string>;

type SubcategoryEntry = {
  name: string;
  slug: string;
  isVisible: boolean;
  translations: TranslationMap;
};

const emptyTranslations = (): TranslationMap => ({ pl: '', en: '', es: '', ua: '' });

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  isVisible: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  category: Category | null;
  mode: 'create' | 'edit';
}

export function CategoryModal({ isOpen, onClose, onSave, category, mode }: CategoryModalProps) {
  const [subcategories, setSubcategories] = useState<SubcategoryEntry[]>([]);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [expandedSubIndex, setExpandedSubIndex] = useState<number | null>(null);
  const [categoryTranslations, setCategoryTranslations] = useState<TranslationMap>(emptyTranslations());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      isVisible: true,
    },
  });

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (isOpen) {
      setExpandedSubIndex(null);
      setNewSubcategoryName('');
      setError('');

      if (mode === 'edit' && category) {
        form.reset({
          name: category.name,
          slug: category.slug,
          isVisible: category.isVisible ?? true,
        });

        // Load category translations
        const transMap = emptyTranslations();
        for (const t of category.categoryTranslations || []) {
          if (LOCALES.includes(t.locale as Locale)) {
            transMap[t.locale as Locale] = t.name;
          }
        }
        setCategoryTranslations(transMap);

        // Load subcategories with their translations
        const mappedSubs: SubcategoryEntry[] = (category.subCategories || []).map((sub) => {
          const subTransMap = emptyTranslations();
          for (const t of sub.translations || []) {
            if (LOCALES.includes(t.locale as Locale)) {
              subTransMap[t.locale as Locale] = t.name;
            }
          }
          return {
            name: sub.name,
            slug: sub.slug,
            isVisible: sub.isVisible ?? true,
            translations: subTransMap,
          };
        });
        setSubcategories(mappedSubs);
      } else {
        form.reset({ name: '', slug: '', isVisible: true });
        setCategoryTranslations(emptyTranslations());
        setSubcategories([]);
      }
    }
  }, [isOpen, mode, category, form]);

  const handleNameChange = (name: string) => {
    form.setValue('slug', generateSlug(name));
  };

  const addSubcategory = () => {
    const trimmed = newSubcategoryName.trim();
    if (trimmed && !subcategories.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      const entry: SubcategoryEntry = {
        name: trimmed,
        slug: generateSlug(trimmed),
        isVisible: true,
        translations: emptyTranslations(),
      };
      const updated = [...subcategories, entry];
      setSubcategories(updated);
      setNewSubcategoryName('');
      setExpandedSubIndex(updated.length - 1);
    }
  };

  const removeSubcategory = (index: number) => {
    setSubcategories((prev) => prev.filter((_, i) => i !== index));
    if (expandedSubIndex === index) setExpandedSubIndex(null);
  };

  const updateSubcategory = (index: number, patch: Partial<SubcategoryEntry>) => {
    setSubcategories((prev) =>
      prev.map((sub, i) => (i === index ? { ...sub, ...patch } : sub))
    );
  };

  const updateSubTranslation = (index: number, locale: Locale, value: string) => {
    setSubcategories((prev) =>
      prev.map((sub, i) =>
        i === index ? { ...sub, translations: { ...sub.translations, [locale]: value } } : sub
      )
    );
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const url =
        mode === 'create' ? '/api/admin/categories' : `/api/admin/categories/${category?.slug}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const translationsArr = LOCALES.flatMap((locale) =>
        categoryTranslations[locale].trim()
          ? [{ locale, name: categoryTranslations[locale].trim() }]
          : []
      );

      const subcategoryPayload = subcategories.map((sub) => ({
        name: sub.name,
        slug: sub.slug,
        isVisible: sub.isVisible,
        translations: LOCALES.flatMap((locale) =>
          sub.translations[locale].trim()
            ? [{ locale, name: sub.translations[locale].trim() }]
            : []
        ),
      }));

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          translations: translationsArr,
          subcategory: subcategoryPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Something went wrong');
        return;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Category' : 'Edit Category'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new category for your products.'
              : 'Update the category information and translations.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Category Name + Slug */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Category name"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleNameChange(e.target.value);
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="category-slug" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category Translations */}
            <div className="space-y-2">
              <Label>Category Translations</Label>
              <Tabs defaultValue="pl">
                <TabsList className="grid grid-cols-4 w-full">
                  {LOCALES.map((locale) => (
                    <TabsTrigger key={locale} value={locale} className="uppercase text-xs">
                      {locale}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LOCALES.map((locale) => (
                  <TabsContent key={locale} value={locale}>
                    <Input
                      placeholder={`Category name in ${locale.toUpperCase()}`}
                      value={categoryTranslations[locale]}
                      onChange={(e) =>
                        setCategoryTranslations((prev) => ({ ...prev, [locale]: e.target.value }))
                      }
                      disabled={isLoading}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Subcategories */}
            <div className="space-y-2">
              <Label>Subcategories</Label>

              {/* Add new subcategory */}
              <div className="flex gap-2">
                <Input
                  placeholder="New subcategory name"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubcategory();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  onClick={addSubcategory}
                  disabled={!newSubcategoryName.trim() || isLoading}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Subcategory list */}
              {subcategories.length > 0 && (
                <div className="space-y-1 max-h-72 overflow-y-auto border rounded-md p-2">
                  {subcategories.map((sub, index) => (
                    <div key={index} className="border rounded bg-white">
                      {/* Subcategory header row */}
                      <div className="flex items-center justify-between px-3 py-2">
                        <button
                          type="button"
                          className="flex items-center gap-2 flex-1 text-left"
                          onClick={() =>
                            setExpandedSubIndex(expandedSubIndex === index ? null : index)
                          }
                        >
                          {expandedSubIndex === index ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="text-sm font-medium">{sub.name}</span>
                          <span className="text-xs text-gray-400">/{sub.slug}</span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubcategory(index)}
                          disabled={isLoading}
                          className="shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      {/* Expanded editing area */}
                      {expandedSubIndex === index && (
                        <div className="border-t px-3 pb-3 pt-2 space-y-3 bg-gray-50">
                          {/* Name + Slug */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input
                                value={sub.name}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  updateSubcategory(index, {
                                    name: newName,
                                    slug: generateSlug(newName),
                                  });
                                }}
                                disabled={isLoading}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Slug</Label>
                              <Input
                                value={sub.slug}
                                onChange={(e) =>
                                  updateSubcategory(index, { slug: e.target.value })
                                }
                                disabled={isLoading}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          {/* Visibility */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={sub.isVisible}
                              onCheckedChange={(val) =>
                                updateSubcategory(index, { isVisible: val })
                              }
                              disabled={isLoading}
                            />
                            <Label className="text-xs">Visible</Label>
                          </div>

                          {/* Subcategory Translations */}
                          <div className="space-y-1">
                            <Label className="text-xs">Translations</Label>
                            <Tabs defaultValue="pl">
                              <TabsList className="grid grid-cols-4 w-full h-7">
                                {LOCALES.map((locale) => (
                                  <TabsTrigger
                                    key={locale}
                                    value={locale}
                                    className="uppercase text-xs py-0"
                                  >
                                    {locale}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                              {LOCALES.map((locale) => (
                                <TabsContent key={locale} value={locale}>
                                  <Input
                                    placeholder={`Name in ${locale.toUpperCase()}`}
                                    value={sub.translations[locale]}
                                    onChange={(e) =>
                                      updateSubTranslation(index, locale, e.target.value)
                                    }
                                    disabled={isLoading}
                                    className="h-8 text-sm"
                                  />
                                </TabsContent>
                              ))}
                            </Tabs>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility Toggle */}
            <FormField
              control={form.control}
              name="isVisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Display Category</FormLabel>
                    <div className="text-sm text-gray-600">Show this category on the website</div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? 'Saving...'
                  : mode === 'create'
                  ? 'Create Category'
                  : 'Update Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
