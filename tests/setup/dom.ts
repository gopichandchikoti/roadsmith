import { JSDOM } from 'jsdom'

export const ORIGIN = 'http://localhost:4620'

const GLOBALS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLAnchorElement',
  'Node',
  'Element',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'localStorage',
  'sessionStorage',
] as const

export type BrowserState = {
  local?: Record<string, string>
  session?: Record<string, string>
}

let installed: JSDOM | null = null

/**
 * A browser-like page for a component test, installed as the globals React and the testing library look for. The testing
 * library binds to the first `document` it sees, so the page is installed once per test file and every later call only puts
 * it back to a clean state: empty storage, the given address, nothing mounted. Call it before importing the testing library.
 * Each test file runs in its own process, so nothing leaks between files.
 */
export function installDom(path = '/', state: BrowserState = {}): JSDOM {
  if (!installed) {
    installed = new JSDOM('<!doctype html><html lang="en"><body></body></html>', {
      url: `${ORIGIN}${path}`,
      pretendToBeVisual: true,
    })
    const window = installed.window as unknown as Record<string, unknown>
    for (const name of GLOBALS) {
      Object.defineProperty(globalThis, name, {
        value: name === 'window' ? installed.window : window[name],
        configurable: true,
        writable: true,
      })
    }
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true, writable: true })
    window.scrollTo = () => undefined
  }
  const { window } = installed
  try {
    window.localStorage.clear()
    for (const [key, value] of Object.entries(state.local ?? {})) window.localStorage.setItem(key, value)
  } catch {
    // A test that blocks storage on purpose has already replaced the getter. There is nothing to reset.
  }
  window.sessionStorage.clear()
  for (const [key, value] of Object.entries(state.session ?? {})) window.sessionStorage.setItem(key, value)
  window.history.replaceState(null, '', path)
  window.document.documentElement.removeAttribute('data-theme')
  window.document.title = ''
  return installed
}
