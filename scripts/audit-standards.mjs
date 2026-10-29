// The standards audit from AGENTS.md. It checks what a script can check and reports the rest as notices.
//
//   node scripts/audit-standards.mjs                 static checks of the working tree
//   node scripts/audit-standards.mjs --live <url>    also probe a running server's headers and caching
//   node scripts/audit-standards.mjs --strict        fail on warnings as well as errors
//   node scripts/audit-standards.mjs --root <dir>    audit another folder (tests/build/audit.test.mjs plants faults in one)
//
// Errors are rules that must never be broken (secrets, debug code, open CORS). Warnings are debts to repay. Notices list
// the design "tells" (AGENTS.md 2.2) that exist in the code: information for the owner, not a request to restyle.
//
// What it checks (the list AGENTS.md 7.2 requires of this script; a rule that is not listed here needs a test or a review):
//   errors    tracked secrets, env files, databases and keystores; debug code; eval and raw HTML sinks; type escapes; wildcard
//             CORS; third-party asset origins; replies that echo a raw error message; trust proxy = true; a Content-Type taken
//             from a stored or upstream object; values for secret names in .env.example; a failing positive control
//   warnings  scratch files; long files; unused dependencies; no privacy page; outbound requests without a timeout;
//             process.env outside config; a JSON body parser without a limit; focused or skipped tests; missing required
//             documents and .gitignore patterns; a literal colour or raw spacing length in a component stylesheet
//   notices   design tells; security claims in copy to verify
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const optionValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
const root = optionValue('--root')
  ? path.resolve(optionValue('--root'))
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const strict = args.includes('--strict')
const liveUrl = optionValue('--live')

const findings = { error: [], warn: [], notice: [] }
const add = (level, id, message, where) => findings[level].push({ id, message, where })

const git = (...gitArgs) =>
  execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })

// Folders that hold build output, dependencies, data or generated code, never reviewed source.
const WALK_SKIP = new Set(['node_modules', '.git', 'dist', 'dist-server', 'validation', 'coverage', 'strix_runs', '.hallmark'])
const walk = (directory, prefix = '') =>
  readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return WALK_SKIP.has(entry.name) ? [] : walk(path.join(directory, entry.name), relative)
    // Local environment files hold real values and are meant to stay out of git; only the example is reviewed.
    if (/^\.env(\.|$)/.test(entry.name) && !entry.name.endsWith('.example')) return []
    return /\.(log|sqlite[0-9a-z-]*|png|jpe?g|webp|woff2?|mp3|mp4|apk)$/i.test(entry.name) ? [] : [relative]
  })

// This file names the patterns it looks for, so it is not scanned itself.
const SELF = 'scripts/audit-standards.mjs'

// The files under review: what git tracks plus new files git does not ignore, or, in a folder that is not a git repository,
// the working tree minus generated folders.
const tracked = (() => {
  try {
    return [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean))].filter(
      (file) => file !== SELF,
    )
  } catch {
    add(
      'notice',
      'GIT-01',
      'Not a git repository: audited the working tree instead of tracked files (ignore rules were not applied)',
      '.',
    )
    return walk('.').filter((file) => file !== SELF)
  }
})()

const SOURCE_DIRS = ['src', 'server', 'scripts']
const isSource = (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) && SOURCE_DIRS.some((dir) => file.startsWith(`${dir}/`))
const isStyle = (file) => file.endsWith('.css') && file.startsWith('src/')
const isTest = (file) => file.startsWith('tests/') || /\.(test|spec)\./.test(file)
const read = (file) => {
  try {
    return readFileSync(path.join(root, file), 'utf8')
  } catch {
    return ''
  }
}
const lineOf = (text, index) => text.slice(0, index).split('\n').length
const scan = (files, pattern, onMatch) => {
  for (const file of files) {
    const text = read(file)
    for (const match of text.matchAll(pattern)) onMatch(file, lineOf(text, match.index ?? 0), match[0])
  }
}

const sources = tracked.filter((file) => isSource(file) && !isTest(file))
// Command-line tools print on purpose; debug code is a defect only in code that ships.
const shipped = sources.filter((file) => !file.startsWith('scripts/'))
const styles = tracked.filter(isStyle)
const serverSources = sources.filter((file) => file.startsWith('server/'))

