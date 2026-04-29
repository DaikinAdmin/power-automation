/**
 * Order & Payment Email Notifications
 *
 * Sends email notifications to the manager (sales@powerautomation.pl)
 * and to the customer on:
 *  - New order placement
 *  - Successful payment
 *
 * Emails are rendered in the user's locale (pl | en | ua | es).
 * Falls back to 'en' for unknown locales.
 */

import { email } from '@/helpers/email/resend';
import logger from '@/lib/logger';

type SupportedLocale = 'pl' | 'en' | 'ua' | 'es';
const SUPPORTED_LOCALES: SupportedLocale[] = ['pl', 'en', 'ua', 'es'];

function normalizeLocale(locale?: string): SupportedLocale {
  if (locale && (SUPPORTED_LOCALES as string[]).includes(locale)) {
    return locale as SupportedLocale;
  }
  return 'en';
}

/** Load a translation namespace directly from the JSON file — no request context needed. */
async function loadMessages(locale: SupportedLocale, namespace: string): Promise<Record<string, string>> {
  const allMessages = (await import(`../locales/${locale}.json`)).default as Record<string, unknown>;
  const keys = namespace.split('.');
  let ns: unknown = allMessages;
  for (const key of keys) {
    ns = (ns as Record<string, unknown>)[key];
  }
  return ns as Record<string, string>;
}

/** Replace {variable} placeholders in an ICU-like template. */
function t(messages: Record<string, string>, key: string, vars?: Record<string, string | number>): string {
  const template = messages[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

/** Reads MANAGER_EMAILS env var (comma-separated) and returns a deduplicated array of addresses. */
function getManagerEmails(): string[] {
  const raw = process.env.MANAGER_EMAILS || 'sales@powerautomation.pl';
  return [...new Set(raw.split(',').map((e) => e.trim()).filter(Boolean))];
}

const FROM_EMAIL = process.env.MAIL_USER || 'noreply@powerautomation.pl';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderEmailData {
  orderId: string;
  /** User-facing short order id */
  orderShortId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  totalGross: number;
  currency: string;
  /** BCP-47 / next-intl locale: 'pl' | 'en' | 'ua' | 'es' */
  locale?: string;
  lineItems: Array<{
    name: string;
    articleId: string;
    quantity: number;
    unitPriceGross?: number | null;
    lineTotalGrossConverted?: number | null;
    warehouseName?: string | null;
  }>;
  comment?: string | null;
}

export interface PaymentEmailData extends OrderEmailData {
  paymentMethod: string;
  paymentAmount: number;
  paymentCurrency: string;
  transactionId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount);
}

function buildItemsTableHtml(
  lineItems: OrderEmailData['lineItems'],
  labels: { product: string; article: string; qty: string; unitPrice: string; total: string },
  currency: string,
): string {
  const rows = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${item.name || item.articleId}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.articleId}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.unitPriceGross != null ? formatCurrency(item.unitPriceGross, currency) : '—'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.lineTotalGrossConverted != null ? formatCurrency(item.lineTotalGrossConverted, currency) : '—'}</td>
      </tr>`
    )
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">${labels.product}</th>
          <th style="padding:8px;border:1px solid #ddd;">${labels.article}</th>
          <th style="padding:8px;border:1px solid #ddd;">${labels.qty}</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right;">${labels.unitPrice}</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right;">${labels.total}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// New Order Emails
// ---------------------------------------------------------------------------

/** Email to manager about a new order */
export async function sendNewOrderManagerEmail(data: OrderEmailData): Promise<void> {
  const locale = normalizeLocale(data.locale);
  const m = await loadMessages(locale, 'emails.newOrderManager');
  const mTable = await loadMessages(locale, 'emails.table');

  const subject = t(m, 'subject', { orderShortId: data.orderShortId, customerName: data.customerName });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1a56db;">${t(m, 'title')}</h2>
      <p><strong>${t(m, 'orderId')}:</strong> #${data.orderShortId}</p>
      <p><strong>${t(m, 'customer')}:</strong> ${data.customerName}</p>
      <p><strong>${t(m, 'email')}:</strong> ${data.customerEmail}</p>
      ${data.customerPhone ? `<p><strong>${t(m, 'phone')}:</strong> ${data.customerPhone}</p>` : ''}
      ${data.companyName ? `<p><strong>${t(m, 'company')}:</strong> ${data.companyName}</p>` : ''}
      <p><strong>${t(m, 'total')}:</strong> ${data.totalGross.toFixed(2)} ${data.currency}</p>
      ${data.comment ? `<p><strong>${t(m, 'comment')}:</strong> ${data.comment}</p>` : ''}
      
      <h3>${t(m, 'orderItems')}</h3>
      ${buildItemsTableHtml(data.lineItems, {
        product: t(mTable, 'product'),
        article: t(mTable, 'article'),
        qty: t(mTable, 'qty'),
        unitPrice: t(mTable, 'unitPrice'),
        total: t(mTable, 'total'),
      }, data.currency)}
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">${t(m, 'footer')}</p>
    </div>`;

  try {
    const managerEmails = getManagerEmails();
    await Promise.allSettled(
      managerEmails.map((to) => email.sendMail({ from: FROM_EMAIL, to, subject, html }))
    );
    logger.info('New order email sent to manager', { orderId: data.orderId, recipients: managerEmails });
  } catch (err) {
    logger.error('Failed to send new order email to manager', { orderId: data.orderId, error: String(err) });
  }
}

