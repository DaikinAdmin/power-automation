// Єдине джерело правди для видимості складів по доменах (крос-доменна архітектура).
//
// Модель: allowlist. Якщо для пари (warehouseId, domain) немає рядка в
// warehouse_visibility — склад на цьому домені НЕ показується.
// Ефективна видимість:
//   warehouse.isVisible === true  AND  warehouse_visibility.visible === true
// тобто warehouse.isVisible лишається глобальним рубильником (вимкнув —
// зник усюди), а warehouse_visibility — точкове налаштування по домену.
//
// Усі публічні запити (каталог, картка товару, пошук, фід, створення
// замовлення) мають фільтрувати склади ТІЛЬКИ через ці хелпери, а не
// дублювати умову самостійно.

import { db } from '@/db';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { randomUUID } from 'crypto';
import type { DomainKey } from '@/lib/domain-config';
import { DOMAIN_CONFIGS } from '@/lib/domain-config';

/**
 * Повертає id усіх складів, видимих на заданому домені.
 */
export async function getVisibleWarehouseIds(domainKey: DomainKey): Promise<string[]> {
  const rows = await db
    .select({ warehouseId: schema.warehouse.id })
    .from(schema.warehouse)
    .innerJoin(
      schema.warehouseVisibility,
      and(
        eq(schema.warehouseVisibility.warehouseId, schema.warehouse.id),
        eq(schema.warehouseVisibility.domain, domainKey),
        eq(schema.warehouseVisibility.visible, true)
      )
    )
    .where(eq(schema.warehouse.isVisible, true));

  return rows.map((r) => r.warehouseId);
}

/**
 * Перевіряє, чи видимий конкретний склад на заданому домені.
 * Використовується для серверної валідації (створення замовлення,
 * заявка "повідомити про наявність" тощо) — не покладайся на те, що
 * клієнт присилає тільки дозволені warehouseId.
 */
export async function isWarehouseVisibleOnDomain(
  warehouseId: string,
  domainKey: DomainKey
): Promise<boolean> {
  const [row] = await db
    .select({ warehouseId: schema.warehouse.id })
    .from(schema.warehouse)
    .innerJoin(
      schema.warehouseVisibility,
      and(
        eq(schema.warehouseVisibility.warehouseId, schema.warehouse.id),
        eq(schema.warehouseVisibility.domain, domainKey),
        eq(schema.warehouseVisibility.visible, true)
      )
    )
    .where(and(eq(schema.warehouse.id, warehouseId), eq(schema.warehouse.isVisible, true)))
    .limit(1);

  return !!row;
}

/**
 * Мапа warehouseId -> список доменів, на яких він видимий.
 * Для адмінки (таблиця складів, бейджі UA/PL у редакторах цін).
 * Якщо warehouseIds не передано — повертає мапу по всіх складах.
 *
 * Примітка: результат відображає лише рядки warehouse_visibility.visible;
 * глобальний warehouse.isVisible сюди не підмішується — виклик адмінки має
 * власну колонку "Активний" для нього.
 */
export async function getWarehouseVisibilityMap(
  warehouseIds?: string[]
): Promise<Record<string, DomainKey[]>> {
  const rows = await db
    .select({
      warehouseId: schema.warehouseVisibility.warehouseId,
      domain: schema.warehouseVisibility.domain,
    })
    .from(schema.warehouseVisibility)
    .where(
      and(
        eq(schema.warehouseVisibility.visible, true),
        warehouseIds && warehouseIds.length > 0
          ? inArray(schema.warehouseVisibility.warehouseId, warehouseIds)
          : undefined
      )
    );

  const map: Record<string, DomainKey[]> = {};
  for (const row of rows) {
    const domain = row.domain as DomainKey;
    if (!map[row.warehouseId]) map[row.warehouseId] = [];
    map[row.warehouseId].push(domain);
  }
  return map;
}

/**
 * Upsert видимості одного складу на одному домені.
 */
export async function setWarehouseVisibility(
  warehouseId: string,
  domain: DomainKey,
  visible: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await db
    .insert(schema.warehouseVisibility)
    .values({
      id: randomUUID(),
      warehouseId,
      domain,
      visible,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.warehouseVisibility.warehouseId, schema.warehouseVisibility.domain],
      set: { visible, updatedAt: now },
    });
}

/**
 * Створює рядки видимості для складу одразу на всіх доменах.
 * Викликати при POST /api/admin/warehouses — інакше новий склад
 * не матиме жодного рядка і буде невидимий ніде (allowlist).
 *
 * За замовчуванням видимий скрізь, якщо явно не передано visibleOnDomains.
 */
export async function initWarehouseVisibilityForAllDomains(
  warehouseId: string,
  visibleOnDomains?: DomainKey[]
): Promise<void> {
  const now = new Date().toISOString();
  const allDomains = Object.keys(DOMAIN_CONFIGS) as DomainKey[];
  const visibleSet = visibleOnDomains ? new Set(visibleOnDomains) : null;

  await db.insert(schema.warehouseVisibility).values(
    allDomains.map((domain) => ({
      id: randomUUID(),
      warehouseId,
      domain,
      visible: visibleSet ? visibleSet.has(domain) : true,
      createdAt: now,
      updatedAt: now,
    }))
  );
}
