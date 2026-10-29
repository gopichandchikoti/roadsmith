// Positive controls for scripts/audit-standards.mjs (AGENTS.md PRC-10, 7.2): plant one violation of each rule in a throw-away
// project and require the audit to report it by its rule id. A clean project must pass, so a zero means something.
import assert from 'node:assert/strict'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'audit-standards.mjs')

const CLEAN = {
  'package.json': JSON.stringify({ name: 'probe', dependencies: { react: '1.0.0' } }),
  '.gitignore': '.env\n.env.*\n!.env.example\nnode_modules\nstrix_runs\n*.sqlite\n',
  '.env.example': '# names only\nPORT=\n',
  'README.md': '# probe\n',
  'system_design.md': '# design\n',
  'OPERATIONS.md': '# ops\n',
  'SECURITY.md': '# security\n',
  'SECURITY_VALIDATION.md': '# evidence\n',
  'VALIDATION.md': '# validation\n',
  'src/App.tsx': "import react from 'react'\nexport const App = () => react\n",
  'src/pages/LegalPage.tsx': 'export const LegalPage = () => null\n',
  'src/themes/motion.css': ':root { --spring-snappy: linear(0, 1); }\n',
  'src/components/Skeleton.css': '.skeleton { padding: var(--space-md); color: var(--color-ink); }\n',
  'server/index.ts': 'export const start = () => 1\n',
}

/** Builds a project with `files` added to the clean one, as a git repository with everything staged, and audits it. */
function audit(files, { forceAdd = [], extra = [] } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'roadsmith-audit-'))
  try {
    for (const [name, text] of Object.entries({ ...CLEAN, ...files })) {
      if (text === null) continue
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
      writeFileSync(path.join(dir, name), text)
    }
    const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: dir, stdio: 'ignore' })
    git('init', '-q')
    git('add', '-A')
    for (const file of forceAdd) git('add', '-f', file)
    const run = spawnSync(process.execPath, [script, '--root', dir, ...extra], { encoding: 'utf8' })
    return { status: run.status, output: run.stdout }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const expectReport = (files, ids, options) => {
  const { output } = audit(files, options)
  for (const id of ids) assert.ok(output.includes(`[${id}]`), `expected ${id} in:\n${output}`)
  return output
}

test('a clean project passes with no error, no warning and no notice', () => {
  const { status, output } = audit({})
  assert.equal(status, 0, output)
  assert.match(output, /audit:standards passed: 0 errors, 0 warnings, 0 notices/)
})

test('the secret scan finds a planted key, token and private key (SEC-01)', () => {
  const samples = [
    `sk-${'a'.repeat(24)}`,
    `AKIA${'B'.repeat(16)}`,
    `ghp_${'c'.repeat(30)}`,
    `-----BEGIN ${'RSA'} PRIVATE KEY-----`,
  ]
  for (const sample of samples) {
    const { status, output } = audit({ 'src/a.ts': `export const key = '${sample}'\n` })
    assert.equal(status, 1, sample)
    assert.ok(output.includes('[SEC-01]'), sample)
  }
})

test('a tracked env file, a tracked database and a value in .env.example are errors (SEC-02, SEC-15)', () => {
  const output = expectReport(
    { '.env': 'PORT=1\n', 'data.sqlite': 'x', '.env.example': 'SESSION_SECRET=abc\n' },
    ['SEC-02', 'SEC-15'],
    { forceAdd: ['.env', 'data.sqlite'] },
  )
  assert.match(output, /An environment file is tracked/)
  assert.match(output, /A database, key or keystore is tracked/)
  assert.match(output, /SESSION_SECRET has a value in the example file/)
})

