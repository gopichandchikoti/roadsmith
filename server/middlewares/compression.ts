import { constants } from 'node:zlib'
import compression from 'compression'
import type { RequestHandler } from 'express'

const MIN_BYTES = 1024
const BROTLI_QUALITY = 4

/**
 * gzip and brotli for JSON and other text sent on the fly. Built assets are precompressed at build time instead, so they
 * cost no work per request (see static-assets). Range requests are never compressed: a range describes the stored bytes.
 */
export const responseCompression: RequestHandler = compression({
  threshold: MIN_BYTES,
  brotli: { params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } },
  filter: (request, response) => (request.headers.range ? false : compression.filter(request, response)),
})
