'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function DeleteCategoryModal({ isOpen, onClose, onConfirm, category }: DeleteCategoryModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!category) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/categories/${category.slug}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to delete category');
        return;
      }

      onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">Delete Category</DialogTitle>
              <DialogDescription className="mt-2">
                Are you sure you want to delete <strong>"{category?.name}"</strong>? 
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