test('debug code, eval and raw HTML sinks are errors (CODE-03, SEC-07)', () => {
  const output = expectReport(
    {
      'src/a.ts': "console.log('x')\ndebugger\n",
      'src/b.ts': "eval('1')\nnew Function('1')\n",
      'src/c.tsx': 'export const c = () => <div dangerouslySetInnerHTML={{ __html: x }} />\n',
      'src/d.ts': "document.body.innerHTML = 'x'\n",
    },
    ['CODE-03', 'SEC-07'],
  )
  assert.match(output, /Unsafe API: eval\(/)
  assert.match(output, /Raw HTML sink: \.innerHTML =/)
})

test('console output in a command-line script is allowed, in shipped code it is not (CODE-03)', () => {
  const { status } = audit({ 'scripts/tool.mjs': "console.log('prints on purpose')\n" })
  assert.equal(status, 0)
})

test('type escapes are errors (CODE-01)', () => {
  const output = expectReport({ 'src/a.ts': 'export const a = (x: any) => x\n// @ts-ignore\nexport const b = 1\n' }, ['CODE-01'])
  assert.match(output, /Type escape/)
})

test('wildcard CORS and a third-party font origin are errors (SEC-10, PERF-25)', () => {
  expectReport(
    {
      'server/cors.ts': "response.setHeader('Access-Control-Allow-Origin', '*')\n",
      'index.html': '<link href="https://fonts.googleapis.com/css2?family=X" rel="stylesheet">\n',
    },
    ['SEC-10', 'PERF-25'],
  )
})

test('an error message echoed in a reply, trust proxy true and a stored content type are errors (SEC-37, SEC-29, SEC-30)', () => {
  expectReport(
    {
      'server/a.ts': 'response.json(error instanceof Error ? error.message : "x")\n',
      'server/b.ts': "app.set('trust proxy', true)\n",
      'server/c.ts': "response.setHeader('Content-Type', upstream.headers.get('content-type'))\n",
    },
    ['SEC-37', 'SEC-29', 'SEC-30'],
  )
})

test('warnings: scratch files, long files, unused dependencies, a missing privacy page (SEC-15, ARCH-04, SEC-14, UI-12)', () => {
  const output = expectReport(
    {
      '.tmp-scratch.txt': 'x',
      'src/long.ts': `${'export const x = 1\n'.repeat(401)}`,
      'package.json': JSON.stringify({ dependencies: { react: '1', 'left-pad': '1' } }),
      'src/pages/LegalPage.tsx': null,
    },
    ['SEC-15', 'ARCH-04', 'SEC-14', 'UI-12'],
    { forceAdd: ['.tmp-scratch.txt'] },
  )
  assert.match(output, /Declared dependency is never imported {2}left-pad/)
})

test('warnings: outbound fetch without a timeout, env read outside config, a body parser without a limit (SEC-42, ARCH-10, SEC-41)', () => {
  expectReport(
    {
      'server/a.ts': "export const get = () => fetch('https://x.example')\n",
      'server/b.ts': 'export const port = process.env.PORT\n',
      'server/c.ts': 'app.use(express.json())\n',
    },
    ['SEC-42', 'ARCH-10', 'SEC-41'],
  )
  const { output } = audit({ 'server/config/index.ts': 'export const load = (env = process.env) => env.PORT\n' })
  assert.ok(!output.includes('[ARCH-10]'), 'a default parameter in config is not a read')
})

test('warnings: a focused test, missing documents and missing ignore patterns (TEST-01, DOC-01, GIT-01)', () => {
  const output = expectReport(
    {
      // Written in two pieces so that this file does not itself contain a focused test for the audit to find.
      'tests/a.test.ts': `test${'.only'}('x', () => undefined)\n`,
      'SECURITY.md': null,
      'VALIDATION.md': null,
      'SECURITY_VALIDATION.md': null,
      '.gitignore': 'logs\n',
    },
    ['TEST-01', 'DOC-01', 'GIT-01'],
  )
  assert.match(output, /Required document is missing {2}SECURITY\.md/)
  assert.match(output, /No validation record/)
  assert.match(output, /\.gitignore does not cover \.env/)
})

test('warnings: a literal colour or a raw spacing length in a component stylesheet (UI-02)', () => {
  const output = expectReport({ 'src/components/Bad.css': '.bad { color: #ff0000; padding: 12px; background: rgb(0 0 0); }\n' }, [
    'UI-02',
  ])
  assert.match(output, /Literal colour #ff0000/)
  assert.match(output, /Raw spacing length/)
  const tokens = audit({ 'src/themes/tokens.css': ':root { --color-paper: #ffffff; }\n' })
  assert.ok(!tokens.output.includes('[UI-02]'), 'the token file may hold literal colours')
})

test('notices list the design tells that are present (tells 1, 5, 7, 8, 9, 10)', () => {
  const output = expectReport(
    {
      'src/components/Tells.css':
        ".t { background: linear-gradient(red, blue); box-shadow: 0 0 1px var(--x); backdrop-filter: blur(4px); font-family: 'Inter'; }\n",
      'src/a.ts': 'export const a = "rocket \u{1F680} and a dash — here"\n',
    },
    ['tell 1', 'tell 5', 'tell 7', 'tell 8', 'tell 9', 'tell 10'],
  )
  assert.match(output, /audit:standards passed/)
})

test('--strict turns warnings into a failure', () => {
  const files = { 'SECURITY.md': null }
  assert.equal(audit(files).status, 0)
  assert.equal(audit(files, { extra: ['--strict'] }).status, 1)
})

test('the live probe reports a badly configured server: missing headers, a leaking header, a served source map, a reachable private file', async () => {
  const server = createServer((request, response) => {
    response.setHeader('X-Powered-By', 'Express')
    response.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline'")
    if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html')
      response.end('<script src="/assets/app.js"></script>')
    } else if (request.url === '/.env') {
      response.end('SECRET=1')
    } else {
      response.end('ok')
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const dir = mkdtempSync(path.join(os.tmpdir(), 'roadsmith-audit-live-'))
  try {
    // Asynchronous, because this process also runs the server being probed: a blocking spawn would freeze it.
    const run = await new Promise((resolve) => {
      const child = spawn(process.execPath, [script, '--root', dir, '--live', `http://127.0.0.1:${port}`])
      let stdout = ''
      child.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      child.on('exit', (code) => resolve({ status: code, stdout }))
    })
    assert.equal(run.status, 1)
    const expectedReports = [
      'Missing response header x-content-type-options',
      'X-Powered-By is exposed',
      'unsafe-inline',
      'Source map is publicly served',
      'A private file is reachable',
    ]
    for (const expected of expectedReports) assert.ok(run.stdout.includes(expected), `${expected}\n${run.stdout}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
    server.close()
  }
})
