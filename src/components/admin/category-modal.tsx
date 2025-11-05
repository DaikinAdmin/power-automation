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
import { X, Plus, Trash2 } from 'lucide-react';
import { Category } from '@/helpers/types/item';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  subcategory: z.array(z.object({
    name: z.string().min(1, 'Subcategory name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    isVisible: z.boolean().default(true),
  })).default([]),
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
  const [subcategories, setSubcategories] = useState<Array<{ name: string; slug: string; isVisible: boolean }>>([]);
  const [newSubcategory, setNewSubcategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      subcategory: [],
      isVisible: true,
    },
  });

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && category) {
        const mappedSubs = category.subCategories?.map(sub => ({
          name: sub.name,
          slug: sub.slug,
          isVisible: sub.isVisible ?? true,
        })) || [];
        form.reset({
          name: category.name,
          slug: category.slug,
          subcategory: mappedSubs,
          isVisible: category.isVisible ?? true,
        });
        setSubcategories(mappedSubs);
      } else {
        form.reset({
          name: '',
          slug: '',
          subcategory: [],
          isVisible: true,
        });
        setSubcategories([]);
      }
      setNewSubcategory('');
      setError('');
    }
  }, [isOpen, mode, category, form]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    const slug = generateSlug(name);
    form.setValue('slug', slug);
  };

  const addSubcategory = () => {
    const trimmed = newSubcategory.trim();
    if (trimmed && !subcategories.find((sub) => sub.name.toLowerCase() === trimmed.toLowerCase())) {
      const slug = generateSlug(trimmed);
      const updated = [...subcategories, { name: trimmed, slug, isVisible: true }];
      setSubcategories(updated);
      form.setValue('subcategory', updated, { shouldDirty: true });
      setNewSubcategory('');
    }
  };

  const removeSubcategory = (index: number) => {
    const updated = subcategories.filter((_, i) => i !== index);
    setSubcategories(updated);
    form.setValue('subcategory', updated, { shouldDirty: true });
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const url = mode === 'create' 
        ? '/api/admin/categories'
        : `/api/admin/categories/${category?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          subcategory: subcategories,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Something went wrong');
        return;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Category' : 'Edit Category'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new category for your products.' 
              : 'Update the category information.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter category name"
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

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="category-slug"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subcategories */}
            <div className="space-y-2">
              <Label>Subcategories</Label>
              
              {/* Add new subcategory */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add subcategory"
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  onKeyPress={(e) => {
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
                  disabled={!newSubcategory.trim() || isLoading}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* List of subcategories */}
              {subcategories.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {subcategories.map((sub, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-700">{sub.name}</div>
                        <div className="text-xs text-gray-500">{sub.slug}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubcategory(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
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
                    <div className="text-sm text-gray-600">
                      Show this category on the website
                    </div>
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
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : mode === 'create' ? 'Create Category' : 'Update Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
