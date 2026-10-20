import reactSvg from '../assets/logos/react.svg?url'
import pythonSvg from '../assets/logos/python.svg?url'
import flutterSvg from '../assets/logos/flutter.svg?url'
import supabaseSvg from '../assets/logos/supabase.svg?url'
import firebaseSvg from '../assets/logos/firebase.svg?url'
import githubSvg from '../assets/logos/github.svg?url'
import tailwindcssSvg from '../assets/logos/tailwindcss.svg?url'

export interface LogoItem {
  id: string
  label: string
  tagline?: string
  svg: string
  position: [number, number, number]
  tilt: [number, number, number]
  scale: number
  featured?: number
  brandColor: string
}

export const LOGOS_CONFIG: LogoItem[] = [
  {
    id: 'python',
    label: 'Python',
    tagline: 'AI & Deep Learning',
    svg: pythonSvg,
    position: [0.2, 2.2, -1.8],
    tilt: [0.08, -0.16, 0.02],
    scale: 0.85,
    featured: 1,
    brandColor: '#3776AB',
  },
  {
    id: 'react',
    label: 'React',
    tagline: 'Full-Stack Web',
    svg: reactSvg,
    position: [-3.2, 1.4, 0.5],
    tilt: [-0.09, 0.22, -0.03],
    scale: 0.85,
    featured: 2,
    brandColor: '#61DAFB',
  },
  {
    id: 'flutter',
    label: 'Flutter',
    tagline: 'Mobile Apps',
    svg: flutterSvg,
    position: [3.4, 0.8, 0.8],
    tilt: [0.06, -0.20, 0.04],
    scale: 0.85,
    featured: 3,
    brandColor: '#02569B',
  },
  {
    id: 'supabase',
    label: 'Supabase',
    svg: supabaseSvg,
    position: [-1.4, -1.7, 1.6],
    tilt: [-0.10, 0.16, -0.02],
    scale: 0.85,
    brandColor: '#3ECF8E',
  },
  {
    id: 'firebase',
    label: 'Firebase',
    svg: firebaseSvg,
    position: [2.6, -1.5, -0.6],
    tilt: [0.12, -0.25, 0.03],
    scale: 0.85,
    brandColor: '#FFCA28',
  },
  {
    id: 'github',
    label: 'GitHub',
    svg: githubSvg,
    position: [-3.6, -1.2, -2.2],
    tilt: [-0.08, 0.28, -0.04],
    scale: 0.85,
    brandColor: '#24292e',
  },
  {
    id: 'tailwindcss',
    label: 'Tailwind CSS',
    svg: tailwindcssSvg,
    position: [0.3, 0.0, 2.4],
    tilt: [0.11, -0.14, 0.02],
    scale: 0.85,
    brandColor: '#06B6D4',
  },
]
