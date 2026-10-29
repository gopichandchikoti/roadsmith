import type { RequestHandler } from 'express'
import { sendProblem } from './request-context.js'

const ALLOWED_METHODS = new Set(['GET', 'HEAD'])

/**
 * Roadsmith only ever answers reads. Any other method, including the OPTIONS preflight of another origin, is refused with the
 * list of what is allowed and no CORS header, so a page on another site cannot talk to the server (SEC-09, SEC-10, SEC-27).
 */
export const methodGuard: RequestHandler = (request, response, next) => {
  if (ALLOWED_METHODS.has(request.method)) {
    next()
    return
  }
  response.setHeader('Allow', 'GET, HEAD')
  sendProblem(response, 405, 'METHOD_NOT_ALLOWED', 'This address only answers GET and HEAD requests.')
}

/** Anything under /api that no route answered gets the standard body, never the app shell. */
export const apiNotFound: RequestHandler = (request, response, next) => {
  if (!request.path.startsWith('/api/') && request.path !== '/api') {
    next()
    return
  }
  response.setHeader('Cache-Control', 'no-store')
  sendProblem(response, 404, 'NOT_FOUND', 'That API address does not exist.')
}
