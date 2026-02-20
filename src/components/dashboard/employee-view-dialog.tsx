'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type EmployeeDetail = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  addressLine: string;
  companyName: string;
  vatNumber: string;
  country: string;
  role: string;
  emailVerified: boolean;
  createdAt: string | Date;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeDetail | null;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <span className="min-w-36 text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-600">{value || '—'}</span>
    </div>
  );
}

export function EmployeeViewDialog({ open, onOpenChange, employee }: Props) {
  if (!employee) return null;

  const createdAt =
    employee.createdAt instanceof Date
      ? employee.createdAt.toLocaleDateString()
      : new Date(employee.createdAt).toLocaleDateString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Row label="Name" value={employee.name} />
          <Row label="Email" value={employee.email} />
          <Row
            label="Phone"
            value={`${employee.countryCode ?? ''} ${employee.phoneNumber ?? ''}`}
          />
          <Row label="Company" value={employee.companyName} />
          <Row label="VAT Number" value={employee.vatNumber} />
          <Row label="Address" value={employee.addressLine} />
          <Row label="Country" value={employee.country} />
          <Row
            label="Email Verified"
            value={employee.emailVerified ? 'Yes' : 'No'}
          />
          <Row label="Joined" value={createdAt} />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