// --- errors -------------------------------------------------------------------------------------------------------
const secretPatterns = [
  /AKIA[0-9A-Z]{16}/g,
  /sk-[A-Za-z0-9]{24,}/g,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
]
// PRC-10: a scan that finds nothing proves nothing until it has found something. Each pattern must match a known sample,
// built from pieces so that this file holds nothing that looks like a real secret.
const secretSamples = [
  `AKIA${'A'.repeat(16)}`,
  `sk-${'a'.repeat(24)}`,
  `ghp_${'a'.repeat(30)}`,
  `xoxb-${'a'.repeat(12)}`,
  `-----BEGIN ${'PRIVATE'} KEY-----`,
  `eyJ${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(10)}`,
  `AIza${'a'.repeat(35)}`,
]
secretPatterns.forEach((pattern, index) => {
  if (!secretSamples[index]?.match(pattern))
    add('error', 'PRC-10', 'A secret pattern does not match its own sample', String(pattern))
})
for (const file of tracked.filter(
  (name) => !/(^|\/)pnpm-lock\.yaml$/.test(name) && !/\.(png|jpe?g|webp|woff2?|zip)$/i.test(name),
)) {
  const text = read(file)
  for (const pattern of secretPatterns)
    for (const match of text.matchAll(pattern))
      add('error', 'SEC-01', 'Possible secret committed', `${file}:${lineOf(text, match.index ?? 0)}`)
}
for (const file of tracked) {
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.example')) add('error', 'SEC-02', 'An environment file is tracked', file)
  if (/\.(sqlite|sqlite3|db|keystore|jks|pem|key)$/i.test(file))
    add('error', 'SEC-15', 'A database, key or keystore is tracked', file)
}
scan(shipped, /\bconsole\.(log|debug|trace)\(|\bdebugger\b/g, (file, line, text) =>
  add('error', 'CODE-03', `Debug code: ${text}`, `${file}:${line}`),
)
scan(sources, /\beval\(|new Function\(|dangerouslySetInnerHTML/g, (file, line, text) =>
  add('error', 'SEC-07', `Unsafe API: ${text}`, `${file}:${line}`),
)
scan(sources, /\.innerHTML\s*=|insertAdjacentHTML\(|document\.write\(/g, (file, line, text) =>
  add('error', 'SEC-07', `Raw HTML sink: ${text}`, `${file}:${line}`),
)
scan(sources, /:\s*any\b|\bas any\b|@ts-ignore|@ts-nocheck/g, (file, line, text) =>
  add('error', 'CODE-01', `Type escape: ${text.trim()}`, `${file}:${line}`),
)
scan(sources, /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*/g, (file, line) =>
  add('error', 'SEC-10', 'Wildcard CORS origin', `${file}:${line}`),
)
scan(
  [...sources, ...styles, ...tracked.filter((file) => file === 'index.html')],
  /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|unpkg\.com\/|cdnjs\.cloudflare\.com|cdn\.tailwindcss\.com/g,
  (file, line, text) => add('error', 'PERF-25', `Third-party asset origin: ${text}`, `${file}:${line}`),
)
scan(
  serverSources,
  /\bjson\([^)\n]*instanceof Error\s*\?\s*\w+\.message|message:\s*String\(\s*(?:error|err)\s*\)/g,
  (file, line) => add('error', 'SEC-37', 'A reply echoes a raw error message', `${file}:${line}`),
)
scan(serverSources, /['"]trust proxy['"]\s*,\s*true/g, (file, line) =>
  add('error', 'SEC-29', 'trust proxy is true: any client can claim any address', `${file}:${line}`),
)
scan(serverSources, /setHeader\(\s*['"]Content-Type['"]\s*,[^)\n]*headers\.get\(\s*['"]content-type['"]\s*\)/gi, (file, line) =>
  add('error', 'SEC-30', 'Content-Type is taken from a stored or upstream object', `${file}:${line}`),
)
for (const file of tracked.filter((name) => /(^|\/)\.env\.example$/.test(name))) {
  for (const [index, line] of read(file).split('\n').entries()) {
    const match = /^([A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|API_KEY|SERVICE_ROLE_KEY|PRIVATE_KEY)[A-Z0-9_]*)=(.+)$/.exec(line.trim())
    if (match && match[2].trim() !== '')
      add('error', 'SEC-02', `${match[1]} has a value in the example file`, `${file}:${index + 1}`)
  }
}

// --- warnings -----------------------------------------------------------------------------------------------------
for (const file of tracked) {
  if (/(^|\/)\.tmp-|\.log$/.test(file)) add('warn', 'SEC-15', 'Scratch or log file is tracked', file)
}
for (const file of sources) {
  const lines = read(file).split('\n').length
  if (lines > 400) add('warn', 'ARCH-04', `${lines} lines; consider splitting by responsibility`, file)
}
{
  const manifest = JSON.parse(read('package.json') || '{}')
  const declared = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
  // package.json is left out: it names every dependency it declares, so searching it would find them all and flag none.
  const searchable = (file) =>
    /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html)$/.test(file) && !/pnpm-lock|(^|\/)package\.json$/.test(file)
  const haystack = tracked.filter(searchable).map(read).join('\n')
  const implicit = /^(typescript|oxlint|@biomejs\/biome|tsx|concurrently|@types\/.*|vite|@vitejs\/.*|jsdom|@testing-library\/.*)$/
  for (const name of declared) {
    if (implicit.test(name)) continue
    if (!haystack.includes(`'${name}`) && !haystack.includes(`"${name}`) && !haystack.includes(`${name}/`))
      add('warn', 'SEC-14', 'Declared dependency is never imported', name)
  }
}
if (existsSync(path.join(root, 'src')) && !tracked.some((file) => /LegalPage|privacy/i.test(file)))
  add('warn', 'UI-12', 'No privacy or terms page found')
for (const file of serverSources) {
  const text = read(file)
  if (/\bfetch\(/.test(text) && !/fetchWithTimeout|AbortSignal\.timeout|AbortController/.test(text))
    add('warn', 'SEC-42', 'Outbound request without a timeout', `${file}:${lineOf(text, text.search(/\bfetch\(/))}`)
}
// Configuration is read in one place; a default parameter such as `env = process.env` is that place being tested, not a read.
for (const file of serverSources.filter((name) => !/(^|\/)config\/index\.ts$/.test(name))) {
  for (const [index, text] of read(file).split('\n').entries()) {
    if (/process\.env/.test(text) && !/=\s*process\.env\b\s*[,)]/.test(text))
      add('warn', 'ARCH-10', 'process.env is read outside config', `${file}:${index + 1}`)
  }
}
for (const file of serverSources) {
  for (const [index, text] of read(file).split('\n').entries()) {
    if (/express\.json\(\s*\)/.test(text) && !text.trim().startsWith('//'))
      add('warn', 'SEC-41', 'JSON body parser without a size limit', `${file}:${index + 1}`)
  }
}
scan(tracked.filter(isTest), /\b(?:test|it|describe)\.(?:only|skip)\(/g, (file, line) =>
  add('warn', 'TEST-01', 'A test is focused or skipped', `${file}:${line}`),
)
for (const doc of ['README.md', 'system_design.md', 'OPERATIONS.md', 'SECURITY.md', 'SECURITY_VALIDATION.md'])
  if (!tracked.includes(doc)) add('warn', 'DOC-01', 'Required document is missing', doc)
if (!tracked.some((file) => /(^|\/)([A-Z_]+_)?VALIDATION\.md$/.test(file)))
  add('warn', 'DOC-01', 'No validation record (VALIDATION.md)')
if (serverSources.length > 0 && !tracked.some((file) => /(^|\/)\.env\.example$/.test(file)))
  add('warn', 'SEC-02', 'The server has no .env.example listing its settings')
{
  const ignored = read('.gitignore')
    .split('\n')
    .map((line) => line.trim())
  for (const pattern of ['.env', 'node_modules', 'strix_runs', '*.sqlite'])
    if (!ignored.some((line) => line.startsWith(pattern)))
      add('warn', 'GIT-01', `.gitignore does not cover ${pattern}`, '.gitignore')
}
// UI-02: a colour or a spacing length written in a component stylesheet instead of read from a token.
for (const file of styles.filter((name) => !/themes\/(tokens|motion)\.css$/.test(name))) {
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of css.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/gi))
    add('warn', 'UI-02', `Literal colour ${match[0]} in a component stylesheet`, `${file}:${lineOf(css, match.index ?? 0)}`)
  for (const match of css.matchAll(/(?:^|[\s{;])(?:padding|margin|gap)(?:-[a-z-]+)?\s*:\s*([^;]*\d(?:px|rem|em)\b[^;]*);/g))
    if (!/var\(/.test(match[1] ?? ''))
      add('warn', 'UI-02', 'Raw spacing length in a component stylesheet', `${file}:${lineOf(css, match.index ?? 0)}`)
}

// --- notices: design tells that exist in the code ------------------------------------------------------------------
const counted = (files, pattern) => files.reduce((total, file) => total + (read(file).match(pattern)?.length ?? 0), 0)
const report = (id, label, count) => count > 0 && add('notice', id, `${label}: ${count}`)
const contentFiles = tracked.filter((file) => /\.model\.json$/.test(file))
report('tell 7', 'emoji in source or content', counted([...sources, ...contentFiles], /\p{Emoji_Presentation}/gu))
report('tell 9', 'em or en dashes in source or content', counted([...sources, ...contentFiles], /[–—]/g))
report('tell 10', 'Inter, Geist or Space Grotesk fonts', counted(styles, /\b(Inter|Geist|Space Grotesk)\b/g))
report('tell 1', 'gradients in styles', counted(styles, /(linear|radial|conic)-gradient/g))
report('tell 5', 'box shadows in styles', counted(styles, /box-shadow:/g))
report('tell 8', 'backdrop-filter (glass) rules', counted(styles, /backdrop-filter:/g))
report('tell 28', 'hover lift transforms', counted(styles, /:hover[^{]*\{[^}]*translateY\(-/g))
report('tell 2', 'Lucide icon imports', counted(sources, /from 'lucide-(react|react-native)'/g))
if (/"lucide-react(-native)?"/.test(read('package.json'))) add('notice', 'tell 2', 'lucide icon package is a dependency')
if (existsSync(path.join(root, 'src')) && !tracked.some((file) => /skeleton/i.test(file)))
  add('notice', 'tell 21', 'No skeleton loading component')
report(
  'PRC-11',
  'security claims in copy to verify against the code (hashed, encrypted, end-to-end)',
  counted(contentFiles, /\b(hashed|encrypted|end-to-end)\b/gi),
)
if (existsSync(path.join(root, 'src')) && !tracked.some((file) => /motion\.css$|spring/i.test(file)))
  add('warn', 'UI-20', 'No spring motion tokens (themes/motion.css)')

// --- live probe ---------------------------------------------------------------------------------------------------
if (liveUrl) {
  const probe = async (route, headers = {}) =>
    fetch(new URL(route, liveUrl), { headers, redirect: 'manual', signal: AbortSignal.timeout(8000) })
  const need = {
    'content-security-policy': 'SEC-11',
    'x-content-type-options': 'SEC-11',
    'referrer-policy': 'SEC-11',
    'permissions-policy': 'SEC-11',
    'cross-origin-opener-policy': 'SEC-11',
    'cross-origin-resource-policy': 'SEC-11',
  }
  const home = await probe('/', { 'accept-encoding': 'br' })
  for (const [header, id] of Object.entries(need))
    if (!home.headers.get(header)) add('error', id, `Missing response header ${header}`, liveUrl)
  if (home.headers.get('x-powered-by')) add('error', 'SEC-12', 'X-Powered-By is exposed', liveUrl)
  if (/unsafe-eval|unsafe-inline/.test(home.headers.get('content-security-policy') ?? ''))
    add('error', 'SEC-11', 'CSP allows unsafe-eval or unsafe-inline', liveUrl)
  if (!/no-cache/.test(home.headers.get('cache-control') ?? '')) add('warn', 'PERF-16', 'The HTML shell is not no-cache', liveUrl)
  const html = await (await probe('/')).text()
  const script = html.match(/src=["']?(\/assets\/[^"' >]+\.js)/)?.[1]
  if (script) {
    const asset = await probe(script, { 'accept-encoding': 'br, gzip' })
    if (!/immutable/.test(asset.headers.get('cache-control') ?? ''))
      add('warn', 'PERF-16', 'Hashed asset is not immutable', script)
    if (!/br|gzip/.test(asset.headers.get('content-encoding') ?? '')) add('warn', 'PERF-17', 'Asset is not compressed', script)
    if ((await probe(`${script}.map`)).status === 200) add('error', 'SEC-12', 'Source map is publicly served', `${script}.map`)
  }
  for (const secret of ['/.env', '/.git/config', '/package.json', '/server/index.ts']) {
    const response = await probe(secret)
    const body = await response.text()
    if (response.status === 200 && !/<div id="?root"?/.test(body)) add('error', 'SEC-15', 'A private file is reachable', secret)
  }
  const missing = await probe('/api/definitely-not-a-route')
  if (missing.status === 200) add('warn', 'ARCH-21', 'Unknown API routes answer 200', '/api/definitely-not-a-route')
}

// --- report -------------------------------------------------------------------------------------------------------
const print = (title, items) => {
  if (items.length === 0) return
  process.stdout.write(`\n${title} (${items.length})\n`)
  for (const item of items.slice(0, 40))
    process.stdout.write(`  [${item.id}] ${item.message}${item.where ? `  ${item.where}` : ''}\n`)
  if (items.length > 40) process.stdout.write(`  ... and ${items.length - 40} more\n`)
}
print('Errors: must be fixed', findings.error)
print('Warnings: debts to repay', findings.warn)
print('Notices: design tells present in the code (information only)', findings.notice)
const failed = findings.error.length > 0 || (strict && findings.warn.length > 0)
process.stdout.write(
  `\naudit:standards ${failed ? 'FAILED' : 'passed'}: ${findings.error.length} errors, ${findings.warn.length} warnings, ${findings.notice.length} notices${liveUrl ? ` (live: ${liveUrl})` : ''}\n`,
)
process.exit(failed ? 1 : 0)
