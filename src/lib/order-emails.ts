/**
 * Order & Payment Email Notifications
 *
 * Sends email notifications to the manager (sales@powerautomation.pl)
 * and to the customer on:
 *  - New order placement
 *  - Successful payment
 */

import { email } from '@/helpers/email/resend';
import logger from '@/lib/logger';

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
  totalPrice: string;
  originalTotalPrice: number;
  currency?: string;
  lineItems: Array<{
    name: string;
    articleId: string;
    quantity: number;
    unitPrice?: number | null;
    lineTotal?: number | null;
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

function buildItemsTableHtml(lineItems: OrderEmailData['lineItems']): string {
  const rows = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${item.name || item.articleId}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.articleId}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.lineTotal != null ? formatCurrency(item.lineTotal) : '—'}</td>
      </tr>`
    )
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">Product</th>
          <th style="padding:8px;border:1px solid #ddd;">Article</th>
          <th style="padding:8px;border:1px solid #ddd;">Qty</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right;">Unit Price</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total</th>
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
  const subject = `New Order #${data.orderShortId} from ${data.customerName}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1a56db;">New Order Received</h2>
      <p><strong>Order ID:</strong> #${data.orderShortId}</p>
      <p><strong>Customer:</strong> ${data.customerName}</p>
      <p><strong>Email:</strong> ${data.customerEmail}</p>
      ${data.customerPhone ? `<p><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
      ${data.companyName ? `<p><strong>Company:</strong> ${data.companyName}</p>` : ''}
      <p><strong>Total:</strong> ${formatCurrency(data.originalTotalPrice)} (${data.totalPrice})</p>
      ${data.comment ? `<p><strong>Comment:</strong> ${data.comment}</p>` : ''}
      
      <h3>Order Items</h3>
      ${buildItemsTableHtml(data.lineItems)}
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">This is an automated notification from PowerAutomation.</p>
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
  const subject = `Order Confirmation #${data.orderShortId} — PowerAutomation`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1a56db;">Thank you for your order!</h2>
      <p>Dear ${data.customerName},</p>
      <p>We have received your order <strong>#${data.orderShortId}</strong>.</p>
      
      <h3>Order Summary</h3>
      ${buildItemsTableHtml(data.lineItems)}
      
      <p style="font-size:18px;"><strong>Total: ${formatCurrency(data.originalTotalPrice)}</strong> (${data.totalPrice})</p>
      
      <p>You will receive another email once your payment is confirmed.</p>
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">If you have questions, contact us at ${process.env.MANAGER_EMAILS?.split(',')[0]?.trim() || 'sales@powerautomation.pl'}</p>
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
  const subject = `Payment Received for Order #${data.orderShortId}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#16a34a;">Payment Received</h2>
      <p><strong>Order ID:</strong> #${data.orderShortId}</p>
      <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
      ${data.customerPhone ? `<p><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
      ${data.companyName ? `<p><strong>Company:</strong> ${data.companyName}</p>` : ''}
      <p><strong>Payment Amount:</strong> ${formatCurrency(data.paymentAmount, data.paymentCurrency)}</p>
      <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
      ${data.transactionId ? `<p><strong>Transaction ID:</strong> ${data.transactionId}</p>` : ''}
      <p><strong>Order Total:</strong> ${formatCurrency(data.originalTotalPrice)} (${data.totalPrice})</p>
      
      <h3>Order Items</h3>
      ${buildItemsTableHtml(data.lineItems)}
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">This is an automated notification from PowerAutomation.</p>
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
  const subject = `Payment Confirmed — Order #${data.orderShortId} — PowerAutomation`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#16a34a;">Payment Confirmed!</h2>
      <p>Dear ${data.customerName},</p>
      <p>Your payment for order <strong>#${data.orderShortId}</strong> has been successfully processed.</p>
      
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;"><strong>Amount Paid:</strong> ${formatCurrency(data.paymentAmount, data.paymentCurrency)}</p>
        <p style="margin:4px 0 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
        ${data.transactionId ? `<p style="margin:4px 0 0;"><strong>Transaction ID:</strong> ${data.transactionId}</p>` : ''}
      </div>
      
      <h3>Order Summary</h3>
      ${buildItemsTableHtml(data.lineItems)}
      
      <p style="font-size:18px;"><strong>Total: ${formatCurrency(data.originalTotalPrice)}</strong></p>
      
      <p>Your order is now being processed. We will notify you when it ships.</p>
      
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#666;font-size:12px;">If you have questions, contact us at ${process.env.MANAGER_EMAILS?.split(',')[0]?.trim() || 'sales@powerautomation.pl'}</p>
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
