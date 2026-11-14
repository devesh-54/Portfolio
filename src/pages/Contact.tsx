import { useState } from 'react'
import { PageShell } from '../ui/PageShell'
import { site } from '../config/site'
import './Contact.css'

export interface ContactProps {
  embedded?: boolean
}

export function Contact({ embedded = false }: ContactProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  const linkedinHandle = site.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\//, '')
  const githubHandle = site.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')

  const content = (
    <div className="contact-poster">
      {/* 1. Large Stacked Hero Typography */}
      <header className="contact-hero-header">
        <h1 className="contact-hero-title">
          <span className="contact-hero-line">LET'S</span>
          <span className="contact-hero-line">
            CONNECT<span className="contact-title-dot">.</span>
          </span>
        </h1>
      </header>

      {/* 2. Main Two-Column Editorial Grid */}
      <div className="contact-main-grid">
        {/* LEFT COLUMN: Profile + Availability + Action Buttons */}
        <div className="contact-profile-col">
          <div className="contact-profile-info">
            <h2 className="contact-profile-name">{site.name}</h2>
            <p className="contact-profile-role">{site.role}</p>
          </div>

          <div className="contact-availability-badge">
            <span className="contact-avail-dot" />
            <span className="contact-avail-text">{site.location} · Available for work</span>
          </div>

          <div className="contact-actions-group">
            <button
              type="button"
              onClick={handleCopyEmail}
              className={`contact-action-btn contact-action-btn--copy ${copied ? 'is-copied' : ''}`}
              aria-label="Copy email address"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? 'Copied to clipboard!' : 'Copy email'}</span>
            </button>

            <a
              href={site.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="Devesh_Resume.pdf"
              className="contact-action-btn contact-action-btn--primary"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download CV</span>
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: Contact Links with Circular Badges */}
        <div className="contact-links-col">
          <div className="contact-link-divider" />
          {/* Row 1: LinkedIn */}
          <a
            href={site.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link-card"
            title="Open LinkedIn Profile"
          >
            <div className="contact-link-icon-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.62 1.62 0 1 0 1.62 1.62c0-.9-.73-1.62-1.62-1.62z" />
              </svg>
            </div>
            <div className="contact-link-text">
              <span className="contact-link-label">LINKEDIN</span>
              <span className="contact-link-val">{linkedinHandle}</span>
            </div>
            <span className="contact-link-arrow">↗</span>
          </a>
          <div className="contact-link-divider" />

          {/* Row 2: Email */}
          <a
            href={`mailto:${site.email}`}
            className="contact-link-card"
            title="Send Email"
          >
            <div className="contact-link-icon-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div className="contact-link-text">
              <span className="contact-link-label">EMAIL</span>
              <span className="contact-link-val">{site.email}</span>
            </div>
            <span className="contact-link-arrow">↗</span>
          </a>
          <div className="contact-link-divider" />

          {/* Row 3: GitHub */}
          <a
            href={site.github}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link-card"
            title="Open GitHub Profile"
          >
            <div className="contact-link-icon-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <div className="contact-link-text">
              <span className="contact-link-label">GITHUB</span>
              <span className="contact-link-val">{githubHandle}</span>
            </div>
            <span className="contact-link-arrow">↗</span>
          </a>
          <div className="contact-link-divider" />
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <PageShell title="Contact - Devesh">
      {content}
    </PageShell>
  )
}

export default Contact
