'use client';

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
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the banner{' '}
            <span className="font-semibold">
              "{banner?.title || 'Untitled'}"
            </span>{' '}
            from position <span className="font-semibold">{banner?.position}</span>.
            <br />
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete Banner
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
