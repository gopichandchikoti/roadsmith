import assert from 'node:assert/strict'
import test from 'node:test'
import { hrefs, parseRoute } from '../../src/routes/route'

test('the known addresses parse to their screens', () => {
  assert.deepEqual(parseRoute('/'), { name: 'home', query: '', category: null })
  assert.deepEqual(parseRoute('/diagnose'), { name: 'diagnose', symptom: null, option: null })
  assert.deepEqual(parseRoute('/diagnose/dash-light'), { name: 'diagnose', symptom: 'dash-light', option: null })
  assert.deepEqual(parseRoute('/diagnose/dash-light/3'), { name: 'diagnose', symptom: 'dash-light', option: 3 })
  assert.deepEqual(parseRoute('/fix/flat-tire'), { name: 'fix', id: 'flat-tire' })
  assert.deepEqual(parseRoute('/privacy'), { name: 'privacy' })
  assert.deepEqual(parseRoute('/terms'), { name: 'terms' })
})

test('a trailing or doubled slash does not change the screen', () => {
  assert.deepEqual(parseRoute('/fix/flat-tire/'), { name: 'fix', id: 'flat-tire' })
  assert.deepEqual(parseRoute('//privacy//'), { name: 'privacy' })
})

test('the search and category come from the query string, cleaned', () => {
  assert.deepEqual(parseRoute('/', '?q=flat%20%20tire&category=tires'), { name: 'home', query: 'flat tire', category: 'tires' })
  assert.deepEqual(parseRoute('/', `?q=${encodeURIComponent('a<script>b')}`), {
    name: 'home',
    query: 'a script b',
    category: null,
  })
  assert.equal(parseRoute('/', `?q=${'x'.repeat(500)}`).name, 'home')
  const long = parseRoute('/', `?q=${'x'.repeat(500)}`)
  assert.equal(long.name === 'home' && long.query.length, 60)
})

test('anything that is not a plain lowercase slug is not found', () => {
  const hostile = [
    '/fix/Flat-Tire',
    '/fix/flat_tire',
    '/fix/../privacy',
    '/fix/%2e%2e',
    '/fix/flat-tire/extra',
    '/fix/' + 'a'.repeat(41),
    '/fix/-flat',
    '/fix/flat--tire',
    '/fix/flat tire',
    '/fix/<script>',
    '/diagnose/dash-light/x',
    '/diagnose/dash-light/100',
    '/diagnose/dash-light/-1',
    '/diagnose/dash-light/1/2',
    '/privacy/extra',
    '/admin',
    '/api/health',
    '/fix',
  ]
  for (const address of hostile) assert.equal(parseRoute(address).name, 'notFound', address)
})

test('a category in the query that is not a slug is dropped, not trusted', () => {
  assert.deepEqual(parseRoute('/', '?category=../../etc'), { name: 'home', query: '', category: null })
  assert.deepEqual(parseRoute('/', '?category=Tires'), { name: 'home', query: '', category: null })
})

test('every address the app writes parses back to the screen it names', () => {
  assert.deepEqual(parseRoute(hrefs.fix('flat-tire')), { name: 'fix', id: 'flat-tire' })
  assert.deepEqual(parseRoute(hrefs.diagnose('noise', 2)), { name: 'diagnose', symptom: 'noise', option: 2 })
  assert.deepEqual(parseRoute(hrefs.diagnose('noise')), { name: 'diagnose', symptom: 'noise', option: null })
  assert.equal(parseRoute(hrefs.privacy).name, 'privacy')
  assert.equal(parseRoute(hrefs.terms).name, 'terms')
  const [pathname = '', search = ''] = hrefs.home({ query: 'flat tire', category: 'tires' }).split('?')
  assert.deepEqual(parseRoute(pathname, `?${search}`), { name: 'home', query: 'flat tire', category: 'tires' })
  assert.equal(hrefs.home(), '/')
})
