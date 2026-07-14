/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * Used to start the periodic offline-conversion sweep (see
 * src/lib/ga4-conversion-sweep.ts). This only makes sense in the standalone
 * Node.js server (this app runs as a single long-lived container, not
 * serverless), so it's guarded to the nodejs runtime.
 */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { sweepUnclaimedConversions } = await import('@/lib/ga4-conversion-sweep');

    setInterval(() => {
      sweepUnclaimedConversions().catch((error) => {
        console.error('GA4 conversion sweep failed', error);
      });
    }, SWEEP_INTERVAL_MS);
  }
}