/** Email to customer confirming their order */
export async function sendNewOrderCustomerEmail(data: OrderEmailData): Promise<void> {
  const locale = normalizeLocale(data.locale);
  const m = await loadMessages(locale, 'emails.newOrderCustomer');
  const mTable = await loadMessages(locale, 'emails.table');

  const subject = t(m, 'subject', { orderShortId: data.orderShortId });
  const contactEmail = process.env.MANAGER_EMAILS?.split(',')[0]?.trim() || 'sales@powerautomation.pl';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1a56db;">${t(m, 'title')}</h2>
      <p>${t(m, 'greeting', { customerName: data.customerName })}</p>
      <p>${t(m, 'received', { orderShortId: data.orderShortId })}</p>
      
      <h3>${t(m, 'orderSummary')}</h3>
      ${buildItemsTableHtml(data.lineItems, {
        product: t(mTable, 'product'),
        article: t(mTable, 'article'),
        qty: t(mTable, 'qty'),
        unitPrice: t(mTable, 'unitPrice'),
        total: t(mTable, 'total'),
      }, data.currency)}
      
      <p style="font-size:18px;"><strong>${t(m, 'total')}: ${data.totalGross.toFixed(2)} ${data.currency}</strong></p>
      
      <p>${t(m, 'nextEmail')}</p>
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">${t(m, 'footer')} ${contactEmail}</p>
    </div>`;

  try {
    await email.sendMail({ from: FROM_EMAIL, to: data.customerEmail, subject, html });
    logger.info('New order email sent to customer', { orderId: data.orderId, customerEmail: data.customerEmail });
  } catch (err) {
    logger.error('Failed to send new order email to customer', { orderId: data.orderId, error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Payment Success Emails
// ---------------------------------------------------------------------------

/** Email to manager about successful payment */
export async function sendPaymentSuccessManagerEmail(data: PaymentEmailData): Promise<void> {
  const locale = normalizeLocale(data.locale);
  const m = await loadMessages(locale, 'emails.paymentSuccessManager');
  const mTable = await loadMessages(locale, 'emails.table');

  const subject = t(m, 'subject', { orderShortId: data.orderShortId });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#16a34a;">${t(m, 'title')}</h2>
      <p><strong>${t(m, 'orderId')}:</strong> #${data.orderShortId}</p>
      <p><strong>${t(m, 'customer')}:</strong> ${data.customerName} (${data.customerEmail})</p>
      ${data.customerPhone ? `<p><strong>${t(m, 'phone')}:</strong> ${data.customerPhone}</p>` : ''}
      ${data.companyName ? `<p><strong>${t(m, 'company')}:</strong> ${data.companyName}</p>` : ''}
      <p><strong>${t(m, 'paymentAmount')}:</strong> ${formatCurrency(data.paymentAmount, data.paymentCurrency)}</p>
      <p><strong>${t(m, 'paymentMethod')}:</strong> ${data.paymentMethod}</p>
      ${data.transactionId ? `<p><strong>${t(m, 'transactionId')}:</strong> ${data.transactionId}</p>` : ''}
      <p><strong>${t(m, 'orderTotal')}:</strong> ${data.totalGross.toFixed(2)} ${data.currency}</p>
      
      <h3>${t(m, 'orderItems')}</h3>
      ${buildItemsTableHtml(data.lineItems, {
        product: t(mTable, 'product'),
        article: t(mTable, 'article'),
        qty: t(mTable, 'qty'),
        unitPrice: t(mTable, 'unitPrice'),
        total: t(mTable, 'total'),
      }, data.currency)}
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">${t(m, 'footer')}</p>
    </div>`;

  try {
    const managerEmails = getManagerEmails();
    await Promise.allSettled(
      managerEmails.map((to) => email.sendMail({ from: FROM_EMAIL, to, subject, html }))
    );
    logger.info('Payment success email sent to manager', { orderId: data.orderId, recipients: managerEmails });
  } catch (err) {
    logger.error('Failed to send payment success email to manager', { orderId: data.orderId, error: String(err) });
  }
}

