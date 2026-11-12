'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { useOrderTranslations } from '@/helpers/use-translations';

export type OrderStatusUpdate = {
  status?: string;
  deliveryId?: string | null;
  lineItems?: any[] | null;
  notes?: any[] | null;
};

interface OrderStatusFormProps {
  orderId: string;
  initialStatus: string;
  initialDeliveryId?: string | null;
  statusOptions: string[];
  canUpdate: boolean;
  // True while the order still holds units written off from the warehouse —
  // cancelling such an order asks whether to return them.
  hasDeductedStock?: boolean;
  onUpdated?: (update: OrderStatusUpdate) => void;
}

export function OrderStatusForm({
  orderId,
  initialStatus,
  initialDeliveryId,
  statusOptions,
  canUpdate,
  hasDeductedStock = false,
  onUpdated,
}: OrderStatusFormProps) {
  const t = useTranslations('adminDashboard');
  const tr = useOrderTranslations();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [deliveryId, setDeliveryId] = useState(initialDeliveryId ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStockPrompt, setShowStockPrompt] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const requiresDeliveryId = status === 'DELIVERY';
  const canReturnStockNow = canUpdate && initialStatus === 'CANCELLED' && hasDeductedStock;

  const submitStatus = async (restoreStock?: boolean) => {
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
          ...(restoreStock !== undefined ? { restoreStock } : {}),
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

      (data.warnings ?? []).forEach((w: string) => toast.warning(w));
      toast.success(
        restoreStock ? t('orderStatus.stockReturn.returned') : 'Order updated successfully',
      );
      onUpdated?.({
        status: data.order?.status,
        deliveryId: data.order?.deliveryId,
        lineItems: data.order?.lineItems,
        notes: data.order?.notes,
      });
      router.refresh();
    } catch (error: any) {
      console.error('Order update error:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsSubmitting(false);
      setShowStockPrompt(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUpdate || isSubmitting) return;

    if (requiresDeliveryId && deliveryId.trim().length === 0) {
      toast.error('Delivery ID is required when status is set to DELIVERY');
      return;
    }

    // Cancelling an order that still holds stock: ask what to do with it
    // before saving anything.
    if (status === 'CANCELLED' && hasDeductedStock) {
      setShowStockPrompt(true);
      return;
    }

    await submitStatus();
  };

  const handleReturnStockNow = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restoreStock' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('orderStatus.stockReturn.error'));
      (data.warnings ?? []).forEach((w: string) => toast.warning(w));
      toast.success(t('orderStatus.stockReturn.returned'));
      onUpdated?.({ lineItems: data.lineItems, notes: data.notes });
    } catch (error: any) {
      toast.error(error.message || t('orderStatus.stockReturn.error'));
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
              {tr.statusLabel(option as any)}
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

      {canReturnStockNow && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">{t('orderStatus.stockReturn.pendingNote')}</p>
          <button
            type="button"
            onClick={() => void handleReturnStockNow()}
            disabled={isSubmitting}
            className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            {t('orderStatus.stockReturn.returnNow')}
          </button>
        </div>
      )}

      {!canUpdate && (
        <p className="text-xs text-gray-500">{t('orderStatus.noPermission')}</p>
      )}

      {showStockPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">{t('orderStatus.stockReturn.title')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('orderStatus.stockReturn.description')}</p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void submitStatus(true)}
                disabled={isSubmitting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t('orderStatus.stockReturn.cancelAndReturn')}
              </button>
              <button
                type="button"
                onClick={() => void submitStatus(false)}
                disabled={isSubmitting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('orderStatus.stockReturn.cancelWithoutReturn')}
              </button>
              <button
                type="button"
                onClick={() => setShowStockPrompt(false)}
                disabled={isSubmitting}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('orderStatus.stockReturn.back')}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
