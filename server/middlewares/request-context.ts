import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler, Response } from 'express'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/

/** Gives every request an id, echoed in the `X-Request-Id` header and in error bodies, so one failure can be traced. */
export const requestId: RequestHandler = (request, response, next) => {
  const supplied = request.get('x-request-id')
  const id = supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID()
  response.locals.requestId = id
  response.setHeader('X-Request-Id', id)
  next()
}

/** The one error body every refusal uses: a stable code, a fixed plain-language message and the request id. */
export const sendProblem = (response: Response, status: number, code: string, message: string): void => {
  response.status(status).json({ code, message, requestId: String(response.locals.requestId ?? '') })
}

export type LogLine = (line: string) => void

export const writeToStderr: LogLine = (line) => {
  process.stderr.write(`${line}\n`)
}

const statusOf = (error: unknown): number => {
  const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
  return status === 404 ? 404 : 500
}

/** The only parts of a fault that are safe to log: what kind of error it was and its system code (ENOSPC, EACCES). Never its text. */
const faultDetail = (error: unknown): { name?: string; code?: string } => {
  if (!(error instanceof Error)) return {}
  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined
  return { name: error.name, ...(code ? { code } : {}) }
}

const MESSAGES: Record<number, { code: string; message: string }> = {
  404: { code: 'NOT_FOUND', message: 'That page does not exist.' },
  500: { code: 'INTERNAL_ERROR', message: 'Roadsmith could not complete that request.' },
}

/**
 * The last handler. The reply is a fixed message for its status with no stack, path or detail from the error (SEC-37).
 * A server fault is written to the log with the request id, method, path and the error's name and code only (SEC-38):
 * never the message, which can hold a path or other text the visitor must not see.
 */
export const createErrorHandler =
  (log: LogLine): ErrorRequestHandler =>
  (error: unknown, request, response, _next) => {
    const status = statusOf(error)
    const id = String(response.locals.requestId ?? '')
    if (status === 500) {
      log(JSON.stringify({ level: 'error', requestId: id, method: request.method, path: request.path, ...faultDetail(error) }))
    }
    if (response.headersSent) {
      response.end()
      return
    }
    const reply = MESSAGES[status] ?? MESSAGES[500]
    response.status(status).json({ code: reply?.code, message: reply?.message, requestId: id })
  }
