'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Employee = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  createdAt: Date;
};

type Props = {
  initialEmployees: Employee[];
  ownerId: string;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
};

export function EmployeesClient({ initialEmployees, ownerId }: Props) {
  const t = useTranslations('dashboard.employees');

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function clearMessages() {
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function handleFieldChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearMessages();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setAdding(true);

    try {
      const response = await fetch('/api/dashboard/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.error ?? t('errors.addFailed'));
        return;
      }

      const newEmployee: Employee = await response.json();
      setEmployees((prev) => [...prev, newEmployee]);
      setForm(EMPTY_FORM);
      setSuccessMessage(t('success.added'));
    } catch {
      setErrorMessage(t('errors.addFailed'));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    clearMessages();
    setDeletingId(id);

    try {
      const response = await fetch(`/api/dashboard/employees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.error ?? t('errors.deleteFailed'));
        return;
      }

      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      setSuccessMessage(t('success.deleted'));
    } catch {
      setErrorMessage(t('errors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Add Employee Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('addTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('nameLabel')}
                </label>
                <Input
                  type="text"
                  placeholder={t('namePlaceholder')}
                  value={form.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  required
                  minLength={2}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('emailLabel')}
                </label>
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('passwordLabel')}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('passwordPlaceholder')}
                    value={form.password}
                    onChange={(e) =>
                      handleFieldChange('password', e.target.value)
                    }
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('phoneLabel')}
                </label>
                <Input
                  type="tel"
                  placeholder={t('phonePlaceholder')}
                  value={form.phoneNumber}
                  onChange={(e) =>
                    handleFieldChange('phoneNumber', e.target.value)
                  }
                  required
                />
              </div>
            </div>

            {successMessage && (
              <p className="text-sm font-medium text-green-600">
                {successMessage}
              </p>
            )}
            {errorMessage && (
              <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            )}

            <Button type="submit" disabled={adding}>
              {adding ? t('adding') : t('addButton')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noEmployees')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">
                      {t('tableHead.name')}
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      {t('tableHead.email')}
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      {t('tableHead.phone')}
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      {t('tableHead.joined')}
                    </th>
                    <th className="pb-3 font-medium">
                      {t('tableHead.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="py-3">
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {employee.name}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {employee.email}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {employee.countryCode} {employee.phoneNumber}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {new Date(employee.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(employee.id)}
                          disabled={deletingId === employee.id}
                        >
                          {deletingId === employee.id
                            ? t('deleting')
                            : t('deleteButton')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
