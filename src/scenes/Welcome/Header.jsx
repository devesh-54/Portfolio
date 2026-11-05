import { TopActions } from '../../ui/SiteNav'

export function Header({ actionsVisible = true, theme = 'dark' } = {}) {
  return (
    <header className="header" id="site-header" data-theme={theme} style={{ zIndex: 100 }}>
      <span className="header-name">
        Devesh <span className="header-author">· AI & Full-Stack Developer</span>
      </span>
      <TopActions visible={actionsVisible} />
    </header>
  )
}

export default Header
