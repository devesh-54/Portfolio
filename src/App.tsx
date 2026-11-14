import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { FullscreenToggle } from './ui/FullscreenToggle'
import './styles/global.css'

const Home = lazy(() => import('./pages/Home'))
const Projects = lazy(() => import('./pages/Projects'))

export function App() {
  return (
    <BrowserRouter>
      <FullscreenToggle />
      <Suspense
        fallback={
          <div
            style={{
              width: '100vw',
              height: '100vh',
              backgroundColor: '#03050a',
            }}
          />
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Keep existing /projects logo-scene route working but UNLINKED */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/about" element={<Navigate to="/#about" replace />} />
          <Route path="/skills" element={<Navigate to="/#skills" replace />} />
          <Route path="/hackathons" element={<Navigate to="/#hackathons" replace />} />
          <Route path="/achievements" element={<Navigate to="/#achievements" replace />} />
          <Route path="/contact" element={<Navigate to="/#contact" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
