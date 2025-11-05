'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface OrderStatusFormProps {
  orderId: string;
  initialStatus: string;
  initialDeliveryId?: string | null;
  statusOptions: string[];
  canUpdate: boolean;
}

export function OrderStatusForm({
  orderId,
  initialStatus,
  initialDeliveryId,
  statusOptions,
  canUpdate,
}: OrderStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [deliveryId, setDeliveryId] = useState(initialDeliveryId ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresDeliveryId = status === 'DELIVERY';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUpdate || isSubmitting) return;

    if (requiresDeliveryId && deliveryId.trim().length === 0) {
      toast.error('Delivery ID is required when status is set to DELIVERY');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          deliveryId: requiresDeliveryId ? deliveryId.trim() : deliveryId?.trim() ?? null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to update order' }));
        throw new Error(data.error || 'Failed to update order');
      }

      toast.success('Order updated successfully');
      router.refresh();
    } catch (error: any) {
      console.error('Order update error:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="order-status" className="block text-sm font-medium text-gray-700">
          Order Status
        </label>
        <select
          id="order-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          disabled={!canUpdate || isSubmitting}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {requiresDeliveryId && (
        <div>
          <label htmlFor="delivery-id" className="block text-sm font-medium text-gray-700">
            Delivery ID
          </label>
          <input
            id="delivery-id"
            type="text"
            value={deliveryId}
            onChange={(event) => setDeliveryId(event.target.value)}
            disabled={!canUpdate || isSubmitting}
            placeholder="Enter delivery ticket ID"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!canUpdate || isSubmitting}
        className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Updating…' : 'Update Order'}
      </button>

      {!canUpdate && (
        <p className="text-xs text-gray-500">You do not have permission to update this order.</p>
      )}
    </form>
  );
}
