'use client';

import { useState, useEffect } from 'react';
import {
  getDomainConfigByKey,
  DOMAIN_COOKIE,
  type DomainConfig,
  type DomainKey,
  DOMAIN_CONFIGS,
} from '@/lib/domain-config';

function resolveDomainKey(): DomainKey {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === DOMAIN_COOKIE) {
      return (value as DomainKey) || 'pl';
    }
  }
  // Fallback: визначити по window.location.hostname
  const host = window.location.hostname;
  if (host.includes('powerautomation.com.ua')) return 'ua';
  if (host.includes('powerautomation.pl')) return 'pl';
  // Для localhost використовуємо NEXT_PUBLIC_DOMAIN_KEY якщо задано
  const envKey = process.env.NEXT_PUBLIC_DOMAIN_KEY as DomainKey | undefined;
  if (envKey && DOMAIN_CONFIGS[envKey]) return envKey;
  return 'pl';
}

const SERVER_FALLBACK_KEY: DomainKey = (process.env.NEXT_PUBLIC_DOMAIN_KEY as DomainKey | undefined) ?? 'pl';

/**
 * Клієнтський хук для отримання конфігурації домену.
 * Читає ключ домену з cookie, яку встановлює middleware.
 *
 * Для уникнення hydration mismatch початковий стан визначається з
 * NEXT_PUBLIC_DOMAIN_KEY (однаковий на сервері та клієнті), а після
 * монтування оновлюється з cookie / hostname.
 */
export function useDomainConfig(): DomainConfig {
  const [config, setConfig] = useState<DomainConfig>(() =>
    getDomainConfigByKey(SERVER_FALLBACK_KEY)
  );

  useEffect(() => {
    const key = resolveDomainKey();
    setConfig(getDomainConfigByKey(key));
  }, []);

  return config;
}

/**
 * Повертає ключ домену з клієнтського контексту.
 */
export function useDomainKey(): DomainKey {
  return useDomainConfig().key;
}
