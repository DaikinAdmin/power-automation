'use client';

import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface ListActionButtonsProps<T> {
  item: T;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}

export function ListActionButtons<T>({ item, onEdit, onDelete }: ListActionButtonsProps<T>) {
  const handleEdit = () => onEdit(item);
  const handleDelete = () => onDelete(item);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleEdit}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
