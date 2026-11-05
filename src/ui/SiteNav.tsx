import React from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa6'
import { site } from '../config/site'
import { navigateWithFade } from './navigateWithFade'
import './SiteNav.css'

export interface NavItem {
  label: string
  to: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ABOUT', to: '/about' },
  { label: 'PROJECTS', to: '/projects' },
  { label: 'SKILLS', to: '/skills' },
  { label: 'CONTACT', to: '/contact' },
]

export interface SiteNavProps {
  variant?: 'pill' | 'compact'
  visible?: boolean
}

export function SiteNav({ variant = 'compact', visible = true }: SiteNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    e.preventDefault()
    navigateWithFade(to, navigate)
  }

  const isPill = variant === 'pill'
  const wrapClassName = isPill
    ? `site-nav-pill-wrap ${!visible ? 'site-nav--hidden' : ''}`
    : 'site-nav-compact-wrap'
  const navClassName = isPill ? 'site-nav-pill' : 'site-nav-compact'

  return (
    <nav className={wrapClassName} aria-label="Main Navigation">
      <div className={navClassName}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to
          // In pill mode (Welcome), PROJECTS is primary filled item.
          // In compact mode, the current route is filled item.
          const isFilled = isPill ? item.to === '/projects' : isActive

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={(e) => handleNavClick(e, item.to)}
              className={`site-nav-item ${isFilled ? 'site-nav-item--filled' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export interface TopActionsProps {
  visible?: boolean
}

export function TopActions({ visible = true }: TopActionsProps) {
  return (
    <div className={`top-actions ${!visible ? 'top-actions--hidden' : ''}`} aria-label="Social and Resume Links">
      <a
        href={site.resumeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="resume-btn"
        aria-label="View Resume (PDF opens in a new tab)"
      >
        <span className="resume-btn-text">Resume</span>
        <span className="resume-btn-short">CV</span>
      </a>
      <a
        href={site.github}
        target="_blank"
        rel="noopener noreferrer"
        className="social-icon-btn"
        aria-label="Devesh GitHub Profile"
        title="GitHub"
      >
        <FaGithub aria-hidden="true" />
      </a>
      <a
        href={site.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="social-icon-btn"
        aria-label="Devesh LinkedIn Profile"
        title="LinkedIn"
      >
        <FaLinkedin aria-hidden="true" />
      </a>
      <a
        href={`mailto:${site.email}`}
        className="social-icon-btn"
        aria-label={`Send Email to ${site.email}`}
        title="Email"
      >
        <FaEnvelope aria-hidden="true" />
      </a>
    </div>
  )
}

export default SiteNav
