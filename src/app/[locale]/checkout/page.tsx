"use client";

import { use, useState, useEffect, useRef } from "react";
import {
  Phone,
  ArrowLeft,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  Menu,
  ShoppingCart
} from "lucide-react";
import { useCart } from "@/components/cart-context";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { parseAddress, type AddressFields } from "@/helpers/address";
import { countryCodes } from "@/helpers/country-codes";
import { useCartTotals } from "@/hooks/useCartTotals";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/languge-switcher";
import { useRouter } from "@/i18n/navigation";
import { useDomainConfig } from "@/hooks/useDomain";
import type { SupportedCurrency } from "@/helpers/currency";
import type { AuthUser } from "@/helpers/types/user";
import type { DomainKey } from "@/lib/domain-config";
import NovaPostDelivery, {
  type NovaPostDeliveryState,
  type NpCity,
} from "@/components/nova-post-delivery";
import DeliveryPoland, {
  type PolandDeliveryState,
} from "@/components/delivery-poland";
import type { CartItemDims } from "@/helpers/parcel-locker-fit";
import type { DeliveryInfo } from "@/types/delivery";
import SignIn from "@/components/auth/sign-in";
import SignUp from "@/components/auth/sign-up";

const DOMAIN_CURRENCY: Record<DomainKey, SupportedCurrency> = {
  pl: "PLN",
  ua: "UAH",
};

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations("checkout");
  const tNova = useTranslations("novaPostDelivery");
  const domainConfig = useDomainConfig();
  const { contacts } = domainConfig;
  const router = useRouter();
  
  // UA: default to quick order (no registration required); PL: show register/login tabs
  const [activeTab, setActiveTab] = useState<"register" | "login" | "quick">(locale === "ua" ? "quick" : "register");
  const [quickOrderMode, setQuickOrderMode] = useState(locale === "ua");
  const [guestInfo, setGuestInfo] = useState({ name: "", email: "", phone: "", countryCode: "+380" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [novaPostState, setNovaPostState] = useState<NovaPostDeliveryState | null>(null);
  const [lastDeliveryInitial, setLastDeliveryInitial] = useState<Partial<NovaPostDeliveryState> | null>(null);
  const [deliveryPolandState, setDeliveryPolandState] = useState<PolandDeliveryState | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    type: "bank_transfer" | "cash_on_delivery" | null;
    orderId: string | null;
  }>({ open: false, type: null, orderId: null });
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);
  const [itemDimensions, setItemDimensions] = useState<CartItemDims[]>([]);
  const fetchedSlugsRef = useRef<string>('');

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    name: "",
    phone: "",
    countryCode: "+48",
    vatNumber: "",
    address: { country: "", city: "", street: "", postalCode: "" },
  });

  const { cartItems,  removeFromCart } = useCart();
  const {
    baseTotalPrice,
    getItemCurrency,
    resolveBaseUnitPrice,
    formatCartItemPrice,
    formatCartTotal,
  } = useCartTotals({ items: cartItems });
  const { convertToCurrency, formatAs } = useCurrency();
  const domainCurrency = DOMAIN_CURRENCY[domainConfig.key] ?? "EUR";
  const session = authClient.useSession();
  const sessionUser = session.data?.user as AuthUser | undefined;
  const isCompanyUser = sessionUser?.userType === "company";
  const vatPlaceholder = domainConfig.key === "ua" ? "ІПН або ЄДРПОУ" : "NIP lub VAT";

  // Effects & Handlers
  useEffect(() => {
    if (!session.data?.user) return;
    const user = session.data.user as any;
    setDeliveryInfo({
      name: user.name ?? "",
      phone: user.phoneNumber ?? "",
      countryCode: user.countryCode ?? "+48",
      vatNumber: user.vatNumber ?? "",
      address: parseAddress(user.addressLine),
    });
  }, [session.data?.user?.id]);

  useEffect(() => {
    if (!session.data?.user || locale !== "ua") return;
    const fetchLastDelivery = async () => {
        try {
            const response = await fetch("/api/delivery/last");
            const data = await response.json();
            const lastDelivery = data?.delivery;
            if (!lastDelivery) return;
            const methodMap: Record<string, string> = {
                PICKUP: "warehouse",
                NOVA_POSHTA: "nova_dept",
                COURIER: "nova_courier",
            };
            const method = methodMap[lastDelivery.type] ?? "";
            if (!method) return;
            setLastDeliveryInitial({
                method: method as any,
                city: lastDelivery.city && lastDelivery.cityRef ? { ref: lastDelivery.cityRef, name: lastDelivery.city, settlementType: "" } : null,
                warehouseRef: lastDelivery.warehouseRef ?? "",
                warehouseDesc: lastDelivery.warehouseDesc ?? "",
                street: lastDelivery.street ?? "",
                building: lastDelivery.building ?? "",
                flat: lastDelivery.flat ?? "",
            });
        } catch {}
    };
    fetchLastDelivery();
  }, [session.data?.user?.id, locale]);

  // Fetch packing dimensions for parcel-locker eligibility (PL domain only)
  useEffect(() => {
    if (domainConfig.key !== "pl" || cartItems.length === 0) return;
    const ids = cartItems.map((i) => i.articleId).join(",");
    if (ids === fetchedSlugsRef.current) return;
    fetchedSlugsRef.current = ids;
    fetch(`/api/items/dimensions?articleIds=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((rows: Array<{ articleId: string; grossWeight: number | null; heightPacking: number | null; widthPacking: number | null; lengthPacking: number | null }>) => {
        const dimMap = new Map(rows.map((r) => [r.articleId, r]));
        // DB stores dimensions in mm and weight in grams → convert to cm and kg
        setItemDimensions(
          cartItems.map((ci) => {
            const d = dimMap.get(ci.articleId);
            return {
              articleId: ci.articleId,
              grossWeight: d?.grossWeight != null ? d.grossWeight / 1000 : null,
              heightPacking: d?.heightPacking != null ? d.heightPacking / 10 : null,
              widthPacking: d?.widthPacking != null ? d.widthPacking / 10 : null,
              lengthPacking: d?.lengthPacking != null ? d.lengthPacking / 10 : null,
              quantity: ci.quantity,
            };
          })
        );
      })
      .catch(() => {});
  }, [cartItems, domainConfig.key]);

  const formatPaymentPrice = (item: any, qty = 1) => {
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

  const orderTotalNumeric = cartItems.reduce((sum, item) => {
    const itemCurrency = getItemCurrency(item);
    const baseTotal = resolveBaseUnitPrice(item) * item.quantity;
    return sum + convertToCurrency(baseTotal, itemCurrency, domainCurrency as SupportedCurrency);
  }, 0);

  const deliveryPrice = domainConfig.key === 'pl' ? (deliveryPolandState?.deliveryPrice ?? 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!acceptTerms) { alert(t("messages.acceptTerms")); return; }
      if (!session.data?.user && !quickOrderMode) { alert(t("messages.pleaseLogin")); return; }
      if (cartItems.length === 0) { alert(t("messages.cartEmpty")); return; }
      setIsSubmittingOrder(true);
      setOrderError("");
      try {
          const effectiveEmail = quickOrderMode ? guestInfo.email : session.data!.user.email;
          const effectiveName = quickOrderMode ? guestInfo.name : (deliveryInfo.name || session.data!.user.name);
          const effectivePhone = quickOrderMode ? guestInfo.phone : deliveryInfo.phone;
          const effectiveCountryCode = quickOrderMode ? guestInfo.countryCode : deliveryInfo.countryCode;

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
              customerInfo: {
                  email: effectiveEmail,
                  name: effectiveName,
                  phone: effectivePhone,
                  countryCode: effectiveCountryCode,
                  vatNumber: quickOrderMode ? "" : deliveryInfo.vatNumber,
                  country: deliveryInfo.address.country,
                  city: deliveryInfo.address.city,
                  street: deliveryInfo.address.street,
                  postalCode: deliveryInfo.address.postalCode,
              },
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
              deliveryPoland: domainConfig.key === "pl" && deliveryPolandState ? {
                  method: deliveryPolandState.method,
                  payment: deliveryPolandState.payment,
                  pointName: deliveryPolandState.selectedPoint?.name ?? null,
                  pointCity: deliveryPolandState.selectedPoint?.address_details.city ?? null,
                  pointStreet: deliveryPolandState.selectedPoint?.address_details.street ?? null,
                  pointBuilding: deliveryPolandState.selectedPoint?.address_details.building_number ?? null,
                  dpdPointId: deliveryPolandState.dpdPointId ?? null,
                  street: deliveryPolandState.street || null,
                  building: deliveryPolandState.building || null,
                  flat: deliveryPolandState.flat || null,
                  city: deliveryPolandState.city || null,
                  postalCode: deliveryPolandState.postalCode || null,
                  deliveryPrice: deliveryPolandState.deliveryPrice ?? 0,
              } : null,
              locale: locale,
          };

          const endpoint = quickOrderMode ? "/api/orders/guest" : "/api/orders";
          const requestBody = quickOrderMode
              ? { ...orderData, guestEmail: guestInfo.email, guestName: guestInfo.name, guestPhone: guestInfo.phone, guestCountryCode: guestInfo.countryCode }
              : orderData;

          const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Failed to create order");

          setOrderSuccess(true);

          // GTM purchase event
          const gtmItems = cartItems.map((item) => ({
              item_id: item.articleId,
              item_name: item.displayName,
              item_category: item.categorySlug || '',
              item_list_name: item.categorySlug || 'direct',
              price: convertToCurrency(resolveBaseUnitPrice(item), getItemCurrency(item), domainCurrency as SupportedCurrency),
              quantity: item.quantity,
          }));
          const gtmValue = cartItems.reduce((sum, item) => {
              return sum + convertToCurrency(resolveBaseUnitPrice(item) * item.quantity, getItemCurrency(item), domainCurrency as SupportedCurrency);
          }, 0);
          const w = window as any;
          w.dataLayer = w.dataLayer || [];
          w.dataLayer.push({ ecommerce: null });
          w.dataLayer.push({
              event: "purchase",
              ecommerce: {
                  transaction_id: result.order.id,
                  value: gtmValue,
                  currency: domainCurrency,
                  shipping: 0,
                  items: gtmItems,
              },
          });

          if (!quickOrderMode && session.data?.user) {
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
              }).catch(() => {});
          }
          cartItems.forEach((item) => removeFromCart(item.id));

          if (locale === "ua" && novaPostState?.payment) {
              const paymentMethod = novaPostState.payment;
              if (paymentMethod === "online_card" || paymentMethod === "installment") {
                  setIsRedirectingToPayment(true);
                  const isInstallment = paymentMethod === "installment";
                  const payRes = await fetch(
                      isInstallment
                          ? "/api/payments/liqpay-installments/initiate"
                          : quickOrderMode
                              ? "/api/payments/liqpay/initiate-guest"
                              : "/api/payments/liqpay/initiate",
                      {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(isInstallment ? { orderId: result.order.id, installmentType: "moment_part", months: 0 } : { orderId: result.order.id }),
                  });
                  const payData = await payRes.json();
                  if (!payRes.ok) throw new Error(payData.error || "Payment initiation failed");
                  if (payData.paymentUrl) { window.location.href = payData.paymentUrl; return; }
                  throw new Error("Payment URL not received");
              } else if (paymentMethod === "bank_transfer" || paymentMethod === "cash_on_delivery") {
                  setPaymentDialog({ open: true, type: paymentMethod, orderId: result.order.id });
                  return;
              }
          }

          if (domainConfig.key === "pl" && deliveryPolandState?.payment) {
              const plPayment = deliveryPolandState.payment;
              if (plPayment === "przelewy24") {
                  setIsRedirectingToPayment(true);
                  const payRes = await fetch("/api/payments/przelewy24/initiate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ orderId: result.order.id }),
                  });
                  const payData = await payRes.json();
                  if (!payRes.ok) throw new Error(payData.error || "Payment initiation failed");
                  if (payData.paymentUrl) { window.location.href = payData.paymentUrl; return; }
                  throw new Error("Payment URL not received");
              } else if (plPayment === "bank_transfer") {
                  setPaymentDialog({ open: true, type: "bank_transfer", orderId: result.order.id });
                  return;
              }
          }
          router.push(`/payment?orderId=${result.order.id}`);
      } catch (error: any) {
          setOrderError(error.message || "Failed to create order");
      } finally {
          setIsSubmittingOrder(false);
      }
  };

  const isConfirmOrderDisabled = () => {
    if (!acceptTerms || cartItems.length === 0 || isSubmittingOrder) return true;
    if (!session.data?.user && !quickOrderMode) return true;
    if (quickOrderMode && (!guestInfo.email.trim() || !guestInfo.name.trim())) return true;
    if (locale === "ua" && (!novaPostState || !novaPostState.isValid)) return true;
    if (locale === "ua" && novaPostState?.method === "nova_courier") {
      const { city, street } = deliveryInfo.address;
      if (!city?.trim() || !street?.trim()) return true;
    }
    if (domainConfig.key === "pl") {
      if (!deliveryPolandState?.method) return true;
      if (!deliveryPolandState.isValid) return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* --- Header --- */}
      <header className="bg-white sticky top-0 z-30 shadow-sm lg:static lg:shadow-none">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/imgs/Logo.webp"
                  alt="Shop logo"
                  width={200}
                  height={62}
                  className="h-[40px] w-auto lg:h-[62px] lg:w-[200px]"
                  priority
                />
              </Link>
            </div>

            <div className="hidden md:flex flex-1 justify-center">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t("backToShop")}</span>
              </Link>
            </div>

            {/* Language & Contacts */}
            <div className="flex items-center gap-2 lg:gap-4">
              <LanguageSwitcher />
              <a
                href={`tel:${contacts.phone}`}
                className="flex items-center justify-center w-10 h-10 lg:w-auto lg:h-auto bg-blue-50 lg:bg-transparent rounded-full text-blue-600 lg:text-gray-800 font-semibold"
              >
                <Phone size={20} className="lg:mr-2" />
                <span className="hidden lg:inline">{contacts.phoneFormatted}</span>
              </a>
            </div>
          </div>
        </div>
        <div className="h-1 bg-black"></div>
      </header>

      <main className="container mx-auto px-4 py-6 lg:py-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8">{t("title")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 sticky top-20">
              <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 flex items-center gap-2">
                <ShoppingCart size={20} />
                {t("orderSummary.title")}
              </h3>

              {cartItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t("cart.empty")}</p>
              ) : (
                <>
                  <div className="space-y-3 lg:space-y-4 mb-6 max-h-[40vh] lg:max-h-none overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start lg:items-center gap-3 lg:gap-4 p-3 border border-gray-100 rounded-lg"
                      >
                        <div className="relative w-16 h-16 flex-shrink-0">
                           <img
                            src={item.itemImageLink![0]}
                            alt={item.displayName}
                            className="w-full h-full object-cover rounded-md"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm lg:text-base truncate">{item.displayName}</h4>
                          <p className="text-xs text-gray-500 mb-1">#{item.articleId}</p>
                          
                          <div className="flex flex-wrap items-baseline gap-1">
                            <span className="text-red-600 font-bold text-sm">
                                {formatPaymentPrice(item)}
                            </span>
                            {getItemCurrency(item) !== domainCurrency && (
                              <span className="text-gray-400 text-[10px] lg:text-xs">
                                ({formatCartItemPrice(item)})
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[10px] lg:text-xs text-gray-500 mt-1">
                            {t("orderSummary.quantity")}: {item.quantity}
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    {deliveryPrice > 0 && (
                      <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                        <span>{t('orderSummary.delivery')}:</span>
                        <span className="font-medium">+{formatAs(deliveryPrice, domainCurrency as SupportedCurrency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-lg lg:text-xl font-bold">
                      <span>{t("orderSummary.total")}:</span>
                      <div className="text-right">
                        <span className="text-red-600">{formatAs(orderTotalNumeric + deliveryPrice, domainCurrency as SupportedCurrency)}</span>
                        {cartItems.some(i => getItemCurrency(i) !== domainCurrency) && deliveryPrice === 0 && (
                           <div className="text-gray-500 font-normal text-xs lg:text-sm">
                             ({formatCartTotal()})
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Left Side - Forms */}
          <div className="order-2 lg:order-1">
            {!session.data?.user && !quickOrderMode ? (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab("register")}
                    className={`flex-1 px-4 py-4 text-sm lg:text-base font-semibold ${activeTab === "register" ? "bg-white border-b-2 border-blue-600 text-blue-600" : "bg-gray-50 text-gray-600"}`}
                  >
                    {t("createAccount")}
                  </button>
                  <button
                    onClick={() => setActiveTab("login")}
                    className={`flex-1 px-4 py-4 text-sm lg:text-base font-semibold ${activeTab === "login" ? "bg-white border-b-2 border-blue-600 text-blue-600" : "bg-gray-50 text-gray-600"}`}
                  >
                    {t("login")}
                  </button>
                  {locale === "ua" && (
                    <button
                      onClick={() => { setActiveTab("quick"); setQuickOrderMode(true); }}
                      className={`flex-1 px-4 py-4 text-sm lg:text-base font-semibold ${activeTab === "quick" ? "bg-white border-b-2 border-red-600 text-red-600" : "bg-gray-50 text-gray-600"}`}
                    >
                      Без реєстрації
                    </button>
                  )}
                </div>
                <div className="lg:p-6">
                    {activeTab === "register" ? (
                    <SignUp optional={false} hideFooter className="w-full border-0 shadow-none p-0" callbackURL={`/${locale}/checkout`} />
                    ) : activeTab === "login" ? (
                    <SignIn hideFooter onLoginSuccess={() => {}} className="w-full border-0 shadow-none p-0" callbackURL={`/${locale}/checkout`} />
                    ) : null}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 space-y-6">
                {quickOrderMode && !session.data?.user ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Швидке замовлення</h3>
                      <button
                        type="button"
                        onClick={() => { setQuickOrderMode(false); setActiveTab("register"); }}
                        className="text-xs text-blue-600 underline"
                      >
                        Увійти / Зареєструватись
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Ім'я та прізвище *</label>
                      <input
                        type="text"
                        required
                        value={guestInfo.name}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="Іван Іванов"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Email *</label>
                      <input
                        type="email"
                        required
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="your@email.com"
                      />
                      <p className="text-xs text-gray-400 mt-1">На цей email буде надіслано підтвердження замовлення та дані для входу</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Телефон</label>
                      <div className="flex gap-2">
                        <select
                          value={guestInfo.countryCode}
                          onChange={(e) => setGuestInfo((p) => ({ ...p, countryCode: e.target.value }))}
                          className="w-[100px] px-2 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        >
                          {countryCodes.map((item) => (
                            <option key={item.code} value={item.code}>{item.code}</option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={guestInfo.phone}
                          onChange={(e) => setGuestInfo((p) => ({ ...p, phone: e.target.value }))}
                          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                          placeholder="(67)-123-45-67"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold">{t("welcome")}</h3>
                    <p className="text-sm text-gray-500">{session.data?.user?.email}</p>
                  </div>
                )}

                {!quickOrderMode && (
                  <>
                  <h4 className="font-bold text-gray-800 border-b pb-2 text-sm uppercase tracking-wide">
                    {t("deliveryDetails")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">{t("form.name")}</label>
                        <input
                          type="text"
                          value={deliveryInfo.name}
                          onChange={(e) => setDeliveryInfo((p) => ({ ...p, name: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">{t("form.phoneNumber")}</label>
                        <div className="flex gap-2">
                            <select
                                value={deliveryInfo.countryCode}
                                onChange={(e) => setDeliveryInfo(p => ({...p, countryCode: e.target.value}))}
                                className="w-[100px] px-2 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                            >
                                {countryCodes.map(item => <option key={item.code} value={item.code}>{item.code}</option>)}
                            </select>
                            <input
                                type="tel"
                                value={deliveryInfo.phone}
                                onChange={(e) => setDeliveryInfo(p => ({...p, phone: e.target.value}))}
                                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                            />
                        </div>
                      </div>

                      {isCompanyUser && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">{t("form.vatNumber")}</label>
                        <input
                          type="text"
                          value={deliveryInfo.vatNumber}
                          onChange={(e) => setDeliveryInfo(p => ({ ...p, vatNumber: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                          placeholder={vatPlaceholder}
                        />
                      </div>
                      )}

                      <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">{t("form.country")}</label>
                         <input
                            type="text"
                            value={deliveryInfo.address.country}
                            onChange={(e) => setDeliveryInfo(p => ({ ...p, address: { ...p.address, country: e.target.value } }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                          />
                      </div>

                      <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">{t("form.postalCode")}</label>
                         <input
                            type="text"
                            value={deliveryInfo.address.postalCode}
                            onChange={(e) => setDeliveryInfo(p => ({ ...p, address: { ...p.address, postalCode: e.target.value } }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                          />
                      </div>

                      <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">{t("form.city")}</label>
                         <input
                            type="text"
                            value={deliveryInfo.address.city}
                            onChange={(e) => setDeliveryInfo(p => ({ ...p, address: { ...p.address, city: e.target.value } }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                          />
                      </div>

                      <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">{t("form.street")}</label>
                         <input
                            type="text"
                            value={deliveryInfo.address.street}
                            onChange={(e) => setDeliveryInfo(p => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                          />
                      </div>
                  </div>
                  </>
                )}

                {(session.data?.user || quickOrderMode) && domainConfig.key === "ua" && (
                  <div className="pt-4 border-t">
                    <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Nova Poshta</h4>
                    <NovaPostDelivery
                      onChange={setNovaPostState}
                      initialState={lastDeliveryInitial}
                    />
                    {novaPostState?.method === "nova_courier" && (!deliveryInfo.address.city?.trim() || !deliveryInfo.address.street?.trim()) && (
                      <div className="mt-3 flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        {tNova("courierAddressMissing")}
                      </div>
                    )}
                  </div>
                )}

                {(session.data?.user || quickOrderMode) && domainConfig.key === "pl" && (
                  <div className="pt-4 border-t">
                    <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Dostawa</h4>
                    <DeliveryPoland
                      onChange={setDeliveryPolandState}
                      cartItems={itemDimensions}
                      orderTotal={orderTotalNumeric}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 lg:mt-8 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="acceptTerms" className="text-xs lg:text-sm text-gray-600 leading-tight">
                  {t("terms.acceptPrefix")}{" "}
                  <Link href="/terms" className="text-blue-600 underline">{t("terms.termsOfService")}</Link>
                  {" "}{t("terms.and")}{" "}
                  <Link href="/privacy" className="text-blue-600 underline">{t("terms.userAgreement")}</Link>
                </label>
              </div>

              {orderError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {orderError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isConfirmOrderDisabled()}
                className="w-full bg-red-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-red-200 hover:bg-red-700 disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-[0.98]"
              >
                {isSubmittingOrder ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    {t("buttons.placingOrder")}
                  </span>
                ) : t("buttons.confirmOrder")}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Payment confirmation dialog for bank_transfer / cash_on_delivery */}
      {paymentDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 lg:p-8">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-center mb-3">
              {t("messages.orderSuccess")}
            </h2>
            <p className="text-gray-600 text-sm text-center mb-6">
              {paymentDialog.type === "bank_transfer"
                ? t("dialog.bankTransferInfo")
                : t("dialog.cashOnDeliveryInfo")}
            </p>
            <div className="text-center text-xs text-gray-400 mb-6">
              {t("messages.orderCreated")} <span className="font-mono font-semibold text-gray-600">#{paymentDialog.orderId?.substring(0, 8)}</span>
            </div>
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              {t("dialog.goToDashboard")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}