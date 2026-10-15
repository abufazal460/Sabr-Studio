import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const defaultLevel = isProduction ? 'info' : 'debug';
const level = process.env.LOG_LEVEL || defaultLevel;

// Optional, opt-in telemetry. Completely disabled unless SENTRY_DSN is set. The
// SDK is resolved lazily so a missing dependency can never break the boot path.
let sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    const { Sentry } = await import('@sentry/node');
    const { nodeIntegration } = await import('@sentry/integrations');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: isProduction ? 'production' : 'development',
      release: process.env.npm_package_version || '1.0.0',
      integrations: [new nodeIntegration()],
      enableNativeTracking: false,
      denyUrls: [/graphql\.netlify\.com/, /cdn\.netlify\.com/],
    });
    sentry = Sentry;
  } catch {
    sentry = null;
  }
}

/**
 * Structured logger for Sabr Studio.
 *
 * - JSON lines on stdout/stderr (machine readable).
 * - Every log entry carries `reqId` when a request id is available.
 * - Log levels by environment: `debug` locally, `info` in production.
 * - Secrets, tokens, OTPs, card data and full payment payloads are NEVER logged:
 *   pino `redact` removes the listed keys, and request logging never surfaces
 *   `req.body` or `req.cookies`.
 */
export const logger = pino({
  level,
  base: { service: 'sabr-studio' },
  formatMessage: (msg) => (typeof msg === 'string' ? msg : String(msg)),
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.cookies',
    'req.body.password',
    'req.body.passwordHash',
    'req.body.otp',
    'req.body.cardNumber',
    'req.body.cardCvc',
    'req.body.cardExpiry',
    'req.body.payment',
    'req.body.razorpaySignature',
    'req.body.razorpayPaymentId',
    'req.body.razorpayOrderId',
    'res.headers',
  ],
  transport: isProduction
    ? undefined
    : { target: 'pino/file', level: 'debug' },
});

export { sentry };

