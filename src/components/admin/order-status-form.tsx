'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
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
  const t = useTranslations('adminDashboard');
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

      const data = await response.json();

      if (status === 'PROCESSING') {
        const order = data.order;
        const lineItems = Array.isArray(order?.lineItems) ? order.lineItems : [];

        // Parse formatted totalPrice string (e.g. "1 250,00 PLN") for value + currency
        const totalPriceStr: string | null = order?.totalPrice ?? null;
        const currencyMatch = totalPriceStr?.match(/([A-Z]{3})\s*$/);
        const parsedCurrency = currencyMatch ? currencyMatch[1] : null;
        const parsedAmount = parsedCurrency
          ? parseFloat(totalPriceStr!.replace(parsedCurrency, '').trim().replace(/\s/g, '').replace(',', '.'))
          : NaN;

        const value = data.currency && order?.payment?.amount
          ? order.payment.amount / 100
          : (!isNaN(parsedAmount) ? parsedAmount : (order?.originalTotalPrice ?? 0));
        const currency = data.currency ?? parsedCurrency ?? 'EUR';

        // const w = window as any;
        // w.dataLayer = w.dataLayer || [];
        // w.dataLayer.push({ ecommerce: null });
        // w.dataLayer.push({
        //   event: 'purchase',
        //   ecommerce: {
        //     transaction_id: order?.id ?? orderId,
        //     value,
        //     currency,
        //     shipping: 0,
        //     items: lineItems.map((item: any) => ({
        //       item_id: item.articleId,
        //       item_name: item.name,
        //       price: item.unitPrice ?? 0,
        //       quantity: item.quantity ?? 1,
        //     })),
        //   },
        // });
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
          {t('orderStatus.statusLabel')}
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
            {t('orderStatus.deliveryId')}
          </label>
          <input
            id="delivery-id"
            type="text"
            value={deliveryId}
            onChange={(event) => setDeliveryId(event.target.value)}
            disabled={!canUpdate || isSubmitting}
            placeholder={t('orderStatus.deliveryPlaceholder')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!canUpdate || isSubmitting}
        className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t('orderStatus.updating') : t('orderStatus.updateBtn')}
      </button>

      {!canUpdate && (
        <p className="text-xs text-gray-500">{t('orderStatus.noPermission')}</p>
      )}
    </form>
  );
}
