/** Fills `{name}` placeholders in a content model string. A placeholder with no value is left as written. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = values[key]
    return value === undefined ? whole : String(value)
  })
}

export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ')
