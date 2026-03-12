'use client';

import { useMemo } from 'react';
import {
  getDomainConfigByKey,
  DOMAIN_COOKIE,
  type DomainConfig,
  type DomainKey,
  DOMAIN_CONFIGS,
} from '@/lib/domain-config';

/**
 * Клієнтський хук для отримання конфігурації домену.
 * Читає ключ домену з cookie, яку встановлює middleware.
 */
export function useDomainConfig(): DomainConfig {
  const domainKey = useMemo<DomainKey>(() => {
    if (typeof document === 'undefined') return 'pl';
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
  }, []);

  return getDomainConfigByKey(domainKey);
}

/**
 * Повертає ключ домену з клієнтського контексту.
 */
export function useDomainKey(): DomainKey {
  return useDomainConfig().key;
}
