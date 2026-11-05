import pythonIcon from '../assets/logos/python.svg'
import reactIcon from '../assets/logos/react.svg'
import tailwindIcon from '../assets/logos/tailwindcss.svg'
import flutterIcon from '../assets/logos/flutter.svg'
import firebaseIcon from '../assets/logos/firebase.svg'
import supabaseIcon from '../assets/logos/supabase.svg'
import githubIcon from '../assets/logos/github.svg'

export interface SkillItem {
  name: string
  icon?: string
}

export interface SkillGroup {
  category: string
  skills: SkillItem[]
}

export const skillGroups: SkillGroup[] = [
  {
    category: "AI & Deep Learning",
    skills: [
      { name: "Python", icon: pythonIcon },
      { name: "Deep Learning" }
    ]
  },
  {
    category: "Web",
    skills: [
      { name: "React", icon: reactIcon },
      { name: "Tailwind CSS", icon: tailwindIcon },
      { name: "Three.js" }
    ]
  },
  {
    category: "Mobile",
    skills: [
      { name: "Flutter", icon: flutterIcon },
      { name: "Kotlin" }
    ]
  },
  {
    category: "Backend & Cloud",
    skills: [
      { name: "Firebase", icon: firebaseIcon },
      { name: "Supabase", icon: supabaseIcon }
    ]
  },
  {
    category: "Tools",
    skills: [
      { name: "GitHub", icon: githubIcon }
    ]
  }
]

export default skillGroups
