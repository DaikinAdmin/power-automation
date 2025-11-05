'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import FormError from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { AlertTriangle } from 'lucide-react';

interface DiscountLevel {
  id: string;
  level: number;
  discountPercentage: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
}

interface DeleteDiscountLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  discountLevel: DiscountLevel | null;
}

export function DeleteDiscountLevelModal({
  isOpen,
  onClose,
  onSuccess,
  discountLevel,
}: DeleteDiscountLevelModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Add escape key listener
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const handleDelete = async () => {
    if (!discountLevel) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/discount-levels/${discountLevel.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Discount level deleted successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete discount level');
      }
    } catch (error) {
      console.error('Error deleting discount level:', error);
      setError('Failed to delete discount level');
    } finally {
      setLoading(false);
    }
  };

  if (!discountLevel) return null;

  const hasUsers = (discountLevel._count?.users || 0) > 0;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delete Discount Level</h2>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>Level {discountLevel.level}</strong> with{' '}
                <strong>{discountLevel.discountPercentage}% discount</strong>?
              </p>

              {hasUsers && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Warning: Users Affected
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          This discount level is currently assigned to{' '}
                          <strong>{discountLevel._count?.users} user(s)</strong>. 
                          Deleting it will remove the discount level from all affected users.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>

            <FormError message={error} />
            <FormSuccess message={success} />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </div>
                ) : (
                  'Delete Level'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
