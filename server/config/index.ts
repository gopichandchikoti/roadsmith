import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTrustProxy } from '../helpers/trust-proxy.js'

const DEFAULT_PORT = 4620
const MAX_PORT = 65_535
const RATE_WINDOW_MS = 60_000
/** Requests one client may make a minute. A page load is about a dozen, so this only stops floods. */
const RATE_LIMIT = 600

export type ServerConfig = {
  production: boolean
  port: number
  host: string
  /** The https origin visitors use. Required in production; plain http requests are sent here. */
  publicOrigin: string | null
  /** Proxies whose forwarded headers are believed, or null when the server is not behind one. */
  trustProxy: string[] | null
  /** The built client. */
  staticDirectory: string
  /** `capacity` is the most clients remembered at once; it is left to the limiter's own default unless a test sets it. */
  rateLimit: { windowMs: number; limit: number; capacity?: number }
}

const parsePort = (value: string | undefined): number => {
  if (value === undefined || value === '') return DEFAULT_PORT
  // Digits only: Number() would accept ' 80', '1e3' and '0x50', and a port written like that is a mistake worth stopping on.
  const port = /^\d{1,5}$/.test(value) ? Number(value) : 0
  if (port < 1 || port > MAX_PORT) throw new Error('PORT must be a whole number from 1 to 65535.')
  return port
}

/** An empty value means "not set". Anything else must be a bare origin, so a typo fails at start-up instead of misrouting. */
const parseOrigin = (value: string | undefined, production: boolean): string | null => {
  if (!value) {
    if (production) throw new Error('PUBLIC_ORIGIN is required in production.')
    return null
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('PUBLIC_ORIGIN must be an origin such as https://roadsmith.example.com, with no path.')
  }
  if (url.origin === 'null' || url.origin !== value.replace(/\/$/, '')) {
    throw new Error('PUBLIC_ORIGIN must be an origin such as https://roadsmith.example.com, with no path.')
  }
  if (production && url.protocol !== 'https:') throw new Error('PUBLIC_ORIGIN must use https in production.')
  return url.origin
}

/**
 * Reads every environment setting once, so the rest of the server never touches `process.env`. Production refuses to start
 * with a missing or weak setting rather than run open (SEC-23). The app holds no secret, so there is no key to check.
 */
export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = env.NODE_ENV === 'production'
  const trustProxy = parseTrustProxy(env.TRUST_PROXY)
  if (production && !trustProxy) {
    // Production sits behind a proxy that ends TLS. Without it every request would look like plain http and be sent in circles.
    throw new Error('TRUST_PROXY is required in production: list the proxy that ends TLS in front of this server.')
  }
  return {
    production,
    port: parsePort(env.PORT),
    host: env.HOST || (production ? '0.0.0.0' : '127.0.0.1'),
    publicOrigin: parseOrigin(env.PUBLIC_ORIGIN, production),
    trustProxy,
    // From server/config (or dist-server/config) two folders up is the project root, in development and when compiled.
    staticDirectory: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), 'dist'),
    rateLimit: { windowMs: RATE_WINDOW_MS, limit: RATE_LIMIT },
  }
}
