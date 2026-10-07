/**
 * EmailJS server-side delivery (REST: POST https://api.emailjs.com/api/v1.0/email/send).
 * Runs ONLY on the backend — private key never leaves the server.
 * Template params exactly match the shared EnquiryForm fields:
 *   name, phone, email, projectType, message
 */
const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';

const REQUIRED_VARS = [
  'EMAILJS_SERVICE_ID',
  'EMAILJS_TEMPLATE_ID',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_PRIVATE_KEY',
];

function isPlaceholderLike(value) {
  if (!value) return true;
  const v = String(value).trim();
  if (!v) return true;
  return /^(xxxx|example|your-|test-|placeholder|change-?me|undefined|null)/i.test(v);
}

export function getEmailJsConfigStatus() {
  const missing = REQUIRED_VARS.filter((k) => !String(process.env[k] || '').trim());
  const placeholderLike = REQUIRED_VARS.filter(
    (k) => !missing.includes(k) && isPlaceholderLike(process.env[k])
  );
  const invalid = [...missing, ...placeholderLike];
  return {
    configured: invalid.length === 0,
    missing,
    placeholderLike,
    invalid,
  };
}

function classifyEmailJsError(status, bodyText) {
  const text = String(bodyText || '');
  if (/non-browser environments|enable.*security|access.*disabled/i.test(text)) {
    return { code: 'EMAILJS_AUTH_FAILED', statusCode: 502 };
  }
  if (
    status === 401 || status === 403 ||
    /invalid.*(key|token|access|user_id)|unauthorized|forbidden|access denied/i.test(text)
  ) {
    return { code: 'EMAILJS_AUTH_FAILED', statusCode: 502 };
  }
  if (status === 400 && /public key is invalid/i.test(text)) {
    return { code: 'EMAILJS_AUTH_FAILED', statusCode: 502 };
  }
  if (status === 404 || /service.*not found|template.*not found|invalid.*(service|template)/i.test(text)) {
    return { code: 'EMAILJS_INVALID_SERVICE_OR_TEMPLATE', statusCode: 502 };
  }
  if (status === 429 || /rate limit|too many/i.test(text)) {
    return { code: 'EMAILJS_RATE_LIMITED', statusCode: 503 };
  }
  if (status >= 500) {
    return { code: 'EMAILJS_API_FAILURE', statusCode: 502 };
  }
  return { code: 'EMAILJS_SEND_FAILED', statusCode: 502 };
}

/**
 * Send one enquiry notification via EmailJS REST.
 * Resolves { ok:true } ONLY when EmailJS returns HTTP 200 with body "OK".
 * Rejects with an operational error carrying { emailCode, statusCode, missing }
 * for: config missing (EMAILJS_CONFIG_MISSING), auth, invalid service/template,
 * rate-limit, network/timeout, generic API failure. Never includes secrets.
 */
export async function sendEnquiryEmail({ name, phone, email, projectType, message }, options = {}) {
  const status = getEmailJsConfigStatus();
  if (!status.configured) {
    const err = new Error(
      `Email service is not configured (missing: ${status.invalid.join(', ')}).`
    );
    err.code = 'EMAILJS_CONFIG_MISSING';
    err.statusCode = 503;
    err.missing = status.invalid;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  // EmailJS REST API requires an Origin header; without it, API access is rejected with
  // 403 Forbidden ("API access from non-browser environments is currently disabled").
  const callerOrigin = options.origin;
  const requestOrigin =
    callerOrigin ||
    process.env.EMAILJS_ORIGIN ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://sabr-studio.vercel.app';

  const cleanName = String(name || '').trim();
  const cleanProjectType = String(projectType || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanMessage = String(message || '').trim();

  // Subject requirement: "New Enquiry from {{name}} — {{projectType}}"
  const subjectLine = cleanProjectType
    ? `New Enquiry from ${cleanName || 'Prospective Client'} — ${cleanProjectType}`
    : `New Enquiry from ${cleanName || 'Prospective Client'}`;

  const templateParams = {
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    projectType: cleanProjectType,
    message: cleanMessage,
    subject: subjectLine,
    reply_to: cleanEmail || '',
  };

  let res;
  let bodyText = '';
  try {
    res = await fetch(EMAILJS_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': requestOrigin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: templateParams,
      }),
    });
    bodyText = await res.text().catch(() => '');
  } catch (networkErr) {
    const err = new Error(
      networkErr?.name === 'AbortError'
        ? 'Email service timed out. Please try again.'
        : 'Email service is temporarily unreachable. Please try again.'
    );
    err.code = networkErr?.name === 'AbortError' ? 'EMAILJS_TIMEOUT' : 'EMAILJS_NETWORK_FAILURE';
    err.statusCode = 503;
    err.cause = networkErr;
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const ok = res.ok && bodyText.trim() === 'OK';
  if (!ok) {
    const { code, statusCode } = classifyEmailJsError(res.status, bodyText);
    const safeDetail = bodyText.slice(0, 300).replace(/[\r\n]+/g, ' ');
    // Safe server-side log: status + EmailJS message only, never keys/secrets.
    console.error(
      `[EmailJS] send failed: code=${code} http=${res.status} detail=${safeDetail || '(empty response)'}`
    );
    const err = new Error('Failed to deliver enquiry email. Please try again.');
    err.code = code;
    err.statusCode = statusCode;
    err.emailjsStatus = res.status;
    err.emailjsDetail = safeDetail;
    throw err;
  }

  return { ok: true };
}
