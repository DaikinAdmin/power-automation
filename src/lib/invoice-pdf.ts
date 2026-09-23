import type { OrderDetail } from '@/types/order';
import type { DeliveryRecord } from '@/types/delivery';
import { DOMAIN_CONFIGS, type DomainKey } from '@/lib/domain-config';
import { loadFont, FONT_FAMILY, fmt } from '@/lib/analytics-utils';

// This is an internal packing-list document (items, quantities, prices, VAT,
// total) — not a fiscal invoice. The codebase has no legal entity
// name/tax-registration/IBAN data for either domain, so those fields are
// deliberately omitted rather than fabricated.
function domainKeyFromCurrency(currency: string | null): DomainKey {
  return currency === 'UAH' ? 'ua' : 'pl';
}

export async function generateOrderInvoicePdf(
  order: OrderDetail,
  delivery: DeliveryRecord | null,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const domainKey = domainKeyFromCurrency(order.currency);
  const seller = DOMAIN_CONFIGS[domainKey];
  const currency = order.currency || seller.currency;

  const doc = new jsPDF();
  await loadFont(doc);

  doc.setFontSize(16);
  doc.text(seller.siteName, 14, 16);
  doc.setFontSize(9);
  let y = 23;
  for (const line of seller.contacts.address) {
    doc.text(line, 14, y);
    y += 5;
  }
  doc.text(`${seller.contacts.phoneFormatted} · ${seller.contacts.email}`, 14, y);

  doc.setFontSize(14);
  doc.text(`#${order.id.slice(0, 8)}`, 150, 16);
  doc.setFontSize(9);
  doc.text(new Date(order.createdAt).toLocaleDateString('uk-UA'), 150, 22);

  const buyerLines: string[] = [];
  if (order.user?.companyName) buyerLines.push(order.user.companyName);
  if (order.user?.name) buyerLines.push(order.user.name);
  if (order.user?.email) buyerLines.push(order.user.email);
  if (order.user?.phoneNumber) buyerLines.push(`${order.user.countryCode || ''}${order.user.phoneNumber}`);
  if (order.user?.vatNumber) buyerLines.push(`VAT/NIP: ${order.user.vatNumber}`);
  if (order.user?.addressLine) buyerLines.push(order.user.addressLine.replaceAll('|', ', '));

  let by = 40;
  doc.setFontSize(11);
  doc.text('Buyer', 14, by);
  doc.setFontSize(9);
  for (const line of buyerLines) {
    by += 5;
    doc.text(line, 14, by);
  }

  // order.lineItems already carries the derived fields (unitPriceGrossConverted,
  // lineVatConverted, lineTotalGrossConverted, …) — the admin order-detail API
  // runs every line item through computeLineItemDerived() server-side before
  // sending it, so there's no need (and no safe way, from client code) to
  // recompute them here.
  const lineItems = order.lineItems ?? [];

  autoTable(doc, {
    startY: Math.max(by + 8, 55),
    head: [['Item', 'Article', 'Qty', 'Unit price', 'VAT', 'Line total']],
    body: lineItems.map((item) => [
      item.name,
      item.articleId,
      String(item.quantity),
      item.unitPriceGrossConverted != null ? fmt(item.unitPriceGrossConverted) : '—',
      item.lineVatConverted != null ? fmt(item.lineVatConverted) : '—',
      item.lineTotalGrossConverted != null ? fmt(item.lineTotalGrossConverted) : '—',
    ]),
    theme: 'grid',
    styles: { fontSize: 8, font: FONT_FAMILY },
    headStyles: { font: FONT_FAMILY, fillColor: [219, 37, 37] },
  });

  const afterItems = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Net: ${fmt(order.totalNet ?? 0)} ${currency}`, 140, afterItems);
  doc.text(`VAT: ${fmt(order.totalVat ?? 0)} ${currency}`, 140, afterItems + 6);
  if (order.discountAmount) {
    doc.text(`Discount: -${fmt(order.discountAmount)} ${currency}`, 140, afterItems + 12);
  }
  doc.setFontSize(12);
  doc.text(
    `Total: ${fmt(order.totalGross ?? 0)} ${currency}`,
    140,
    afterItems + (order.discountAmount ? 20 : 14),
  );

  let trackingY = afterItems + (order.discountAmount ? 30 : 24);
  if (delivery?.trackingNumber) {
    doc.setFontSize(9);
    doc.text(`Carrier tracking number (TTN): ${delivery.trackingNumber}`, 14, trackingY);
    trackingY += 6;
  }

  doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
}
