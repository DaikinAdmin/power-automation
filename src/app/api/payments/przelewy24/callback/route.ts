import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import logger from "@/lib/logger";
import crypto from "crypto";

// Przelewy24 configuration
const P24_MERCHANT_ID = process.env.P24_MERCHANT_ID || "";
const P24_POS_ID = process.env.P24_POS_ID || "";
const P24_API_KEY = process.env.P24_API_KEY || "";
const P24_CRC = process.env.P24_CRC || "";
const P24_SANDBOX = process.env.P24_SANDBOX === "true";
const P24_API_URL = P24_SANDBOX
  ? "https://sandbox.przelewy24.pl/api/v1"
  : "https://secure.przelewy24.pl/api/v1";

interface P24NotificationData {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  sign: string;
}

interface P24VerifyRequest {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  currency: string;
  orderId: number;
  sign: string;
}

/**
 * POST /api/payments/przelewy24/callback
 * Handles payment status notifications from Przelewy24.
 *
 * IMPORTANT: Przelewy24 requires HTTP 200 for every response, including
 * errors — otherwise it retries indefinitely. Never return 4xx/5xx here.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as P24NotificationData;

    logger.info("Received Przelewy24 payment callback", {
      sessionId: body.sessionId,
      amount: body.amount,
      p24OrderId: body.orderId,
    });

    // Validate required fields — return 200 with error so P24 stops retrying
    if (!body.sessionId || !body.amount || !body.merchantId || !body.sign) {
      logger.error("Missing required fields in P24 callback", { body });
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 200 },
      );
    }

    // -----------------------------------------------------------------------
    // Verify IPN signature
    // Sign = SHA384(JSON{sessionId, orderId, amount, originAmount, currency, crc})
    // -----------------------------------------------------------------------
    const notificationSignString = JSON.stringify({
      merchantId: body.merchantId,
      posId: body.posId,
      sessionId: body.sessionId,
      amount: body.amount,
      originAmount: body.originAmount,
      currency: body.currency,
      orderId: body.orderId,
      methodId: body.methodId,
      statement: body.statement,
      crc: P24_CRC,
    });
    const expectedNotificationSign = crypto
      .createHash("sha384")
      .update(notificationSignString)
      .digest("hex");

    if (body.sign !== expectedNotificationSign) {
      logger.error(
        "Invalid signature in P24 callback — possible spoofing attempt",
        {
          sessionId: body.sessionId,
          receivedSign: body.sign,
          expectedSign: expectedNotificationSign,
        },
      );
      // Return 200 — do NOT process, but don't let P24 retry forever
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 200 },
      );
    }

    // Find payment record by sessionId
    const [payment] = await db
      .select()
      .from(schema.payment)
      .where(eq(schema.payment.sessionId, body.sessionId))
      .limit(1);

    if (!payment) {
      logger.error("P24 callback: payment record not found", {
        sessionId: body.sessionId,
      });
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 200 },
      );
    }

    // -----------------------------------------------------------------------
    // Verify transaction with Przelewy24
    // Verify sign = SHA384(JSON{sessionId, orderId, amount, currency, crc})
    // NOTE: NO originAmount in the verify sign — different from notification sign!
    // -----------------------------------------------------------------------
    const verifySignString = JSON.stringify({
      sessionId: body.sessionId,
      orderId: body.orderId,
      amount: body.amount,
      currency: body.currency,
      crc: P24_CRC,
    });
    const verifySign = crypto
      .createHash("sha384")
      .update(verifySignString)
      .digest("hex");

    const verifyRequest: P24VerifyRequest = {
      merchantId: parseInt(P24_MERCHANT_ID),
      posId: parseInt(P24_POS_ID),
      sessionId: body.sessionId,
      amount: body.amount,
      currency: body.currency,
      orderId: body.orderId,
      sign: verifySign,
    };

    logger.info("Verifying transaction with Przelewy24", {
      sessionId: body.sessionId,
    });

    const verifyResponse = await fetch(`${P24_API_URL}/transaction/verify`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${P24_POS_ID}:${P24_API_KEY}`).toString("base64")}`,
      },
      body: JSON.stringify(verifyRequest),
    });

    const verifyData = await verifyResponse.json();
    const now = new Date().toISOString();

    if (!verifyResponse.ok) {
      logger.error("P24 transaction verification failed", {
        sessionId: body.sessionId,
        status: verifyResponse.status,
        error: verifyData,
      });

      await db
        .update(schema.payment)
        .set({
          status: "FAILED",
          errorCode: verifyData.code?.toString(),
          errorMessage: verifyData.error || "Transaction verification failed",
          metadata: {
            ...(payment.metadata as any),
            verifyResponse: verifyData,
            callbackData: body,
          },
          updatedAt: now,
        })
        .where(eq(schema.payment.id, payment.id));

      // Return 200 — payment failed but callback was handled correctly
      return NextResponse.json(
        { success: false, message: "Verification failed" },
        { status: 200 },
      );
    }

    logger.info("Przelewy24 transaction verified successfully", {
      sessionId: body.sessionId,
    });

    // Update payment to COMPLETED
    await db
      .update(schema.payment)
      .set({
        status: "COMPLETED",
        transactionId: body.orderId.toString(),
        paymentMethod: body.statement,
        metadata: {
          ...(payment.metadata as any),
          methodId: body.methodId,
          verifyResponse: verifyData,
          callbackData: body,
        },
        updatedAt: now,
      })
      .where(eq(schema.payment.id, payment.id));

    // Advance order to PROCESSING
    await db
      .update(schema.order)
      .set({ status: "PROCESSING", updatedAt: now })
      .where(eq(schema.order.id, payment.orderId));

    const duration = Date.now() - startTime;
    logger.info("Przelewy24 callback processed successfully", {
      paymentId: payment.id,
      orderId: payment.orderId,
      duration,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Log the error but always return 200 — Przelewy24 must not retry on our internal errors
    logger.error("Unhandled error in P24 callback", { error: String(error) });
    return NextResponse.json(
      { success: false, message: "Internal error" },
      { status: 200 },
    );
  }
}

/**
 * GET /api/payments/przelewy24/callback
 * Handles payment return redirect from Przelewy24 (user browser redirect)
 */
export async function GET(request: NextRequest) {
  logger.info("User returned from Przelewy24", { url: request.url });
  return NextResponse.json(
    { success: true, message: "Payment return received" },
    { status: 200 },
  );
}
