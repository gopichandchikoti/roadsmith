import type { RequestHandler } from 'express'
import type { ServerConfig } from '../config/index.js'
import { sendProblem } from './request-context.js'

const HSTS_MAX_AGE_SECONDS = 31_536_000
const HEALTH_PATH = '/api/health'

/**
 * No inline script or style, no other origin, no plugin, no framing: the client is one same-origin bundle. React sets styles
 * through the CSSOM, which `style-src 'self'` allows, so no `unsafe-inline` is needed.
 */
const POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/** Browser hardening headers for every response: CSP, no sniffing, no framing, no referrer, locked-down features. */
export const securityHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader('Content-Security-Policy', POLICY)
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  next()
}

/**
 * In production every request except the health probe must arrive over HTTPS. Plain http is sent to the configured public
 * origin (never to the Host header, which a visitor controls) when it is a read, and refused otherwise.
 */
export function requireHttps(config: ServerConfig): RequestHandler {
  return (request, response, next) => {
    if (!config.production || !config.publicOrigin) {
      next()
      return
    }
    response.setHeader('Strict-Transport-Security', `max-age=${HSTS_MAX_AGE_SECONDS}`)
    if (request.secure || request.path === HEALTH_PATH) {
      next()
      return
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      response.redirect(308, `${config.publicOrigin}${request.originalUrl}`)
      return
    }
    sendProblem(response, 426, 'HTTPS_REQUIRED', 'Use the secure address.')
  }
}
