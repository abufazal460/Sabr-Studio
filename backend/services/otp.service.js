/**
 * SMS delivery for phone-login OTPs. Runs ONLY on the backend; provider
 * credentials never leave the server. If no provider is configured we FAIL
 * CLOSED — we never simulate a send or pretend verification succeeded.
 *
 * Supported provider: Twilio Programmable SMS (REST). Configure with:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
const REQUIRED_VARS = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'];

export function isOtpProviderConfigured() {
  return REQUIRED_VARS.every((k) => String(process.env[k] || '').trim().length > 0);
}

function otpProviderError() {
  const e = new Error('Phone OTP delivery is not configured on the server. Please use email login, or contact support.');
  e.code = 'OTP_PROVIDER_NOT_CONFIGURED';
  e.statusCode = 503;
  return e;
}

/**
 * Send a 6-digit code via the configured SMS provider.
 * Resolves true only on a real provider 2xx. Throws an operational error otherwise.
 */
export async function sendOtpSms(phone, code) {
  if (!isOtpProviderConfigured()) throw otpProviderError();

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: from,
        Body: `Your Sabr Studio login code is ${code}. It expires in 5 minutes and can be used once.`,
      }),
    });
  } catch (networkErr) {
    const e = new Error('Could not reach the SMS provider. Please try again.');
    e.code = networkErr?.name === 'AbortError' ? 'OTP_TIMEOUT' : 'OTP_NETWORK_FAILURE';
    e.statusCode = 502;
    throw e;
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    // Log status only — never the code or provider credentials.
    console.error(`[OTP] SMS send failed: http=${res.status}`);
    const e = new Error('SMS provider could not deliver the code. Please try again.');
    e.code = 'OTP_SEND_FAILED';
    e.statusCode = 502;
    throw e;
  }
  return true;
}
