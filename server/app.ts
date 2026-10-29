import express, { type Express } from 'express'
import type { ServerConfig } from './config/index.js'
import { responseCompression } from './middlewares/compression.js'
import { apiNotFound, methodGuard } from './middlewares/method-guard.js'
import { createRateLimiter } from './middlewares/rate-limit.js'
import { createErrorHandler, requestId, sendProblem, writeToStderr, type LogLine } from './middlewares/request-context.js'
import { requireHttps, securityHeaders } from './middlewares/security-headers.js'
import { staticAssets } from './middlewares/static-assets.js'
import { healthRoutes } from './routes/health.js'

export type AppDependencies = {
  /** The clock, so a test can move time without waiting. */
  now?: () => number
  /** Where server fault lines go. Defaults to stderr; a test captures them to prove what they hold. */
  log?: LogLine
}

/**
 * Builds the application without listening, so a test can start it on a random port. The order is deliberate: identify the
 * request, set the headers, enforce https, limit floods, refuse methods, then answer the API, the files and last the errors.
 */
export function createApp(config: ServerConfig, deps: AppDependencies = {}): Express {
  const app = express()
  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', config.trustProxy)

  app.use(requestId)
  app.use(securityHeaders)
  app.use(requireHttps(config))
  app.use(responseCompression)
  app.use(createRateLimiter({ ...config.rateLimit, now: deps.now }))
  app.use(methodGuard)

  app.use('/api', healthRoutes)
  app.use(apiNotFound)
  app.use(staticAssets(config.staticDirectory))

  app.use((_request, response) => {
    sendProblem(response, 404, 'NOT_FOUND', 'That page does not exist.')
  })
  app.use(createErrorHandler(deps.log ?? writeToStderr))
  return app
}
