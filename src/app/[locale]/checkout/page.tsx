"use client";

import { use, useState, useEffect } from "react";
import { Phone, ArrowLeft, Eye, EyeOff, Trash2, X, CheckCircle2, Loader2 } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import Image from "next/image";
import { countryCodes } from "@/helpers/country-codes";
import { parseAddress, type AddressFields } from "@/helpers/address";
import { useCartTotals } from "@/hooks/useCartTotals";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/languge-switcher";
import { useRouter } from "next/navigation";
import { useDomainConfig } from "@/hooks/useDomain";
import type { SupportedCurrency } from "@/helpers/currency";
import type { DomainKey } from "@/lib/domain-config";
import NovaPostDelivery, { type NovaPostDeliveryState, type NpCity } from "@/components/nova-post-delivery";

const DOMAIN_CURRENCY: Record<DomainKey, SupportedCurrency> = {
  pl: "PLN",
  ua: "UAH",
};

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

interface DeliveryInfo {
  name: string;
  phone: string;
  countryCode: string;
  vatNumber: string;
  address: AddressFields;
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
  const t = useTranslations("checkout");
  const domainConfig = useDomainConfig();
  const { contacts } = domainConfig;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"register" | "login">("register");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({
    firstName: "",
    lastName: "",
    phone: "",
    countryCode: "+1",
    noCallConfirmation: false,
    city: "",
    country: "",
    email: "",
  });
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [novaPostState, setNovaPostState] = useState<NovaPostDeliveryState | null>(null);
  const [lastDeliveryInitial, setLastDeliveryInitial] = useState<Partial<NovaPostDeliveryState> | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; type: 'bank_transfer' | 'cash_on_delivery' | null; orderId: string | null }>({ open: false, type: null, orderId: null });
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    name: "",
    phone: "",
    countryCode: "+48",
    vatNumber: "",
    address: { country: "", city: "", street: "", postalCode: "" },
  });

  const { cartItems, updateCartQuantity, removeFromCart, getTotalCartItems } =
    useCart();
  const {
    currencyCode,
    baseTotalPrice,
    totalPrice,
    getItemCurrency,
    resolveBaseUnitPrice,
    getItemTotal,
    getItemBaseTotal,
    formatPrice,
    formatCartItemPrice,
    formatItemTotal,
    formatCartTotal,
  } = useCartTotals({ items: cartItems });
  const { convertToCurrency, formatAs } = useCurrency();
  const domainCurrency = DOMAIN_CURRENCY[domainConfig.key] ?? "EUR";
  const session = authClient.useSession();

  // Populate delivery form from session when user logs in
  useEffect(() => {
    if (!session.data?.user) return;
    const u = session.data.user as typeof session.data.user & {
      phoneNumber?: string;
      countryCode?: string;
      vatNumber?: string;
      addressLine?: string;
    };
    if (!u) return;
    setDeliveryInfo({
      name: u.name ?? "",
      phone: u.phoneNumber ?? "",
      countryCode: u.countryCode ?? "+48",
      vatNumber: u.vatNumber ?? "",
      address: parseAddress(u.addressLine),
    });
  }, [session.data?.user?.id]);

  // Fetch last delivery to prefill Nova Post form (UA locale only)
  useEffect(() => {
    if (!session.data?.user || locale !== "ua") return;
    fetch("/api/delivery/last")
      .then((r) => r.json())
      .then((data) => {
        const d = data?.delivery;
        if (!d) return;
        const methodMap: Record<string, string> = {
          PICKUP: "warehouse",
          NOVA_POSHTA: "nova_dept",
          COURIER: "nova_courier",
        };
        const method = methodMap[d.type] ?? "";
        if (!method) return;
        const city: NpCity | null =
          d.city && d.cityRef
            ? { ref: d.cityRef, name: d.city, settlementType: "" }
            : null;
        setLastDeliveryInitial({
          method: method as NovaPostDeliveryState["method"],
          city,
          warehouseRef: d.warehouseRef ?? "",
          warehouseDesc: d.warehouseDesc ?? "",
          street: d.street ?? "",
          building: d.building ?? "",
          flat: d.flat ?? "",
        });
      })
      .catch(() => {/* non-critical */});
  }, [session.data?.user?.id, locale]);

  // Format a price in domain currency; if domain currency equals item currency, returns empty string
  const formatPaymentPrice = (item: typeof cartItems[number], qty = 1) => {
    const itemCurrency = getItemCurrency(item);
    const basePrice = resolveBaseUnitPrice(item) * qty;
    const inDomainCurrency = convertToCurrency(basePrice, itemCurrency, domainCurrency as SupportedCurrency);
    return formatAs(inDomainCurrency, domainCurrency as SupportedCurrency);
  };

  const formatPaymentTotal = () => {
    const total = cartItems.reduce((sum, item) => {
      const itemCurrency = getItemCurrency(item);
      const baseTotal = resolveBaseUnitPrice(item) * item.quantity;
      return sum + convertToCurrency(baseTotal, itemCurrency, domainCurrency as SupportedCurrency);
    }, 0);
    return formatAs(total, domainCurrency as SupportedCurrency);
  };

  const handleCheckoutFormChange = (
    field: keyof CheckoutForm,
    value: string | boolean,
  ) => {
    setCheckoutForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLoginFormChange = (field: keyof LoginForm, value: string) => {
    setLoginForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    try {
      await authClient.signIn.email({
        email: loginForm.email,
        password: loginForm.password,
      });
      // User will stay on the same page after successful login
      // The session will be updated automatically
    } catch (error: any) {
      setLoginError(
        error.message || "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    try {
      await authClient.signUp.email({
        email: checkoutForm.email,
        password: "temp-password", // You might want to add a password field to registration
        name: `${checkoutForm.firstName} ${checkoutForm.lastName}`,
      });
      // Handle successful registration
    } catch (error: any) {
      setLoginError(error.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      alert(t("messages.acceptTerms"));
      return;
    }

    if (!session.data?.user) {
      alert(t("messages.pleaseLogin"));
      return;
    }

    if (cartItems.length === 0) {
      alert(t("messages.cartEmpty"));
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError("");

    try {
      const orderData = {
        cartItems: cartItems.map((item) => ({
          articleId: item.articleId,
          name: item.displayName,
          price: resolveBaseUnitPrice(item),
          currency: getItemCurrency(item),
          quantity: item.quantity,
          warehouseId: item.warehouseId,
        })),
        originalTotalPrice: baseTotalPrice,
        totalPrice: formatPaymentTotal(),
        domainCurrency,
        customerInfo: session.data.user.email
          ? {
              email: session.data.user.email,
              name: deliveryInfo.name || session.data.user.name,
              phone: deliveryInfo.phone,
              countryCode: deliveryInfo.countryCode,
              vatNumber: deliveryInfo.vatNumber,
              country: deliveryInfo.address.country,
              city: deliveryInfo.address.city,
              street: deliveryInfo.address.street,
              postalCode: deliveryInfo.address.postalCode,
            }
          : checkoutForm,
        deliveryId: null,
        novaPost: locale === "ua" && novaPostState ? {
          method: novaPostState.method,
          payment: novaPostState.payment,
          city: novaPostState.city?.name ?? null,
          cityRef: novaPostState.city?.ref ?? null,
          warehouseRef: novaPostState.warehouseRef || null,
          warehouseDesc: novaPostState.warehouseDesc || null,
          street: novaPostState.street || null,
          building: novaPostState.building || null,
          flat: novaPostState.flat || null,
        } : null,
        locale: locale, // Add locale for error messages
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create order");
      }

      setOrderSuccess(true);

      // Sync updated delivery info back to the user profile (fire-and-forget)
      if (session.data?.user) {
        fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: deliveryInfo.name || undefined,
            phoneNumber: deliveryInfo.phone || undefined,
            countryCode: deliveryInfo.countryCode || undefined,
            vatNumber: deliveryInfo.vatNumber || undefined,
            address: deliveryInfo.address,
          }),
        }).catch(() => {/* non-critical, ignore */});
      }

      // Clear cart after successful order
      cartItems.forEach((item) => removeFromCart(item.id));

      // UA locale: handle payment directly based on selected method
      if (locale === "ua" && novaPostState?.payment) {
        const paymentMethod = novaPostState.payment;

        if (paymentMethod === "online_card" || paymentMethod === "installment") {
          // Initiate LiqPay payment and redirect to gateway
          setIsRedirectingToPayment(true);
          try {
            const isInstallment = paymentMethod === "installment";
            const payRes = await fetch(
              isInstallment
                ? "/api/payments/liqpay-installments/initiate"
                : "/api/payments/liqpay/initiate",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                  isInstallment
                    ? { orderId: result.order.id, installmentType: "moment_part", months: 0 }
                    : { orderId: result.order.id }
                ),
              }
            );
            const payData = await payRes.json();
            if (!payRes.ok) throw new Error(payData.error || "Payment initiation failed");
            if (payData.paymentUrl) {
              window.location.href = payData.paymentUrl;
              return;
            }
            throw new Error("Payment URL not received");
          } catch (payErr: any) {
            setIsRedirectingToPayment(false);
            setOrderError(payErr.message || "Failed to initiate payment");
            return;
          }
        } else if (paymentMethod === "bank_transfer" || paymentMethod === "cash_on_delivery") {
          // Show informational dialog
          setPaymentDialog({ open: true, type: paymentMethod, orderId: result.order.id });
          return;
        }
      }

      // PL locale or fallback: redirect to payment page
      router.push(`/${locale}/payment?orderId=${result.order.id}`);
    } catch (error: any) {
      setOrderError(error.message || "Failed to create order");
      console.error("Order submission error:", error);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const isFormValid = () => {
    if (session.data?.user) {
      // User is logged in, form is always valid
      return true;
    }

    if (activeTab === "register") {
      return (
        checkoutForm.firstName.trim() !== "" &&
        checkoutForm.lastName.trim() !== "" &&
        checkoutForm.phone.trim() !== "" &&
        checkoutForm.city.trim() !== "" &&
        checkoutForm.country.trim() !== "" &&
        checkoutForm.email.trim() !== ""
      );
    } else {
      return loginForm.email.trim() !== "" && loginForm.password.trim() !== "";
    }
  };

  const isConfirmOrderDisabled = () => {
    if (!acceptTerms || cartItems.length === 0 || !session.data?.user || isSubmittingOrder) return true;
    if (locale === "ua" && (!novaPostState || !novaPostState.isValid)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Header */}
      <header className="bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="inline-flex items-center"
                aria-label="Go to homepage"
              >
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
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t("backToShop")}</span>
              </Link>
            </div>

            {/* Language Switcher and Phone Number */}
            <div className="flex-shrink-0 flex items-center gap-4">
              <LanguageSwitcher />
              <a
                href={`tel:${contacts.phone}`}
                className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors"
              >
                <Phone size={20} />
                {contacts.phoneFormatted}
              </a>
            </div>
          </div>
        </div>

        {/* Black Divider */}
        <div className="h-1 bg-black"></div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - User Forms */}
          <div>
            {!session.data?.user ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Tab Navigation */}
                <div className="flex border-b mb-6">
                  <button
                    onClick={() => setActiveTab("register")}
                    className={`px-6 py-3 font-semibold ${activeTab === "register" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-blue-600"}`}
                  >
                    {t("createAccount")}
                  </button>
                  <button
                    onClick={() => setActiveTab("login")}
                    className={`px-6 py-3 font-semibold ${activeTab === "login" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-blue-600"}`}
                  >
                    {t("login")}
                  </button>
                </div>

                {/* Error Message */}
                {loginError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {loginError}
                  </div>
                )}

                {activeTab === "register" ? (
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t("form.firstName")}
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.firstName}
                          onChange={(e) =>
                            handleCheckoutFormChange(
                              "firstName",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t("form.lastName")}
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.lastName}
                          onChange={(e) =>
                            handleCheckoutFormChange("lastName", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone Number with Country Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("form.phoneNumber")}
                      </label>
                      <div className="flex">
                        <select
                          value={checkoutForm.countryCode}
                          onChange={(e) =>
                            handleCheckoutFormChange(
                              "countryCode",
                              e.target.value,
                            )
                          }
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
                          onChange={(e) =>
                            handleCheckoutFormChange("phone", e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t("form.phonePlaceholder")}
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
                        onChange={(e) =>
                          handleCheckoutFormChange(
                            "noCallConfirmation",
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="noCall"
                        className="ml-2 text-sm text-gray-700"
                      >
                        {t("form.noCallConfirmation")}
                      </label>
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t("form.city")}
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.city}
                          onChange={(e) =>
                            handleCheckoutFormChange("city", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t("form.country")}
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.country}
                          onChange={(e) =>
                            handleCheckoutFormChange("country", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("form.email")}
                      </label>
                      <input
                        type="email"
                        value={checkoutForm.email}
                        onChange={(e) =>
                          handleCheckoutFormChange("email", e.target.value)
                        }
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
                      {isLoading
                        ? t("buttons.creatingAccount")
                        : t("buttons.createAccount")}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("form.email")}
                      </label>
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(e) =>
                          handleLoginFormChange("email", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("form.password")}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={loginForm.password}
                          onChange={(e) =>
                            handleLoginFormChange("password", e.target.value)
                          }
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
                          {showPassword ? (
                            <EyeOff size={20} className="text-gray-400" />
                          ) : (
                            <Eye size={20} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Login Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? t("buttons.loggingIn") : t("buttons.login")}
                    </button>

                    {/* Forgot Password Link */}
                    <div className="text-right">
                      <Link
                        href={`/${locale}/forgot-password`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {t("form.forgotPassword")}
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold">{t("welcome")}</h3>
                <p className="text-sm text-gray-500">
                  {t("loggedInAs")} <span className="font-medium">{session.data.user.email}</span>
                </p>

                {/* Delivery details — pre-filled from profile, editable */}
                <div className="pt-2 space-y-4">
                  <h4 className="font-medium text-gray-800">{t("deliveryDetails")}</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.name")}</label>
                    <input
                      type="text"
                      value={deliveryInfo.name}
                      onChange={(e) => setDeliveryInfo((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={deliveryInfo.countryCode}
                      onChange={(e) => setDeliveryInfo((p) => ({ ...p, countryCode: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {countryCodes.map((item) => (
                        <option key={item.code} value={item.code}>{item.code} ({item.country})</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={deliveryInfo.phone}
                      onChange={(e) => setDeliveryInfo((p) => ({ ...p, phone: e.target.value }))}
                      placeholder={t("form.phonePlaceholder")}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.vatNumber")}</label>
                    <input
                      type="text"
                      value={deliveryInfo.vatNumber}
                      onChange={(e) => setDeliveryInfo((p) => ({ ...p, vatNumber: e.target.value }))}
                      placeholder="PL1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.country")}</label>
                      <input
                        type="text"
                        value={deliveryInfo.address.country}
                        onChange={(e) => setDeliveryInfo((p) => ({ ...p, address: { ...p.address, country: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.postalCode")}</label>
                      <input
                        type="text"
                        value={deliveryInfo.address.postalCode}
                        onChange={(e) => setDeliveryInfo((p) => ({ ...p, address: { ...p.address, postalCode: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.city")}</label>
                    <input
                      type="text"
                      value={deliveryInfo.address.city}
                      onChange={(e) => setDeliveryInfo((p) => ({ ...p, address: { ...p.address, city: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.street")}</label>
                    <input
                      type="text"
                      value={deliveryInfo.address.street}
                      onChange={(e) => setDeliveryInfo((p) => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Nova Post delivery selector — UA locale only */}
                {locale === "ua" && (
                  <div className="pt-2">
                    <h4 className="font-medium text-gray-800 mb-3">{t("deliveryDetails")}</h4>
                    <NovaPostDelivery onChange={setNovaPostState} initialState={lastDeliveryInitial} />
                  </div>
                )}
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
                <label
                  htmlFor="acceptTerms"
                  className="ml-2 text-sm text-gray-700"
                >
                  {t("terms.acceptPrefix")}{" "}
                  <Link
                    href="/terms"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("terms.termsOfService")}
                  </Link>{" "}
                  {t("terms.and")}{" "}
                  <Link
                    href="/privacy"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("terms.userAgreement")}
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
                  {t("messages.orderSuccess")}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isConfirmOrderDisabled()}
                className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingOrder
                  ? t("buttons.placingOrder")
                  : t("buttons.confirmOrder")}
              </button>
            </div>
          </div>

          {/* Right Side - Cart Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-6">
              {t("orderSummary.title")}
            </h3>

            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t("cart.empty")}
              </p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                    >
                      <img
                        src={item.itemImageLink![0]}
                        alt={item.displayName}
                        className="w-16 h-16 object-cover rounded-lg"
                      />

                      <div className="flex-1">
                        <h4 className="font-semibold">{item.displayName}</h4>
                        <p className="text-sm text-gray-500">
                          #{item.articleId}
                        </p>
                        <div className="text-red-600 font-bold">
                          {formatPaymentPrice(item)}
                          {getItemCurrency(item) !== domainCurrency && (
                            <span className="text-gray-500 font-normal text-sm ml-1">
                              ({formatCartItemPrice(item)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
                          <span>
                            {t("orderSummary.quantity")}: {item.quantity}
                          </span>
                          <div className="flex items-center gap-1 text-gray-500">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>
                              {item.warehouseId
                                ? item.displayName || "Unknown Warehouse"
                                : "Warehouse not specified"}
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
                      <div className="font-bold text-red-600 text-right">
                        {formatPaymentPrice(item, item.quantity)}
                        {getItemCurrency(item) !== domainCurrency && (
                          <div className="text-gray-500 font-normal text-xs">
                            ({formatItemTotal(item)})
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>{t("orderSummary.total")}:</span>
                    <div className="text-right">
                      <span className="text-red-600">
                        {cartItems.length > 0 ? formatPaymentTotal() : formatAs(0, domainCurrency as SupportedCurrency)}
                      </span>
                      {cartItems.length > 0 && cartItems.some((item) => getItemCurrency(item) !== domainCurrency) && (
                        <div className="text-gray-500 font-normal text-sm">
                          ({formatCartTotal()})
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {getTotalCartItems()}{" "}
                    {getTotalCartItems() !== 1
                      ? t("cart.items")
                      : t("cart.item")}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Redirecting to payment overlay */}
      {isRedirectingToPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("messages.redirectingToPayment")}</h3>
          </div>
        </div>
      )}

      {/* Payment info dialog (bank_transfer / cash_on_delivery) */}
      {paymentDialog.open && paymentDialog.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => {
                setPaymentDialog({ open: false, type: null, orderId: null });
                router.push(`/${locale}/dashboard`);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t("messages.orderSuccess")}</h3>
              {paymentDialog.orderId && (
                <p className="text-sm text-gray-500">
                  {t("messages.orderCreated")} #{paymentDialog.orderId.substring(0, 8)}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6 text-sm text-blue-800">
              {paymentDialog.type === "cash_on_delivery"
                ? t("dialog.cashOnDeliveryInfo")
                : t("dialog.bankTransferInfo")}
            </div>

            <button
              onClick={() => {
                setPaymentDialog({ open: false, type: null, orderId: null });
                router.push(`/${locale}/dashboard`);
              }}
              className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              {t("dialog.goToDashboard")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
