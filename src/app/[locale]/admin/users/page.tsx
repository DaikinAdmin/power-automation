'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { ListActionButtons } from '@/components/admin/list-action-buttons';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: Date | null;
  companyName: string | null;
  vatNumber?: string;
  userType?: string;
  phoneNumber?: string;
  countryCode?: string;
  addressLine?: string;
  country?: string;
  discountLevel: number | null;
  createdAt: Date;
}

// Edit User Modal Component
function EditUserModal({ 
  user, 
  isOpen, 
  onClose, 
  onUpdate 
}: { 
  user: User | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onUpdate: (userData: any) => void 
}) {
  const [formData, setFormData] = useState({
    role: '',
    emailVerified: false,
    discountLevel: ''
  });
  const [originalData, setOriginalData] = useState({
    role: '',
    emailVerified: false,
    discountLevel: ''
  });
  const t = useTranslations('adminDashboard');

  useEffect(() => {
    if (user) {
      const userData = {
        role: user.role,
        emailVerified: !!user.emailVerified,
        discountLevel: user.discountLevel?.toString() || ''
      };
      setFormData(userData);
      setOriginalData(userData);
    }
  }, [user]);

  const handleUpdate = () => {
    onUpdate({
      role: formData.role,
      emailVerified: formData.emailVerified,
      discountLevel: formData.discountLevel ? parseInt(formData.discountLevel) : null
    });
  };

  const handleRevert = () => {
    setFormData(originalData);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('users.edit.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
          {/* Read-only fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">{t('users.edit.id')}</Label>
            <div className="col-span-3 text-sm text-gray-600 font-mono">{user.id}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">{t('users.edit.name')}</Label>
            <div className="col-span-3 text-sm">{user.name}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">{t('users.edit.email')}</Label>
            <div className="col-span-3 text-sm">{user.email}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">{t('users.edit.company')}</Label>
            <div className="col-span-3 text-sm">{user.companyName || t('users.edit.noCompany')}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">{t('users.edit.userType')}</Label>
            <div className="col-span-3 text-sm">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                user.userType === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {user.userType === 'company' ? t('users.edit.userTypeCompany') : t('users.edit.userTypePrivate')}
              </span>
            </div>
          </div>
          {user.phoneNumber && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">{t('users.edit.phone')}</Label>
              <div className="col-span-3 text-sm">{user.countryCode}{user.phoneNumber}</div>
            </div>
          )}
          {user.vatNumber && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">{t('users.edit.vatNumber')}</Label>
              <div className="col-span-3 text-sm font-mono">{user.vatNumber}</div>
            </div>
          )}
          {user.addressLine && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">{t('users.edit.address')}</Label>
              <div className="col-span-3 text-sm">{user.addressLine}</div>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">{t('users.edit.created')}</Label>
            <div className="col-span-3 text-sm">{format(new Date(user.createdAt), 'MMM dd, yyyy HH:mm')}</div>
          </div>
          
          <div className="border-t pt-4 mt-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('users.edit.editableFields')}</h3>
            
            {/* Editable fields */}
            <div className="grid grid-cols-4 items-center gap-4 mb-4">
              <Label htmlFor="role" className="text-right">
                {t('users.edit.role')}
              </Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('users.edit.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('users.edit.roleUser')}</SelectItem>
                  <SelectItem value="employee">{t('users.edit.roleEmployee')}</SelectItem>
                  <SelectItem value="admin">{t('users.edit.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mb-4">
              <Label htmlFor="emailVerified" className="text-right">
                {t('users.edit.emailVerified')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  id="emailVerified"
                  checked={formData.emailVerified}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailVerified: checked }))}
                />
                <span className="text-sm text-gray-600">
                  {formData.emailVerified ? t('users.edit.verified') : t('users.edit.notVerified')}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discountLevel" className="text-right">
                {t('users.edit.discountLevel')}
              </Label>
              <Input
                id="discountLevel"
                type="number"
                value={formData.discountLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, discountLevel: e.target.value }))}
                className="col-span-3"
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleRevert}>
            {t('users.edit.revert')}
          </Button>
          <Button onClick={handleUpdate}>
            {t('users.edit.update')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Delete User Modal Component
function DeleteUserModal({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  user: User | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: (user: User) => void 
}) {
  const t = useTranslations('adminDashboard');
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('users.delete.title')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('users.delete.description')}
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm">
              <div className="font-medium">{user.name}</div>
              <div className="text-gray-600">{user.email}</div>
              <div className="text-xs text-gray-500 mt-1">
                {t('users.delete.role')}: {user.role} | {t('users.delete.created')}: {format(new Date(user.createdAt), 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('users.delete.cancel')}
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(user)}>
            {t('users.delete.deleteBtn')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const t = useTranslations('adminDashboard');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers();
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleUpdateUser = async (userData: any) => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        await fetchUsers();
        setIsEditModalOpen(false);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const userStats = {
    total: users.length,
    verified: users.filter(user => user.emailVerified).length,
    admins: users.filter(user => user.role === 'admin').length,
    employers: users.filter(user => user.role === 'employee').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('users.title')}</h1>
        <p className="text-gray-600">
          {t('users.description')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.stats.total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.stats.verified')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.verified}</div>
            <p className="text-xs text-gray-600">
              {t('users.stats.verifiedPct', { pct: userStats.total > 0 ? Math.round((userStats.verified / userStats.total) * 100) : 0 })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.stats.admins')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.admins}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.stats.employers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.employers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('users.table.header')}</CardTitle>
          <CardDescription>
            {t('users.table.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.table.name')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.table.email')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.edit.userType')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.table.company')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.edit.phone')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.table.role')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.table.status')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.table.joined')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('users.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{user.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.userType === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.userType === 'company' ? t('users.edit.userTypeCompany') : t('users.edit.userTypePrivate')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {user.companyName ? (
                        <span className="font-medium">{user.companyName}</span>
                      ) : (
                        <span className="text-gray-400 italic">{t('users.table.noCompany')}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {user.phoneNumber ? `${user.countryCode ?? ''}${user.phoneNumber}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : user.role === 'employee'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.emailVerified 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.emailVerified ? t('users.table.verified') : t('users.table.unverified')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                        <ListActionButtons
                          item={user}
                          onEdit={handleEditUser}
                          onDelete={handleDeleteUser}
                        />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <EditUserModal
        user={selectedUser}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdate={handleUpdateUser}
      />

      <DeleteUserModal
        user={selectedUser}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
