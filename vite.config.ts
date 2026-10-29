import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

type DocumentContent = { locale: string; document: { title: string; description: string; noscript: string } }

/** Fills the page's title, description and no-script message from the content model, so no visible string lives in index.html. */
function contentModel(): Plugin {
  const model: DocumentContent = JSON.parse(readFileSync(new URL('./src/content.model.json', import.meta.url), 'utf8'))
  const values: Record<string, string> = {
    '%LOCALE%': model.locale,
    '%DOCUMENT_TITLE%': model.document.title,
    '%DOCUMENT_DESCRIPTION%': model.document.description,
    '%DOCUMENT_NOSCRIPT%': model.document.noscript,
  }
  return {
    name: 'roadsmith-content-model',
    transformIndexHtml: (html) => Object.entries(values).reduce((page, [token, value]) => page.replaceAll(token, value), html),
  }
}

const SERVER_PORT = 4620
const WEB_PORT = 4621
const CHUNK_LIMIT_KB = 250

export default defineConfig({
  plugins: [react(), contentModel()],
  server: {
    port: WEB_PORT,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${SERVER_PORT}` },
  },
  build: {
    target: 'es2022',
    // Source maps are not shipped: nothing in the client needs them in production and the server never serves one (SEC-12).
    sourcemap: false,
    chunkSizeWarningLimit: CHUNK_LIMIT_KB,
    rolldownOptions: {
      output: {
        // Every file under /assets carries a content hash, so the server can cache all of it for a year.
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
        hashCharacters: 'hex',
        // React changes rarely, so it is its own file: a deploy of the app does not make a visitor download it again.
        codeSplitting: { groups: [{ name: 'react', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ }] },
      },
    },
  },
})
