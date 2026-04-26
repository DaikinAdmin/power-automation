'use client';

import { use, useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation'
import LanguageSwitcher from "@/components/languge-switcher";
interface PaymentReturnPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; provider?: string }>;
}

export default function PaymentReturnPage({ params, searchParams }: PaymentReturnPageProps) {
  const { locale } = use(params);
  const { orderId, provider } = use(searchParams);
  const t = useTranslations('paymentReturn');
  const router = useRouter();

  const formatOrderAmount = (order: any): string => {
    if (order?.payment?.amount) {
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: order.payment.currency ?? 'EUR',
      }).format(order.payment.amount / 100);
    }
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'EUR',
    }).format(order?.originalTotalPrice ?? 0);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed'>('pending');
  const [retryCount, setRetryCount] = useState(0);

  const MAX_RETRIES = 10;

  useEffect(() => {
    if (orderId) {
      checkPaymentStatus(0);
    }
  }, [orderId]);

  const checkPaymentStatus = async (attempt: number) => {
    if (!orderId) return;

    setIsLoading(true);

    try {
      // Wait a bit for webhook to process on first attempt
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Fetch the full order for display
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      const orderResult = await orderResponse.json();
      if (orderResponse.ok) {
        setOrderData(orderResult.order);
      }

      let resolvedPaymentStatus: string | undefined;
      let resolvedOrderStatus: string | undefined;

      if (provider === 'przelewy24') {
        // Przelewy24 status is set via webhook — read directly from order data
        resolvedPaymentStatus = orderResult.order?.payment?.status;
        resolvedOrderStatus = orderResult.order?.status;
      } else {
        // LiqPay (and installments) — actively poll check-status
        const checkResponse = await fetch('/api/payments/liqpay/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const checkData = await checkResponse.json();
        resolvedPaymentStatus = checkData.paymentStatus;
        resolvedOrderStatus = checkData.orderStatus;
      }

      if (resolvedPaymentStatus === 'COMPLETED' || resolvedOrderStatus === 'PROCESSING' || resolvedOrderStatus === 'COMPLETED') {
        setPaymentStatus('success');
      } else if (resolvedPaymentStatus === 'FAILED') {
        setPaymentStatus('failed');
      } else if (attempt < MAX_RETRIES) {
        setPaymentStatus('pending');
        setRetryCount(attempt + 1);
        setTimeout(() => checkPaymentStatus(attempt + 1), 3000);
      } else {
        // Max retries reached — show pending with a manual retry button
        setPaymentStatus('pending');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (attempt < MAX_RETRIES) {
        setTimeout(() => checkPaymentStatus(attempt + 1), 3000);
      } else {
        setPaymentStatus('failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="inline-flex items-center" aria-label="Go to homepage">
                <Image
                  src="/imgs/Logo.webp"
                  alt="Shop logo"
                  width={200}
                  height={62}
                  className="h-[62px] w-[200px]"
                  priority
                />
              </Link>
            </div>
            
            {/* Back to Shop Button */}
            <div className="flex-1 flex justify-center">
              <Link href="/" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors">
                <ArrowLeft size={20} />
                <span className="font-medium">{t('backToShop')}</span>
              </Link>
            </div>
            
            {/* Language Switcher */}
            <div className="flex-shrink-0">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
        
        {/* Black Divider */}
        <div className="h-1 bg-black"></div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">{t('processing.title')}</h2>
              <p className="text-gray-600">{t('processing.message')}</p>
            </div>
          ) : paymentStatus === 'success' ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4 text-green-600">{t('success.title')}</h2>
              <p className="text-xl text-gray-700 mb-8">{t('success.message')}</p>
              
              {orderData && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('success.orderId')}:</span>
                      <span className="font-semibold">#{orderData.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('success.amount')}:</span>
                      <span className="font-bold text-lg text-green-600">
                        {formatOrderAmount(orderData)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('success.status')}:</span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {orderData.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-gray-600">{t('success.emailSent')}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/dashboard/orders"
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {t('success.viewOrders')}
                  </Link>
                  <Link
                    href="/"
                    className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    {t('success.continueShopping')}
                  </Link>
                </div>
              </div>
            </div>
          ) : paymentStatus === 'pending' ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-yellow-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4 text-yellow-600">{t('pending.title')}</h2>
              <p className="text-gray-700 mb-8">{t('pending.message')}</p>
              
              {orderData && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('pending.orderId')}:</span>
                    <span className="font-semibold">#{orderData.id.substring(0, 8)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={() => checkPaymentStatus(0)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {t('pending.checkStatus')}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4 text-red-600">{t('failed.title')}</h2>
              <p className="text-xl text-gray-700 mb-8">{t('failed.message')}</p>
              
              {orderData && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('failed.orderId')}:</span>
                    <span className="font-semibold">#{orderData.id.substring(0, 8)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-gray-600 mb-6">{t('failed.tryAgain')}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href={`/payment?orderId=${orderId}`}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {t('failed.retryPayment')}
                  </Link>
                  <Link
                    href="/"
                    className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    {t('failed.backToShop')}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
