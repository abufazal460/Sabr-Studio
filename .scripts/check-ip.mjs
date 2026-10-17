// Check the machine public outbound IP via multiple providers.
// No credentials involved. Used to verify against Atlas Network Access.
const providers = [
  "https://api.ipify.org",
  "https://checkip.amazonaws.com",
  "https://ifconfig.me/ip",
];
for (const url of providers) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    const text = (await res.text()).trim();
    console.log(`IP via ${url}: ${text}`);
  } catch (err) {
    console.log(`IP via ${url}: FAILED (${err.message})`);
  }
}
