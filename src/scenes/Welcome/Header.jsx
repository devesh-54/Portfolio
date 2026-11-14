import { TopActions } from '../../ui/SiteNav'
import { SectionOrderNav } from '../../ui/SectionOrderNav'

/**
 * @param {{
 *   actionsVisible?: boolean
 *   theme?: 'dark' | 'light'
 *   activeSection?: import('../../ui/SectionOrderNav').SectionId
 *   onSelectSection?: (id: import('../../ui/SectionOrderNav').SectionId) => void
 * }} [props]
 */
/**
 * Header disabled per user request: section navigation bar removed from all sections.
 */
export function Header() {
  return null
}

export default Header
