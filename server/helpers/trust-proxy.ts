import { isIP } from 'node:net'

const MAX_PREFIX = { 4: 32, 6: 128 } as const

const isTrustedEntry = (value: string): boolean => {
  if (value === 'loopback') return true
  const [address = '', prefix] = value.split('/')
  const family = isIP(address)
  if (family !== 4 && family !== 6) return false
  return prefix === undefined || (/^\d+$/.test(prefix) && Number(prefix) <= MAX_PREFIX[family])
}

/**
 * Reads the list of proxies whose forwarded headers may be believed. A bare hop count is refused: it would let a client pick
 * its own address, and so dodge the rate limit, whenever the proxy does not overwrite the header. Returns null for no proxy.
 */
export function parseTrustProxy(setting: string | undefined): string[] | null {
  if (!setting || setting === '0') return null
  const entries = setting.split(',').map((value) => value.trim())
  if (!entries.every(isTrustedEntry)) {
    throw new Error('TRUST_PROXY must list trusted proxy IPs or CIDR ranges, or loopback. A hop count is not accepted.')
  }
  return entries
}
