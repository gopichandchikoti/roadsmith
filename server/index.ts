import { createApp } from './app.js'
import { loadServerConfig } from './config/index.js'

const SHUTDOWN_GRACE_MS = 10_000

const config = loadServerConfig()
const app = createApp(config)

const server = app.listen(config.port, config.host, () => {
  process.stdout.write(`Roadsmith listening on http://${config.host}:${config.port}\n`)
})

/** Stop accepting connections and let requests in flight finish, then exit. A request that will not finish is cut after a grace period. */
const shutdown = (): void => {
  const force = setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS)
  force.unref()
  server.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
