export type StorageKind = 'local' | 'session'

/** The browser may refuse storage (private windows, blocked site data), so every access is guarded and never throws. */
const area = (kind: StorageKind): Storage | null => {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readStored(kind: StorageKind, key: string): string | null {
  try {
    return area(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeStored(kind: StorageKind, key: string, value: string): void {
  try {
    area(kind)?.setItem(key, value)
  } catch {
    // Storage is full or blocked: the choice simply lasts until the page closes.
  }
}

export function removeStored(kind: StorageKind, key: string): void {
  try {
    area(kind)?.removeItem(key)
  } catch {
    // Nothing to remove if storage is blocked.
  }
}
