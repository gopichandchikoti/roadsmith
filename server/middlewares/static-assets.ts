import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Request, RequestHandler, Response } from 'express'

const ONE_YEAR_SECONDS = 31_536_000
const ENCODINGS = [
  { name: 'br', extension: '.br' },
  { name: 'gzip', extension: '.gz' },
] as const

const isFile = (candidate: string): Promise<boolean> =>
  fs.stat(candidate).then(
    (stats) => stats.isFile(),
    () => false,
  )

/**
 * Resolves a request path to a file inside the built client, or null. The path is decoded once, a NUL byte, a hidden segment
 * (`.env`, `.git`) or any way out of the folder gives null, and the check is on whole path segments (SEC-17, SEC-34).
 */
const resolveUnder = (directory: string, requestPath: string): string | null => {
  let decoded: string
  try {
    decoded = decodeURIComponent(requestPath)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const normalized = path.posix.normalize(`/${decoded.replace(/\\/g, '/')}`)
  if (normalized.split('/').some((segment) => segment.startsWith('.') || segment === '..')) return null
  // A source map is never part of what is served (SEC-12). Checked on the decoded path and without regard to letter case,
  // because on Windows and macOS `app.js.MAP` and `app.js%2Emap` name the same file as `app.js.map`.
  if (path.posix.extname(normalized).toLowerCase() === '.map') return null
  const target = path.resolve(directory, `.${normalized}`)
  return target.startsWith(directory + path.sep) ? target : null
}

const acceptedEncodings = (request: Request): Set<string> =>
  new Set((request.get('accept-encoding') ?? '').split(',').map((part) => (part.split(';')[0] ?? '').trim().toLowerCase()))

/** Everything under /assets is named by its content hash, so it never changes and may be kept for a year. */
const isHashedAsset = (requestPath: string): boolean => requestPath.startsWith('/assets/')

const sendFile = (response: Response, root: string, file: string, immutable: boolean): Promise<void> =>
  new Promise((resolve, reject) => {
    // Sending relative to `root` keeps the dotfile check on the request, not on whatever folder the app is installed in.
    response.setHeader('Cache-Control', immutable ? `public, max-age=${ONE_YEAR_SECONDS}, immutable` : 'no-cache')
    response.sendFile(path.relative(root, file), { root, dotfiles: 'deny', cacheControl: false }, (error) =>
      error ? reject(error) : resolve(),
    )
  })

/**
 * Serves the built client. The content type comes from the file's extension and never from anything stored (SEC-30). Hashed
 * assets are cached for a year, the HTML shell is always revalidated, and a `.br` or `.gz` twin written at build time is sent
 * when the browser accepts it. A path with no extension that is not a file is a screen of the app, so it gets the HTML shell.
 */
export function staticAssets(directory: string): RequestHandler {
  const root = path.resolve(directory)
  return async (request, response, next) => {
    try {
      const requested = resolveUnder(root, request.path)
      const asFile = requested && (await isFile(requested)) ? requested : null
      if (!asFile && path.extname(request.path) !== '') {
        next()
        return
      }
      const file = asFile ?? path.join(root, 'index.html')
      const immutable = Boolean(asFile) && isHashedAsset(request.path)
      if (path.extname(file) === '.svg') response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
      const accepted = acceptedEncodings(request)
      response.setHeader('Vary', 'Accept-Encoding')
      for (const encoding of ENCODINGS) {
        if (!accepted.has(encoding.name) || !(await isFile(file + encoding.extension))) continue
        response.setHeader('Content-Encoding', encoding.name)
        response.type(path.extname(file))
        await sendFile(response, root, file + encoding.extension, immutable)
        return
      }
      await sendFile(response, root, file, immutable)
    } catch (error) {
      next(error)
    }
  }
}
