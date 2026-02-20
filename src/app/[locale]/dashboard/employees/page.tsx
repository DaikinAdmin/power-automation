'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Pencil, Trash2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EmployeeFormDialog,
  type EmployeeFormData,
} from '@/components/dashboard/employee-form-dialog';
import {
  EmployeeViewDialog,
  type EmployeeDetail,
} from '@/components/dashboard/employee-view-dialog';
import { useSession } from '@/lib/auth-client';

type Employee = EmployeeDetail;

export default function DashboardEmployeesPage() {
  const { data: session } = useSession();
  const owner = session?.user as any;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/user/employees');
      if (!res.ok) throw new Error('Failed to load employees');
      const data = await res.json() as { employees: Employee[] };
      setEmployees(data.employees);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleAddEmployee = async (data: EmployeeFormData) => {
    const res = await fetch('/api/user/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? 'Failed to add employee');
    }
    toast.success('Employee added successfully');
    await loadEmployees();
  };

  const handleEditEmployee = async (data: EmployeeFormData) => {
    if (!editingEmployee) return;
    const res = await fetch(`/api/user/employees/${editingEmployee.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, email: data.email, phoneNumber: data.phoneNumber }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? 'Failed to update employee');
    }
    toast.success('Employee updated successfully');
    await loadEmployees();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/user/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Failed to delete employee');
      }
      toast.success('Employee deleted');
      await loadEmployees();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete employee');
    } finally {
      setDeletingId(null);
    }
  };

  const openAdd = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormOpen(true);
  };

  const openView = (emp: Employee) => {
    setViewingEmployee(emp);
    setViewOpen(true);
  };

  const canAddMore = employees.length < 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">
            Manage your company employees ({employees.length}/5 used)
          </p>
        </div>
        <Button onClick={openAdd} disabled={!canAddMore} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add New Employee
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No employees yet. Add your first employee above.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openView(emp)}
                        className="h-8 w-8 p-0"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(emp)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(emp.id)}
                        disabled={deletingId === emp.id}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
        ownerCountryCode={owner?.countryCode ?? '+48'}
        onSubmit={editingEmployee ? handleEditEmployee : handleAddEmployee}
      />

      <EmployeeViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        employee={viewingEmployee}
      />
    </div>
  );
}
