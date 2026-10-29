import type { Request, RequestHandler } from 'express'

export type RateLimitOptions = {
  /** Length of one counting window. */
  windowMs: number
  /** Requests allowed per client in one window. */
  limit: number
  /** Most clients tracked at once; the oldest entry is dropped first, so memory stays bounded. */
  capacity?: number
  now?: () => number
}

type Window = { count: number; resetAt: number }

const DEFAULT_CAPACITY = 5000

const clientKey = (request: Request): string => request.ip ?? request.socket.remoteAddress ?? 'unknown'

/**
 * A fixed-window limiter per client address. It answers 429 with `Retry-After` and publishes the standard `RateLimit-*`
 * headers, so well-behaved clients can slow down before they are refused. Clients are held in memory only, never logged.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, limit, capacity = DEFAULT_CAPACITY, now = Date.now } = options
  const windows = new Map<string, Window>()

  return (request, response, next) => {
    const time = now()
    const key = clientKey(request)
    let current = windows.get(key)
    if (!current || current.resetAt <= time) {
      windows.delete(key)
      if (windows.size >= capacity) {
        const oldest = windows.keys().next()
        if (!oldest.done) windows.delete(oldest.value)
      }
      current = { count: 0, resetAt: time + windowMs }
      windows.set(key, current)
    }
    current.count += 1
    const resetSeconds = Math.max(1, Math.ceil((current.resetAt - time) / 1000))
    response.setHeader('RateLimit-Limit', String(limit))
    response.setHeader('RateLimit-Remaining', String(Math.max(0, limit - current.count)))
    response.setHeader('RateLimit-Reset', String(resetSeconds))
    if (current.count > limit) {
      response.setHeader('Retry-After', String(resetSeconds))
      const requestId = response.locals?.requestId
      response.status(429).json({
        code: 'RATE_LIMITED',
        message: 'Too many requests. Try again shortly.',
        requestId: typeof requestId === 'string' ? requestId : '',
      })
      return
    }
    next()
  }
}
