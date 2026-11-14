/**
 * Site theme selection ("dark" | "light") and tokens
 */
export type SiteTheme = 'dark' | 'light'

export const siteTheme: SiteTheme = 'light'

/**
 * Dark theme tokens for the Welcome scene
 */
export const darkTheme = {
  background: '#03050a',
  surfaceFill: '#090d18',
  hatchInk: '#4d73d9',
  outlineInk: '#8fc4ff',
  glowCyan: '#2fd0ff',
  text: {
    primary: '#cfe3ff',
    secondary: '#7fa6e8',
  },
}

export const voidBg = '#03050a'
export const pageBg = '#ffffff'
export const pageInk = '#101A91'

export default darkTheme
