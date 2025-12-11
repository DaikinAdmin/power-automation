'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { DiscountLevelModal, DeleteDiscountLevelModal } from '@/components/admin';

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

export default function DiscountLevelsPage() {
  const router = useRouter();
  const [discountLevels, setDiscountLevels] = useState<DiscountLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDiscountLevel, setSelectedDiscountLevel] = useState<DiscountLevel | null>(null);

  useEffect(() => {
    fetchDiscountLevels();
  }, []);

  const fetchDiscountLevels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/discount-levels');
      if (response.ok) {
        const data = await response.json();
        setDiscountLevels(data);
      } else {
        console.error('Failed to fetch discount levels');
      }
    } catch (error) {
      console.error('Error fetching discount levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedDiscountLevel(null);
    setIsModalOpen(true);
  };

  const handleEdit = (discountLevel: DiscountLevel) => {
    setSelectedDiscountLevel(discountLevel);
    setIsModalOpen(true);
  };

  const handleDelete = (discountLevel: DiscountLevel) => {
    setSelectedDiscountLevel(discountLevel);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDiscountLevel(null);
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setSelectedDiscountLevel(null);
  };

  const handleModalSuccess = () => {
    fetchDiscountLevels();
    handleModalClose();
  };

  const handleDeleteSuccess = () => {
    fetchDiscountLevels();
    handleDeleteModalClose();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Levels</h1>
          <p className="text-gray-600 mt-1">Manage customer discount levels and percentages</p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center space-x-2">
          <Plus size={16} />
          <span>Add New Level</span>
        </Button>
      </div>

      {discountLevels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No discount levels found</div>
          <p className="text-gray-400 mb-4">Create your first discount level to get started</p>
          <Button onClick={handleAddNew}>
            <Plus size={16} className="mr-2" />
            Add New Level
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {discountLevels.map((discountLevel) => (
                <tr key={discountLevel.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {discountLevel.level}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          Level {discountLevel.level}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {discountLevel.discountPercentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {discountLevel._count?.users || 0} users
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(discountLevel.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(discountLevel)}
                        className="flex items-center"
                        title="Edit discount level"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(discountLevel)}
                        className="flex items-center text-red-600 hover:text-red-900 hover:border-red-300"
                        title="Delete discount level"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DiscountLevelModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        discountLevel={selectedDiscountLevel}
      />

      <DeleteDiscountLevelModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onSuccess={handleDeleteSuccess}
        discountLevel={selectedDiscountLevel}
      />
    </div>
  );
}