/** Email to customer confirming successful payment */
export async function sendPaymentSuccessCustomerEmail(data: PaymentEmailData): Promise<void> {
  const locale = normalizeLocale(data.locale);
  const m = await loadMessages(locale, 'emails.paymentSuccessCustomer');
  const mTable = await loadMessages(locale, 'emails.table');

  const subject = t(m, 'subject', { orderShortId: data.orderShortId });
  const contactEmail = process.env.MANAGER_EMAILS?.split(',')[0]?.trim() || 'sales@powerautomation.pl';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#16a34a;">${t(m, 'title')}</h2>
      <p>${t(m, 'greeting', { customerName: data.customerName })}</p>
      <p>${t(m, 'confirmed', { orderShortId: data.orderShortId })}</p>
      
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;"><strong>${t(m, 'amountPaid')}:</strong> ${formatCurrency(data.paymentAmount, data.paymentCurrency)}</p>
        <p style="margin:4px 0 0;"><strong>${t(m, 'paymentMethod')}:</strong> ${data.paymentMethod}</p>
        ${data.transactionId ? `<p style="margin:4px 0 0;"><strong>${t(m, 'transactionId')}:</strong> ${data.transactionId}</p>` : ''}
      </div>
      
      <h3>${t(m, 'orderSummary')}</h3>
      ${buildItemsTableHtml(data.lineItems, {
        product: t(mTable, 'product'),
        article: t(mTable, 'article'),
        qty: t(mTable, 'qty'),
        unitPrice: t(mTable, 'unitPrice'),
        total: t(mTable, 'total'),
      }, data.currency)}
      
      <p style="font-size:18px;"><strong>${t(m, 'total')}: ${data.totalGross.toFixed(2)} ${data.currency}</strong></p>
      
      <p>${t(m, 'processing')}</p>
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">${t(m, 'footer')} ${contactEmail}</p>
    </div>`;

  try {
    await email.sendMail({ from: FROM_EMAIL, to: data.customerEmail, subject, html });
    logger.info('Payment success email sent to customer', { orderId: data.orderId, customerEmail: data.customerEmail });
  } catch (err) {
    logger.error('Failed to send payment success email to customer', { orderId: data.orderId, error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/** Send new order notification to both manager and customer */
export async function sendNewOrderEmails(data: OrderEmailData): Promise<void> {
  await Promise.allSettled([
    sendNewOrderManagerEmail(data),
    sendNewOrderCustomerEmail(data),
  ]);
}

/** Send payment success notification to both manager and customer */
export async function sendPaymentSuccessEmails(data: PaymentEmailData): Promise<void> {
  await Promise.allSettled([
    sendPaymentSuccessManagerEmail(data),
    sendPaymentSuccessCustomerEmail(data),
  ]);
}
