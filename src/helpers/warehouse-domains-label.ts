import { DOMAIN_CONFIGS, type DomainKey } from '@/lib/domain-config';

const ALL_DOMAINS = Object.keys(DOMAIN_CONFIGS) as DomainKey[];

/**
 * Formats a short "(UA, PL)" / "(PL only)" / "(hidden everywhere)" suffix for
 * a warehouse's per-domain visibility — used in admin price editors (item
 * modal, price-edit modal) so an admin picking a warehouse for a price entry
 * can see at a glance where that warehouse is actually visible to customers.
 */
export function warehouseDomainsLabel(
  visibility: Partial<Record<DomainKey, boolean>> | undefined
): string {
  if (!visibility) return '';
  const visibleDomains = ALL_DOMAINS.filter((domain) => visibility[domain]);
  if (visibleDomains.length === 0) return '(hidden everywhere)';
  if (visibleDomains.length === ALL_DOMAINS.length) {
    return `(${visibleDomains.map((d) => d.toUpperCase()).join(', ')})`;
  }
  return `(${visibleDomains.map((d) => d.toUpperCase()).join(', ')} only)`;
}
