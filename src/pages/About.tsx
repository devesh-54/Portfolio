import { PageShell } from '../ui/PageShell'
import { site } from '../config/site'
import './About.css'

export interface AboutProps {
  embedded?: boolean
}

export function About({ embedded = false }: AboutProps) {
  const content = (
    <div className="about-body">
      <section className="about-bio-section" aria-label="Biography">
        {site.bio.map((paragraph, idx) => (
          <p key={idx} className="about-bio-p">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="about-card" aria-label="Focus Areas">
        <h3 className="about-card-title">Focus Areas</h3>
        <div className="about-chips-wrap">
          {site.focus.map((area) => (
            <span key={area} className="about-chip about-chip--primary">
              {area}
            </span>
          ))}
        </div>
      </section>

      <section className="about-card" aria-label="Education">
        <h3 className="about-card-title">Education</h3>
        <p className="about-card-text">{site.education}</p>
      </section>

      <section className="about-card" aria-label="Languages">
        <h3 className="about-card-title">Languages</h3>
        <div className="about-chips-wrap">
          {site.languages.map((lang) => (
            <span key={lang} className="about-chip">
              {lang}
            </span>
          ))}
        </div>
      </section>
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <PageShell title="About - Devesh">
      <h1 className="page-heading">About</h1>
      {content}
    </PageShell>
  )
}

export default About
