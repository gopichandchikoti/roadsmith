import assert from 'node:assert/strict'
import test from 'node:test'
import { EXTERNAL_HOSTS, mapsSearchUrl, tutorialSearchUrl } from '../../src/utils/external-links'
import { listFiles, readText } from '../setup/data'

test('a tutorial search goes to YouTube results with the vehicle and the problem as one search', () => {
  const url = new URL(tutorialSearchUrl('2019 Toyota Camry', 'how to change a flat tire'))
  assert.equal(url.origin, 'https://www.youtube.com')
  assert.equal(url.pathname, '/results')
  assert.equal(url.searchParams.get('search_query'), '2019 Toyota Camry how to change a flat tire')
})

test('with no vehicle the search is only the problem', () => {
  const url = new URL(tutorialSearchUrl('', 'how to jump start a car'))
  assert.equal(url.searchParams.get('search_query'), 'how to jump start a car')
})

test('a map search goes to Google Maps with the official search parameters', () => {
  const url = new URL(mapsSearchUrl('auto parts store near me'))
  assert.equal(url.origin, 'https://www.google.com')
  assert.equal(url.pathname, '/maps/search/')
  assert.equal(url.searchParams.get('api'), '1')
  assert.equal(url.searchParams.get('query'), 'auto parts store near me')
})

test('text typed by the driver can never change the host, the path or add another parameter', () => {
  const attacks = [
    'https://evil.example/',
    '@evil.example',
    '//evil.example',
    'x&search_query=evil',
    'x#fragment',
    'x%00y',
    '../../etc',
    'javascript:alert(1)',
    'a b\nc',
  ]
  for (const attack of attacks) {
    for (const link of [tutorialSearchUrl(attack, 'flat tire'), mapsSearchUrl(attack)]) {
      const url = new URL(link)
      assert.ok((EXTERNAL_HOSTS as readonly string[]).includes(url.hostname), `${attack} changed the host to ${url.hostname}`)
      assert.equal(url.protocol, 'https:')
      assert.equal(url.hash, '')
      assert.equal(url.username, '')
    }
    assert.deepEqual([...new URL(tutorialSearchUrl(attack, 'q')).searchParams.keys()], ['search_query'])
    assert.deepEqual([...new URL(mapsSearchUrl(attack)).searchParams.keys()], ['api', 'query'])
  }
})

test('no source file or content file names any address except the two this module builds', () => {
  const files = [...listFiles('src').filter((file) => /\.(ts|tsx|json|css|html)$/.test(file)), 'index.html', 'public/favicon.svg']
  const found = new Set<string>()
  for (const file of files) {
    for (const match of readText(file).matchAll(/https?:\/\/[^\s"'`)<>]+/g)) found.add(`${file} ${match[0]}`)
  }
  const unexpected = [...found].filter(
    (entry) =>
      !entry.startsWith('src/utils/external-links.ts ') &&
      !entry.includes('http://www.w3.org/2000/svg') &&
      !entry.startsWith('src/themes/motion.css'),
  )
  assert.deepEqual(unexpected, [])
  assert.ok(readText('src/utils/external-links.ts').includes('https://www.youtube.com/results'))
})
