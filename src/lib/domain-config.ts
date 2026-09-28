/**
 * Мульти-доменна конфігурація сайту.
 *
 * Кожен домен має свої:
 *  - локаль за замовчуванням
 *  - дозволені локалі
 *  - локаль для індексації (robots / sitemap)
 *  - контактні дані
 *  - платіжні системи
 *  - Google Tag Manager ID
 *  - GA4 Measurement Protocol (серверні purchase-події)
 *  - базовий URL
 */

// ---------- типи ----------

export type DomainKey = 'ua' | 'pl';

export interface DomainContacts {
  address: string[];
  phone: string;
  phoneFormatted: string;
  email: string;
  contactPerson?: string;
  contactRole?: string;
}

export interface DomainGa4Config {
  /** GA4 Measurement ID (G-XXXXXXX) — свій для кожного домену */
  measurementId: string;
  /** GA4 API secret для Measurement Protocol */
  apiSecret: string;
  /**
   * GA4 не дає перевизначити вбудований Geo/Country через Measurement
   * Protocol — країна визначається за IP нашого сервера, а не покупця.
   * Тому кладемо країну домену в кастомний параметр для звітів.
   */
  conversionCountry: string;
}

export interface DomainConfig {
  /** Ключ домену */
  key: DomainKey;
  /** Канонічний хост (без схеми) */
  host: string;
  /** Базовий URL зі схемою */
  baseUrl: string;
  /** Локаль за замовчуванням для цього домену */
  defaultLocale: string;
  /** Локалі, які можна обрати на цьому домені */
  availableLocales: string[];
  /** Локалі, які індексуються пошуковими системами */
  indexedLocales: string[];
  /** Платіжні системи: 'liqpay' | 'przelewy24' */
  paymentProviders: string[];
  /**
   * Способи оплати, що проходять через онлайн-шлюз. Для них `purchase`
   * НЕ надсилається на чекауті — конверсія відкладається до фактичного
   * підтвердження оплати (див. /api/payments/claim-conversion).
   * Усі інші способи вважаються офлайновими: на чекауті одразу
   * надсилається `order_confirm_offline`.
   */
  onlinePaymentMethods: string[];
  /**
   * Способи оплати поза шлюзом (переказ, оплата при отриманні). Підтверджувати
   * нічого не треба, тож на чекауті одразу надсилається `order_confirm_offline`.
   * Список явний (а не «все, що не онлайн»), щоб подія не надсилалась на
   * замовленнях, де спосіб оплати ще не обрано.
   */
  offlinePaymentMethods: string[];
  /** GTM Container ID */
  gtmId: string;
  /** GA4 Measurement Protocol — серверний фолбек для purchase-конверсій */
  ga4: DomainGa4Config;
  /** Включити Binotel віджети */
  binotelEnabled: boolean;
  /** Контактна інформація */
  contacts: DomainContacts;
  /** Назва компанії / сайту */
  siteName: string;
  /** Валюта за замовчуванням */
  currency: string;
}

// ---------- конфіг ----------

export const DOMAIN_CONFIGS: Record<DomainKey, DomainConfig> = {
  ua: {
    key: 'ua',
    host: 'powerautomation.com.ua',
    baseUrl: 'https://powerautomation.com.ua',
    defaultLocale: 'ua',
    availableLocales: ['ua', 'en', 'es', 'pl'],
    indexedLocales: ['ua'],
    paymentProviders: ['liqpay', 'liqpay_installments'],
    onlinePaymentMethods: ['online_card', 'installment'],
    offlinePaymentMethods: ['bank_transfer', 'cash_on_delivery'],
    gtmId: process.env.APP_GTM_ID_UA ?? '',
    ga4: {
      measurementId: process.env.GA4_MEASUREMENT_ID_UA ?? '',
      apiSecret: process.env.GA4_API_SECRET_UA ?? '',
      conversionCountry: 'Ukraine',
    },
    binotelEnabled: true,
    contacts: {
      address: ['Україна, м. Житомир, вул. Київська 77, оф.605'], // TODO: уточнити адресу
      phone: '+380678202785', // TODO: уточнити телефон
      phoneFormatted: '+380 67 820 27 85',
      email: 'sale@powerautomation.com.ua',
    },
    siteName: 'Power Automation Україна',
    currency: 'UAH',
  },
  pl: {
    key: 'pl',
    host: 'powerautomation.pl',
    baseUrl: 'https://powerautomation.pl',
    defaultLocale: 'pl',
    availableLocales: ['pl', 'en', 'es', 'ua'],
    indexedLocales: ['pl'],
    paymentProviders: ['przelewy24'],
    onlinePaymentMethods: ['przelewy24'],
    offlinePaymentMethods: ['bank_transfer'],
    gtmId: process.env.APP_GTM_ID_PL ?? '',
    ga4: {
      measurementId: process.env.GA4_MEASUREMENT_ID_PL ?? '',
      apiSecret: process.env.GA4_API_SECRET_PL ?? '',
      conversionCountry: 'Poland',
    },
    binotelEnabled: true,
    contacts: {
      address: ['Tyniecka 2, 52-407', 'Wrocław, Polska'],
      phone: '+48690997944',
      phoneFormatted: '+48 690 997 944',
      email: 'sales@powerautomation.pl',
      contactPerson: 'Maria',
      contactRole: 'Manager ds. sprzedaży',
    },
    siteName: 'Power Automation',
    currency: 'PLN',
  },
};

