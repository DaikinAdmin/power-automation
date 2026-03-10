import { headers, cookies } from 'next/headers';
import {
  getDomainConfigByHost,
  getDomainConfigByKey,
  DOMAIN_HEADER,
  DOMAIN_COOKIE,
  type DomainConfig,
  type DomainKey,
} from '@/lib/domain-config';

/**
 * Серверна функція для отримання конфігурації домену.
 * Працює в Server Components і Route Handlers.
 *
 * Спочатку перевіряє заголовок x-domain-key (встановлює middleware),
 * потім cookie, потім визначає по Host.
 */
export async function getServerDomainConfig(): Promise<DomainConfig> {
  const headersList = await headers();

  // 1. Заголовок від middleware
  const domainKeyFromHeader = headersList.get(DOMAIN_HEADER) as DomainKey | null;
  if (domainKeyFromHeader) {
    return getDomainConfigByKey(domainKeyFromHeader);
  }

  // 2. Cookie
  const cookieStore = await cookies();
  const domainKeyFromCookie = cookieStore.get(DOMAIN_COOKIE)?.value as DomainKey | undefined;
  if (domainKeyFromCookie) {
    return getDomainConfigByKey(domainKeyFromCookie);
  }

  // 3. Host header
  const host = headersList.get('x-forwarded-host') || headersList.get('host');
  return getDomainConfigByHost(host);
}
