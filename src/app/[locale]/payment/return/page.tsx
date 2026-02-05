'use client';

import { use, useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from "@/components/languge-switcher";

interface PaymentReturnPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string }>;
}

export default function PaymentReturnPage({ params, searchParams }: PaymentReturnPageProps) {
  const { locale } = use(params);
  const { orderId } = use(searchParams);
  const t = useTranslations('paymentReturn');
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed'>('pending');

  useEffect(() => {
    if (orderId) {
      checkPaymentStatus();
    }
  }, [orderId]);

  const checkPaymentStatus = async () => {
    if (!orderId) return;

    setIsLoading(true);

    try {
      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();

      if (response.ok) {
        setOrderData(data.order);
        
        // Determine payment status based on order status
        if (data.order.status === 'PROCESSING' || data.order.status === 'COMPLETED') {
          setPaymentStatus('success');
        } else if (data.order.status === 'WAITING_FOR_PAYMENT') {
          setPaymentStatus('pending');
          // Keep checking for a while
          setTimeout(checkPaymentStatus, 3000);
        } else {
          setPaymentStatus('failed');
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(price);
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
                        {formatPrice(orderData.originalTotalPrice)}
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
                    href={`/${locale}/orders`}
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
                  onClick={checkPaymentStatus}
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
                    href={`/${locale}/payment?orderId=${orderId}`}
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
