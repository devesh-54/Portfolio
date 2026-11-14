import './SiteNav.css'

export type SectionId =
  | 'welcome'
  | 'about'
  | 'skills'
  | 'hackathons'
  | 'projects'
  | 'achievements'
  | 'contact'

export interface SectionOrderItem {
  id: SectionId
  label: string
  shortLabel: string
}

export const PORTFOLIO_SECTIONS: SectionOrderItem[] = [
  { id: 'welcome', label: 'Welcome', shortLabel: 'Welcome' },
  { id: 'about', label: 'About', shortLabel: 'About' },
  { id: 'skills', label: 'Skills', shortLabel: 'Skills' },
  { id: 'hackathons', label: 'Hackathons', shortLabel: 'Hack' },
  { id: 'projects', label: 'Projects', shortLabel: 'Projects' },
  { id: 'achievements', label: 'Achievements', shortLabel: 'Achieve' },
  { id: 'contact', label: 'Contact', shortLabel: 'Contact' },
]

export interface SectionOrderNavProps {
  activeSection?: SectionId
  onSelectSection?: (id: SectionId) => void
  visible?: boolean
}

export function SectionOrderNav(_props?: SectionOrderNavProps) {
  return null
}

export default SectionOrderNav