// ---------- хелпери ----------

/** Масив усіх хостів */
const ALL_HOSTS = Object.values(DOMAIN_CONFIGS).map((c) => c.host);

/**
 * Визначає конфіг домену за значенням заголовка Host.
 *
 * Порядок перевірки:
 * 1. Основні хости (powerautomation.pl, powerautomation.com.ua)
 * 2. Тестові хости з env-змінних APP_UA_TEST_HOST та APP_PL_TEST_HOST
 * 3. Fallback → PL конфіг
 */
export function getDomainConfigByHost(host: string | null | undefined): DomainConfig {
  const fallback = (() => {
    const key = process.env.APP_DOMAIN_KEY as DomainKey | undefined;
    return (key && DOMAIN_CONFIGS[key]) ? DOMAIN_CONFIGS[key] : DOMAIN_CONFIGS.pl;
  })();

  if (!host) return fallback;
  // Забираємо порт (напр. localhost:3000)
  const cleanHost = host.split(':')[0].toLowerCase();

  // 1. Основні продакшн хости
  for (const config of Object.values(DOMAIN_CONFIGS)) {
    if (cleanHost === config.host || cleanHost.endsWith(`.${config.host}`)) {
      return config;
    }
  }

  // 2. Тестові хости з env-змінних
  //    APP_UA_TEST_HOST=test.example.com → поводиться як powerautomation.com.ua
  //    APP_PL_TEST_HOST=test2.example.com → поводиться як powerautomation.pl
  const uaTestHost = process.env.APP_UA_TEST_HOST?.toLowerCase();
  const plTestHost = process.env.APP_PL_TEST_HOST?.toLowerCase();

  if (uaTestHost && (cleanHost === uaTestHost || cleanHost.endsWith(`.${uaTestHost}`))) {
    return DOMAIN_CONFIGS.ua;
  }
  if (plTestHost && (cleanHost === plTestHost || cleanHost.endsWith(`.${plTestHost}`))) {
    return DOMAIN_CONFIGS.pl;
  }

  // 3. Fallback → APP_DOMAIN_KEY or 'pl'
  return fallback;
}

/**
 * Визначає DomainKey з Host заголовку.
 */
export function getDomainKeyByHost(host: string | null | undefined): DomainKey {
  return getDomainConfigByHost(host).key;
}

/**
 * Повертає конфіг за ключем.
 */
export function getDomainConfigByKey(key: DomainKey): DomainConfig {
  return DOMAIN_CONFIGS[key] ?? DOMAIN_CONFIGS.pl;
}

/**
 * Онлайн-шлюз (`payment.metadata.provider`) → домен. Використовується на
 * сервері (sweep), де немає ні Host-заголовка, ні браузера, але треба знати,
 * у яку GA4-property репортувати конверсію.
 */
const GATEWAY_DOMAIN: Record<string, DomainKey> = {
  liqpay: 'ua',
  przelewy24: 'pl',
};

/**
 * Домен платежу, якщо він пройшов через онлайн-шлюз, інакше `null`.
 *
 * Тільки такі платежі мають відкладену `purchase`-конверсію. Рядки без
 * `provider` (наприклад, рахунок-фактура, яку адмін позначив оплаченою)
 * навмисно повертають `null`: за специфікацією оплата поза шлюзом уже
 * відрепортована як `order_confirm_offline` на чекауті, тож надсилати по ній
 * ще й `purchase` означало б подвійний облік. Домен НЕ вгадується за
 * валютою — краще не відправити конверсію, ніж відправити її в чужий тег.
 */
export function getOnlineGatewayDomainKey(payment: { metadata?: unknown }): DomainKey | null {
  const provider = (payment.metadata as { provider?: unknown } | null)?.provider;
  if (typeof provider === 'string' && GATEWAY_DOMAIN[provider]) {
    return GATEWAY_DOMAIN[provider];
  }
  return null;
}

/**
 * Ім'я cookie / заголовку для передачі ключа домену між middleware та клієнтом.
 */
export const DOMAIN_HEADER = 'x-domain-key';
export const DOMAIN_COOKIE = 'domain-key';
