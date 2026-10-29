// Node module hook: a stylesheet import is an empty module in tests. The real files are checked by the token and build tests.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true }
  return nextLoad(url, context)
}
