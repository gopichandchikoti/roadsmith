import '@fontsource-variable/archivo/wdth.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './themes/tokens.css'
import './themes/base.css'
import './themes/motion.css'
import { App } from './App'
import { applyTheme, readStoredTheme } from './features/preferences/theme'
import { PreferencesProvider } from './features/preferences/PreferencesProvider'
import { prefetchScreens } from './routes/prefetch'
import { RouterProvider } from './routes/RouterProvider'
import { whenIdle } from './utils/idle'

// Take the saved theme before the first render, so a driver who chose Day on a dark device does not see a dark flash.
applyTheme(readStoredTheme())

const root = document.getElementById('root')
if (!root) throw new Error('The page has no #root element to mount into.')

createRoot(root).render(
  <StrictMode>
    <RouterProvider>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </RouterProvider>
  </StrictMode>,
)

whenIdle(prefetchScreens)
