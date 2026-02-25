'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type EmployeeFormData = {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode */
  employee?: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
  } | null;
  /** Owner's country code (e.g. "+48") */
  ownerCountryCode: string;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
};

export function EmployeeFormDialog({ open, onOpenChange, employee, ownerCountryCode, onSubmit }: Props) {
  const isEdit = Boolean(employee);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email);
      setPhoneNumber(employee.phoneNumber ?? '');
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPhoneNumber('');
      setPassword('');
    }
    setError(null);
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !phoneNumber.trim()) {
      setError('Name, email and phone number are required.');
      return;
    }
    if (!isEdit && !password.trim()) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), phoneNumber: phoneNumber.trim(), password: password.trim() });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="emp-name">Name</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="emp-phone">Phone Number</Label>
            <div className="flex gap-2">
              <Input
                className="w-20 shrink-0"
                value={ownerCountryCode}
                readOnly
                tabIndex={-1}
              />
              <Input
                id="emp-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="123 456 789"
                required
              />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="emp-password">Password</Label>
              <Input
                id="emp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
                maxLength={20}
                required
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
