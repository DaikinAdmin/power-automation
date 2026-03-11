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
  /** GTM Container ID */
  gtmId: string;
  /** Включити Binotel віджети */
  binotelEnabled: boolean;
  /** Контактна інформація */
  contacts: DomainContacts;
  /** Назва компанії / сайту */
  siteName: string;
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
    paymentProviders: ['liqpay'],
    gtmId: process.env.APP_GTM_ID_UA ?? '',
    binotelEnabled: true,
    contacts: {
      address: ['Україна, м. Київ'], // TODO: уточнити адресу
      phone: '+380678202785', // TODO: уточнити телефон
      phoneFormatted: '+380 67 820 27 85',
      email: 'info@powerautomation.com.ua',
    },
    siteName: 'Power Automation Україна',
  },
  pl: {
    key: 'pl',
    host: 'powerautomation.pl',
    baseUrl: 'https://powerautomation.pl',
    defaultLocale: 'pl',
    availableLocales: ['pl', 'en', 'es', 'ua'],
    indexedLocales: ['pl'],
    paymentProviders: ['przelewy24'],
    gtmId: process.env.APP_GTM_ID_PL ?? '',
    binotelEnabled: true,
    contacts: {
      address: ['Tyniecka 2, 52-407', 'Wrocław, Polska'],
      phone: '+48690997944',
      phoneFormatted: '+48 690 997 944',
      email: 'm.sokolowska@ammproject.com',
      contactPerson: 'Maria Sokołowska',
      contactRole: 'Manager ds. sprzedaży',
    },
    siteName: 'Power Automation',
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
  if (!host) return DOMAIN_CONFIGS.pl;
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

  // 3. Fallback
  return DOMAIN_CONFIGS.pl;
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
 * Ім'я cookie / заголовку для передачі ключа домену між middleware та клієнтом.
 */
export const DOMAIN_HEADER = 'x-domain-key';
export const DOMAIN_COOKIE = 'domain-key';
