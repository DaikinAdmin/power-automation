'use client';

import { use, useState } from "react";
import { Phone, ArrowLeft, Eye, EyeOff, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import Image from "next/image";
import { countryCodes } from "@/helpers/country-codes";
import { useCartTotals } from "@/hooks/useCartTotals";
import { useTranslations } from 'next-intl';
import LanguageSwitcher from "@/components/languge-switcher";
import { useRouter } from 'next/navigation';

interface CheckoutForm {
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  noCallConfirmation: boolean;
  city: string;
  country: string;
  email: string;
}

interface LoginForm {
  email: string;
  password: string;
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('checkout');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({
    firstName: '',
    lastName: '',
    phone: '',
    countryCode: '+1',
    noCallConfirmation: false,
    city: '',
    country: '',
    email: ''
  });
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: ''
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');

  const { cartItems, updateCartQuantity, removeFromCart, getTotalCartItems } = useCart();
  const {
    currencyCode,
    baseTotalPrice,
    totalPrice,
    getItemTotal,
    getItemBaseTotal,
    formatPrice
  } = useCartTotals({ items: cartItems });
  const session = authClient.useSession();

  const handleCheckoutFormChange = (field: keyof CheckoutForm, value: string | boolean) => {
    setCheckoutForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLoginFormChange = (field: keyof LoginForm, value: string) => {
    setLoginForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      await authClient.signIn.email({
        email: loginForm.email,
        password: loginForm.password,
      });
      // User will stay on the same page after successful login
      // The session will be updated automatically
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      await authClient.signUp.email({
        email: checkoutForm.email,
        password: 'temp-password', // You might want to add a password field to registration
        name: `${checkoutForm.firstName} ${checkoutForm.lastName}`,
      });
      // Handle successful registration
    } catch (error: any) {
      setLoginError(error.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      alert(t('messages.acceptTerms'));
      return;
    }

    if (!session.data?.user) {
      alert(t('messages.pleaseLogin'));
      return;
    }

    if (cartItems.length === 0) {
      alert(t('messages.cartEmpty'));
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError('');

    try {
      const formattedCartTotal = formatPrice(baseTotalPrice);

      const orderData = {
        cartItems: cartItems.map(item => ({
          articleId: item.articleId,
          name: item.displayName,
          price: item.specialPrice || item.price,
          quantity: item.quantity,
          warehouseId: item.warehouseId,
        })),
        originalTotalPrice: baseTotalPrice,
        totalPrice: formattedCartTotal,
        customerInfo: session.data.user.email ? {
          email: session.data.user.email,
          name: session.data.user.name
        } : checkoutForm,
        deliveryId: null, // You can add delivery selection later
        locale: locale // Add locale for error messages
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }

      setOrderSuccess(true);
      // Clear cart after successful order
      cartItems.forEach(item => removeFromCart(item.id));
      
      // Redirect to payment page instead of showing success message
      router.push(`/${locale}/payment?orderId=${result.order.id}`);
      
    } catch (error: any) {
      setOrderError(error.message || 'Failed to create order');
      console.error('Order submission error:', error);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const isFormValid = () => {
    if (session.data?.user) {
      // User is logged in, form is always valid
      return true;
    }
    
    if (activeTab === 'register') {
      return (
        checkoutForm.firstName.trim() !== '' &&
        checkoutForm.lastName.trim() !== '' &&
        checkoutForm.phone.trim() !== '' &&
        checkoutForm.city.trim() !== '' &&
        checkoutForm.country.trim() !== '' &&
        checkoutForm.email.trim() !== ''
      );
    } else {
      return (
        loginForm.email.trim() !== '' &&
        loginForm.password.trim() !== ''
      );
    }
  };

  const isConfirmOrderDisabled = () => {
    return !acceptTerms || cartItems.length === 0 || !session.data?.user || isSubmittingOrder;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Header */}
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
            
            {/* Language Switcher and Phone Number */}
            <div className="flex-shrink-0 flex items-center gap-4">
              <LanguageSwitcher />
              <a href="tel:+1234567890" className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                <Phone size={20} />
                +1 (234) 567-890
              </a>
            </div>
          </div>
        </div>
        
        {/* Black Divider */}
        <div className="h-1 bg-black"></div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - User Forms */}
          <div>
            {!session.data?.user ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Tab Navigation */}
                <div className="flex border-b mb-6">
                  <button
                    onClick={() => setActiveTab('register')}
                    className={`px-6 py-3 font-semibold ${activeTab === 'register' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                  >
                    {t('createAccount')}
                  </button>
                  <button
                    onClick={() => setActiveTab('login')}
                    className={`px-6 py-3 font-semibold ${activeTab === 'login' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                  >
                    {t('login')}
                  </button>
                </div>

                {/* Error Message */}
                {loginError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {loginError}
                  </div>
                )}

                {activeTab === 'register' ? (
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.firstName')}</label>
                        <input
                          type="text"
                          value={checkoutForm.firstName}
                          onChange={(e) => handleCheckoutFormChange('firstName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.lastName')}</label>
                        <input
                          type="text"
                          value={checkoutForm.lastName}
                          onChange={(e) => handleCheckoutFormChange('lastName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone Number with Country Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.phoneNumber')}</label>
                      <div className="flex">
                        <select
                          value={checkoutForm.countryCode}
                          onChange={(e) => handleCheckoutFormChange('countryCode', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {countryCodes.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.code} ({item.country})
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={checkoutForm.phone}
                          onChange={(e) => handleCheckoutFormChange('phone', e.target.value)}
                          className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('form.phonePlaceholder')}
                          required
                        />
                      </div>
                    </div>

                    {/* No Call Confirmation */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="noCall"
                        checked={checkoutForm.noCallConfirmation}
                        onChange={(e) => handleCheckoutFormChange('noCallConfirmation', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="noCall" className="ml-2 text-sm text-gray-700">
                        {t('form.noCallConfirmation')}
                      </label>
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.city')}</label>
                        <input
                          type="text"
                          value={checkoutForm.city}
                          onChange={(e) => handleCheckoutFormChange('city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.country')}</label>
                        <input
                          type="text"
                          value={checkoutForm.country}
                          onChange={(e) => handleCheckoutFormChange('country', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.email')}</label>
                      <input
                        type="email"
                        value={checkoutForm.email}
                        onChange={(e) => handleCheckoutFormChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Registration Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? t('buttons.creatingAccount') : t('buttons.createAccount')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.email')}</label>
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => handleLoginFormChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.password')}</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={loginForm.password}
                          onChange={(e) => handleLoginFormChange('password', e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                        </button>
                      </div>
                    </div>

                    {/* Login Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? t('buttons.loggingIn') : t('buttons.login')}
                    </button>

                    {/* Forgot Password Link */}
                    <div className="text-right">
                      <Link href={`/${locale}/forgot-password`} className="text-sm text-blue-600 hover:text-blue-800">
                        {t('form.forgotPassword')}
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">{t('welcome')}</h3>
                <p className="text-gray-600">{t('loggedInAs')} {session.data.user.email}</p>
              </div>
            )}

            {/* Terms and Confirm Button */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-700">
                  {t('terms.acceptPrefix')}{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                    {t('terms.termsOfService')}
                  </Link>
                  {' '}{t('terms.and')}{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                    {t('terms.userAgreement')}
                  </Link>
                </label>
              </div>

              {/* Error Message for Order */}
              {orderError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {orderError}
                </div>
              )}

              {/* Success Message */}
              {orderSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  {t('messages.orderSuccess')}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isConfirmOrderDisabled()}
                className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingOrder ? t('buttons.placingOrder') : t('buttons.confirmOrder')}
              </button>
            </div>
          </div>

          {/* Right Side - Cart Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-6">{t('orderSummary.title')}</h3>

            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('cart.empty')}</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.itemImageLink![0]}
                        alt={item.displayName}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.displayName}</h4>
                        <p className="text-sm text-gray-500">#{item.articleId}</p>
                        <div className="text-red-600 font-bold">
                          {formatPrice(item.specialPrice ?? item.price ?? 0)}
                          {item.specialPrice && (
                            <span className="text-gray-400 line-through text-sm ml-2">
                              {formatPrice(item.price ?? 0)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
                          <span>{t('orderSummary.quantity')}: {item.quantity}</span>
                          <div className="flex items-center gap-1 text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>
                              {item.warehouseId ? (
                                item.displayName || 'Unknown Warehouse'
                              ) : (
                                'Warehouse not specified'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Item Total */}
                      <div className="font-bold text-red-600">
                        {formatPrice(getItemBaseTotal(item))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>{t('orderSummary.total')}:</span>
                    <span className="text-red-600">
                      {cartItems.length > 0 ? formatPrice(baseTotalPrice) : formatPrice(0)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {getTotalCartItems()} {getTotalCartItems() !== 1 ? t('cart.items') : t('cart.item')}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
