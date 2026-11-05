import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SiteNav, TopActions } from './SiteNav'
import { navigateWithFade } from './navigateWithFade'
import './PageShell.css'

export interface PageShellProps {
  title?: string
  children: React.ReactNode
}

export function PageShell({ title, children }: PageShellProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (title) {
      document.title = title
    }
  }, [title])

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigateWithFade('/', navigate)
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link
          to="/"
          onClick={handleHomeClick}
          className="home-link"
          aria-label="Home page - Devesh"
        >
          <span>Devesh</span>
          <span className="home-link-sub">· AI & Full-Stack Developer</span>
        </Link>
        <TopActions />
      </header>

      <main className="page-content-wrap">
        {children}
      </main>

      <SiteNav variant="compact" />
    </div>
  )
}

export default PageShell
