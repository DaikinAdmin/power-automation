'use client';

import { use, useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Lock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from "@/components/languge-switcher";

interface PaymentPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string }>;
}

export default function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const { locale } = use(params);
  const { orderId } = use(searchParams);
  const t = useTranslations('payment');
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      return;
    }

    // Fetch order details
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order details');
      }

      setOrderData(data.order);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!orderId) return;

    setIsLoading(true);
    setError('');
    setPaymentStatus('processing');

    try {
      // Initiate payment with Przelewy24
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      // Redirect to Przelewy24 payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setPaymentStatus('error');
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(price);
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('errors.noOrder')}</h2>
          <p className="text-gray-600 mb-6">{t('errors.noOrderDescription')}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={20} />
            {t('backToShop')}
          </Link>
        </div>
      </div>
    );
  }

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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

          {isLoading && !orderData ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          ) : error && !orderData ? (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="text-center mb-6">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">{t('errors.title')}</h2>
                <p className="text-red-600">{error}</p>
              </div>
              <button
                onClick={fetchOrderDetails}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('retry')}
              </button>
            </div>
          ) : orderData ? (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">{t('orderSummary.title')}</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('orderSummary.orderId')}:</span>
                    <span className="font-semibold">#{orderData.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('orderSummary.date')}:</span>
                    <span className="font-semibold">
                      {new Date(orderData.createdAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('orderSummary.status')}:</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      {orderData.status}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>{t('orderSummary.total')}:</span>
                    <span className="text-red-600">
                      {formatPrice(orderData.originalTotalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-600" />
                  {t('paymentInfo.title')}
                </h2>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    {t('paymentInfo.securePayment')}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{t('paymentInfo.methods')}</span>
                  </div>
                  <div className="ml-8 text-sm text-gray-600">
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('paymentInfo.creditCard')}</li>
                      <li>{t('paymentInfo.bankTransfer')}</li>
                      <li>{t('paymentInfo.blik')}</li>
                      <li>{t('paymentInfo.paypal')}</li>
                    </ul>
                  </div>
                </div>

                {/* Error Message */}
                {error && paymentStatus === 'error' && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}

                {/* Payment Button */}
                <button
                  onClick={handleProceedToPayment}
                  disabled={isLoading || orderData.status === 'COMPLETED'}
                  className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('buttons.processing')}
                    </>
                  ) : orderData.status === 'COMPLETED' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {t('buttons.alreadyPaid')}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      {t('buttons.proceedToPayment')}
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  {t('paymentInfo.poweredBy')}{' '}
                  <span className="font-semibold">Przelewy24</span>
                </p>
              </div>

              {/* Additional Information */}
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  {t('additionalInfo.text')}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
