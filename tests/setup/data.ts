import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export const readText = (relative: string): string => readFileSync(path.join(projectRoot, relative), 'utf8')

export const readJson = (relative: string): unknown => JSON.parse(readText(relative))

/** Every file under a folder of the project, as paths relative to the project root, skipping the named folders. */
export function listFiles(relative: string, skip: readonly string[] = []): string[] {
  return readdirSync(path.join(projectRoot, relative), { withFileTypes: true }).flatMap((entry) => {
    const child = `${relative}/${entry.name}`
    if (entry.isDirectory()) return skip.includes(entry.name) ? [] : listFiles(child, skip)
    return [child]
  })
}

/** Reads one value out of parsed JSON by its keys, or undefined, without asserting a shape the file may not have. */
export function at(value: unknown, ...keys: string[]): unknown {
  let current = value
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined
    current = Object.entries(current).find(([name]) => name === key)?.[1]
  }
  return current
}

/** Every string inside a parsed JSON value, so a test can check the wording of a whole content file. */
export function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(allStrings)
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(allStrings)
  return []
}
