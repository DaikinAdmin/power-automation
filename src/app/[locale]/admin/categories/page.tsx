'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryModal } from '@/components/admin/category-modal';
import { DeleteCategoryModal } from '@/components/admin/delete-category-modal';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Category } from '@/helpers/types/item';
import { ListActionButtons } from '@/components/admin/list-action-buttons';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate pagination
  const totalPages = Math.ceil(categories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategories = categories.slice(startIndex, endIndex);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = () => {
    setModalMode('create');
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setModalMode('edit');
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setDeletingCategory(null);
  };

  const handleSaveSuccess = () => {
    fetchCategories();
    // Reset to first page when data changes
    setCurrentPage(1);
  };

  const handleDeleteSuccess = () => {
    fetchCategories();
    // If current page becomes empty after deletion, go to previous page
    const newTotalPages = Math.ceil((categories.length - 1) / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  // Pagination handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories Management</h1>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }
  const categoryStats = {
    total: categories.length,
    visible: categories.filter(cat => cat.isVisible).length,
    hidden: categories.filter(cat => cat.isVisible === false).length,
    withSubcategories: categories.filter(cat => cat.subCategories.length > 0).length,
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories Management</h1>
          <p className="text-gray-600">
            Manage product categories and subcategories.
          </p>
        </div>
        <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700">
          Add New Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.visible}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.hidden}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Subcategories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.withSubcategories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      <Card className='h-[500px]'>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            A list of all product categories in your store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Slug</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Subcategories</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Visibility</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className='h-full'>
                {currentCategories.map((category) => (
                  <tr key={category.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{category.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">/{category.slug}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {category.subCategories.length > 0 ? (
                          category.subCategories.slice(0, 3).map((sub: { name: string }, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {sub.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No subcategories</span>
                        )}
                        {category.subCategories.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{category.subCategories.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {category.isVisible ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${category.isVisible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {category.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <ListActionButtons
                        item={category}
                        onEdit={handleEditCategory}
                        onDelete={handleDeleteCategory}
                      />
                    </td>
                  </tr>
                ))}
                {currentCategories.length === 0 && categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No categories found. Add your first category to get started.
                    </td>
                  </tr>
                )}
                {currentCategories.length === 0 && categories.length > 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No categories on this page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {categories.length > itemsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, categories.length)}</span> of{' '}
                <span className="font-medium">{categories.length}</span> results
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageClick(page)}
                      className={`w-8 h-8 p-0 ${currentPage === page
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : ''
                        }`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveSuccess}
        category={editingCategory || null}
        mode={modalMode}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteSuccess}
        category={deletingCategory}
      />
    </div>
  );
}
