'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Banner {
  id: number;
  title: string | null;
  imageUrl: string;
  position: string;
  device: string;
  locale: string;
}

interface DeleteBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  banner: Banner | null;
}

export function DeleteBannerModal({
  isOpen,
  onClose,
  onConfirm,
  banner,
}: DeleteBannerModalProps) {
  const t = useTranslations('adminDashboard');
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('banners.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('banners.delete.description', { title: banner?.title || 'Untitled', position: banner?.position ?? '' })}
            <br />
            <br />
            {t('banners.delete.cannotUndo')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {t('banners.delete.deleteBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
