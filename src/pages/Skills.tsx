import { PageShell } from '../ui/PageShell'
import { skillGroups } from '../config/skills'
import './Skills.css'

export interface SkillsProps {
  embedded?: boolean
}

export function Skills({ embedded = false }: SkillsProps) {
  const content = (
    <div className="skills-body">
      <p className="page-intro-text">
        Technologies, frameworks, and programming tools I actively use across AI engineering, web, and mobile development.
      </p>

      <div className="skills-grid">
        {skillGroups.map((group) => (
          <section key={group.category} className="skill-category-card" aria-label={group.category}>
            <h3 className="skill-category-title">{group.category}</h3>
            <div className="skills-chip-list">
              {group.skills.map((skill) => (
                <div key={skill.name} className="skill-chip">
                  {skill.icon && (
                    <img
                      src={skill.icon}
                      alt=""
                      aria-hidden="true"
                      className="skill-logo"
                      width={20}
                      height={20}
                    />
                  )}
                  <span>{skill.name}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <PageShell title="Skills - Devesh">
      <h1 className="page-heading">Skills</h1>
      {content}
    </PageShell>
  )
}

export default Skills
