import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/nippo.css'
import './index.css'
import App from './App.tsx'
import { siteTheme } from './config/theme'

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', siteTheme)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
