import { useState } from 'react'
import { PageShell } from '../ui/PageShell'
import { site } from '../config/site'
import { Credits } from '../scenes/Welcome/Credits'
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
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const content = (
    <div className="contact-body">
      <p className="page-intro-text">
        Get in touch for collaborations, project opportunities, or technical inquiries.
      </p>

      <div className="contact-rows-card">
        {/* Email Row */}
        <div className="contact-row">
          <div className="contact-row-left">
            <span className="contact-row-label">Email</span>
            <a href={`mailto:${site.email}`} className="contact-row-value">
              {site.email}
            </a>
          </div>
          <div className="contact-actions">
            <button
              type="button"
              onClick={handleCopyEmail}
              className={`copy-btn ${copied ? 'copy-btn--copied' : ''}`}
              aria-label="Copy email address to clipboard"
            >
              {copied ? 'Copied!' : 'Copy email'}
            </button>
          </div>
        </div>

        {/* GitHub Row */}
        <div className="contact-row">
          <div className="contact-row-left">
            <span className="contact-row-label">GitHub</span>
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-row-value"
            >
              {site.github.replace('https://', '')}
            </a>
          </div>
        </div>

        {/* LinkedIn Row */}
        <div className="contact-row">
          <div className="contact-row-left">
            <span className="contact-row-label">LinkedIn</span>
            <a
              href={site.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-row-value"
            >
              {site.linkedin.replace('https://', '')}
            </a>
          </div>
        </div>

        {/* Location Row */}
        <div className="contact-row">
          <div className="contact-row-left">
            <span className="contact-row-label">Location</span>
            <span className="contact-row-value" style={{ textDecoration: 'none' }}>
              {site.location}
            </span>
          </div>
        </div>

        {/* Resume Download Row */}
        <div className="contact-row">
          <div className="contact-row-left">
            <span className="contact-row-label">Curriculum Vitae</span>
            <span className="contact-row-value" style={{ textDecoration: 'none' }}>
              Official resume and credentials
            </span>
          </div>
          <div className="contact-actions">
            <a
              href={site.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="download-resume-btn"
            >
              Download resume
            </a>
          </div>
        </div>
      </div>

      <footer className="contact-footer" style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(16, 26, 145, 0.12)' }}>
        <Credits inline />
      </footer>
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <PageShell title="Contact - Devesh">
      <h1 className="page-heading">Contact</h1>
      {content}
    </PageShell>
  )
}

export default Contact
