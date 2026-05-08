/**
 * Telegram Bot Notifications
 *
 * Sends messages to manager chat IDs via the Telegram Bot API.
 * Requires:
 *  - TELEGRAM_BOT_TOKEN  — bot token from @BotFather
 *  - MANAGER_TELEGRAM_CHAT_IDS — comma-separated list of chat IDs to notify
 */

import logger from '@/lib/logger';
import { OrderEmailData } from '@/lib/order-emails';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

function getManagerChatIds(): string[] {
  const raw = process.env.MANAGER_TELEGRAM_CHAT_IDS || '';
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = getBotToken();
  if (!token) {
    logger.warn('TELEGRAM_BOT_TOKEN is not set, skipping Telegram notification');
    return;
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${body}`);
  }
}

function buildNewOrderMessage(data: OrderEmailData): string {
  const shortId = data.orderShortId;
  const lines = [
    `🛒 <b>Нове замовлення #${shortId}</b>`,
    ``,
    `👤 <b>Клієнт:</b> ${data.customerName}`,
    `📧 <b>Email:</b> ${data.customerEmail}`,
  ];

  if (data.customerPhone) {
    lines.push(`📞 <b>Телефон:</b> ${data.customerPhone}`);
  }
  if (data.companyName) {
    lines.push(`🏢 <b>Компанія:</b> ${data.companyName}`);
  }

  lines.push(`💰 <b>Сума:</b> ${data.totalGross.toFixed(2)} ${data.currency}`);

  if (data.lineItems.length > 0) {
    lines.push(``, `📦 <b>Позиції:</b>`);
    for (const item of data.lineItems) {
      const name = item.name || item.articleId;
      const price =
        item.lineTotalGrossConverted != null
          ? ` — ${item.lineTotalGrossConverted.toFixed(2)} ${data.currency}`
          : '';
      lines.push(`  • ${name} × ${item.quantity}${price}`);
    }
  }

  if (data.comment) {
    lines.push(``, `💬 <b>Коментар:</b> ${data.comment}`);
  }

  return lines.join('\n');
}

/** Send new order notification to all configured manager Telegram chats (non-blocking). */
export async function sendNewOrderTelegramNotification(data: OrderEmailData): Promise<void> {
  const chatIds = getManagerChatIds();
  if (chatIds.length === 0) {
    logger.warn('MANAGER_TELEGRAM_CHAT_IDS is not set, skipping Telegram notification');
    return;
  }

  const text = buildNewOrderMessage(data);

  const results = await Promise.allSettled(
    chatIds.map((chatId) => sendTelegramMessage(chatId, text))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected') {
      logger.error('Failed to send Telegram notification', {
        orderId: data.orderId,
        chatId: chatIds[i],
        error: String(result.reason),
      });
    }
  }

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  if (successCount > 0) {
    logger.info('Telegram order notification sent', {
      orderId: data.orderId,
      successCount,
      totalRecipients: chatIds.length,
    });
  }
}
