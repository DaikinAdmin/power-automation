'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormError from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';

interface DiscountLevel {
  id: string;
  level: number;
  discountPercentage: number;
  createdAt: string;
  updatedAt: string;
}

interface DiscountLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  discountLevel?: DiscountLevel | null;
}

export function DiscountLevelModal({
  isOpen,
  onClose,
  onSuccess,
  discountLevel,
}: DiscountLevelModalProps) {
  const [formData, setFormData] = useState({
    level: '',
    discountPercentage: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEditing = !!discountLevel;

  useEffect(() => {
    if (isOpen) {
      if (discountLevel) {
        setFormData({
          level: discountLevel.level.toString(),
          discountPercentage: discountLevel.discountPercentage.toString(),
        });
      } else {
        setFormData({
          level: '',
          discountPercentage: '',
        });
      }
      setError('');
      setSuccess('');

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
  }, [isOpen, discountLevel, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const level = parseInt(formData.level);
      const discountPercentage = parseFloat(formData.discountPercentage);

      if (isNaN(level) || level < 1) {
        setError('Level must be a positive number');
        setLoading(false);
        return;
      }

      if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
        setError('Discount percentage must be between 0 and 100');
        setLoading(false);
        return;
      }

      const url = isEditing 
        ? `/api/admin/discount-levels/${discountLevel?.id}`
        : '/api/admin/discount-levels';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          discountPercentage,
        }),
      });

      if (response.ok) {
        setSuccess(`Discount level ${isEditing ? 'updated' : 'created'} successfully!`);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} discount level`);
      }
    } catch (error) {
      console.error('Error saving discount level:', error);
      setError(`Failed to ${isEditing ? 'update' : 'create'} discount level`);
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? 'Edit Discount Level' : 'Add New Discount Level'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="level">Level</Label>
                <Input
                  id="level"
                  name="level"
                  type="number"
                  value={formData.level}
                  onChange={handleInputChange}
                  placeholder="e.g., 1, 2, 3..."
                  min="1"
                  required
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Numeric level identifier (must be unique)
                </p>
              </div>

              <div>
                <Label htmlFor="discountPercentage">Discount Percentage</Label>
                <Input
                  id="discountPercentage"
                  name="discountPercentage"
                  type="number"
                  value={formData.discountPercentage}
                  onChange={handleInputChange}
                  placeholder="e.g., 5, 10, 15..."
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Percentage discount for this level (0-100%)
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
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                    </div>
                  ) : (
                    isEditing ? 'Update Level' : 'Create Level'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
