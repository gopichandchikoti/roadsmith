import { Router } from 'express'

/**
 * The probe a host or monitor calls. It says only that the service is up, what it is called and that no sign-in is needed.
 * It reports no version, path, build or dependency (SEC-39).
 */
export const healthRoutes = Router().get('/health', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  response.json({ status: 'ok', service: 'roadsmith', signInRequired: false })
})
