import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Attach a stable request id and expose it to every logger call for the
 * lifetime of the request. The id is taken from the `X-Request-Id` header when
 * the caller supplies one so distributed traces can be correlated; otherwise a
 * random UUID is generated here. Neither the id nor the values below expose
 * secrets: bodies and cookies are never logged.
 */

export function attachRequestId(req, _res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  ;(_res || {}).setHeader('X-Request-Id', reqId);
  next();
}

/**
 * Request logger. Level is driven by the environment and the status code:
 *   - production: 2xx/3xx -> info, 4xx -> warn, 5xx -> error
 *   - development: all -> debug
 * The response `finish` event guarantees the entry is written once, before the
 * response is flushed to the client.
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const entry = {
      reqId: res.locals?.requestId || req.id || 'unknown',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: Number.isFinite(durationMs) ? durationMs : 0,
    };
    if (res.statusCode >= 500) logger.error(entry);
    else if (res.statusCode >= 400) logger.warn(entry);
    else logger.info(entry);
  });
  next();
}
