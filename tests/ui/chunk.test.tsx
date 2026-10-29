import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { installDom } from '../setup/dom'

test('a screen whose code cannot be downloaded shows an announced error with a retry, not a blank page', async () => {
  installDom('/')
  const rtl = await import('@testing-library/react')
  const { ChunkBoundary } = await import('../../src/components/ChunkBoundary')
  const Broken = (): never => {
    throw new Error('Failed to fetch dynamically imported module: /assets/secret-path.js')
  }
  // React reports a render error to the console as well as to the boundary; the test only cares about what the page shows.
  const silenced = mock.method(console, 'error', () => undefined)
  try {
    rtl.render(
      <ChunkBoundary>
        <Broken />
      </ChunkBoundary>,
    )
  } finally {
    silenced.mock.restore()
  }
  const alert = rtl.screen.getByRole('alert')
  assert.match(alert.textContent ?? '', /did not load/)
  assert.match(alert.textContent ?? '', /signal may be weak/)
  assert.ok(!/secret-path|Failed to fetch/.test(document.body.textContent ?? ''), 'the error text must not reach the page')
  assert.ok(rtl.screen.getByRole('button', { name: 'Try again' }))
  rtl.cleanup()
})

test('children that render fine are shown untouched', async () => {
  installDom('/')
  const rtl = await import('@testing-library/react')
  const { ChunkBoundary } = await import('../../src/components/ChunkBoundary')
  rtl.render(
    <ChunkBoundary>
      <p>all good</p>
    </ChunkBoundary>,
  )
  assert.ok(rtl.screen.getByText('all good'))
  assert.equal(rtl.screen.queryByRole('alert'), null)
  rtl.cleanup()
})
