import { getTranslations } from 'next-intl/server';
import type { OrderStatus, PaymentStatus } from '@/db/schema';
import type { DeliveryStatus } from '@/helpers/delivery';

type Options = { locale?: string };

/** Will be Helper for server translations */
