import pythonIcon from '../assets/real-logos/python.svg'
import cppIcon from '../assets/real-logos/cplusplus.svg'
import javaIcon from '../assets/real-logos/java.svg'
import reactIcon from '../assets/real-logos/react.svg'
import tailwindIcon from '../assets/real-logos/tailwindcss.svg'
import threejsIcon from '../assets/real-logos/threejs.svg'
import flutterIcon from '../assets/real-logos/flutter.svg'
import kotlinIcon from '../assets/real-logos/kotlin.svg'
import firebaseIcon from '../assets/real-logos/firebase.svg'
import supabaseIcon from '../assets/real-logos/supabase.svg'
import githubIcon from '../assets/real-logos/github.svg'
import nodejsIcon from '../assets/real-logos/nodejs.svg'
import pytorchIcon from '../assets/real-logos/pytorch.svg'
import tensorflowIcon from '../assets/real-logos/tensorflow.svg'
import gitIcon from '../assets/real-logos/git.svg'
import huggingfaceIcon from '../assets/real-logos/huggingface.svg'
import colabIcon from '../assets/real-logos/colab.svg'
import vscodeIcon from '../assets/real-logos/vscode.svg'
import springbootIcon from '../assets/real-logos/springboot.svg'
import postgresqlIcon from '../assets/real-logos/postgresql.svg'
import sqlIcon from '../assets/real-logos/sql.svg'
import typescriptIcon from '../assets/real-logos/typescript.svg'
import androidstudioIcon from '../assets/real-logos/androidstudio.svg'
import dartIcon from '../assets/real-logos/dart.svg'
import genaiIcon from '../assets/real-logos/genai.svg'

export type SkillLevel = 'core' | 'learning'

export type PixelBandPattern =
  | 'sweep'
  | 'staircase'
  | 'stripes'
  | 'burst'
  | 'equalizer'
  | 'trail'
  | 'dots'

export interface SkillItem {
  id: string
  name: string
  icon?: string
  darkIcon?: boolean
  level: SkillLevel
  usedIn: string[]
  usedInText?: string
}

export interface SkillGroup {
  id: string
  title: string
  accent: string
  lightAccent: string
  lightBandTo: string
  lightInk: string
  pattern: PixelBandPattern
  skills: SkillItem[]
  usedInText?: string
}

export const groups: SkillGroup[] = [
  {
    id: 'ai',
    title: 'AI & Deep Learning',
    accent: '#2fd0ff',
    lightAccent: '#0c3b4a',
    lightBandTo: '#2e7d91',
    lightInk: '#093240',
    pattern: 'sweep',
    skills: [
      {
        id: 'pytorch',
        name: 'PyTorch',
        icon: pytorchIcon,
        level: 'core',
        usedIn: ['dr-detection'],
      },
      {
        id: 'tensorflow',
        name: 'TensorFlow',
        icon: tensorflowIcon,
        level: 'core',
        usedIn: [],
        usedInText: 'Coursework and projects',
      },
      {
        id: 'gen-ai',
        name: 'Gen AI',
        icon: genaiIcon,
        level: 'core',
        usedIn: ['mediguard-ai', 'cashpilot', 'career-compass'],
      },
    ],
  },
  {
    id: 'languages',
    title: 'Languages',
    accent: '#ffd166',
    lightAccent: '#3d281c',
    lightBandTo: '#7a5b48',
    lightInk: '#382317',
    pattern: 'staircase',
    usedInText: 'Coursework and projects',
    skills: [
      {
        id: 'python',
        name: 'Python',
        icon: pythonIcon,
        level: 'core',
        usedIn: ['dr-detection', 'cashpilot', 'career-compass'],
      },
      {
        id: 'cpp',
        name: 'C++',
        icon: cppIcon,
        level: 'core',
        usedIn: [],
        usedInText: 'Coursework and projects',
      },
      {
        id: 'java',
        name: 'Java',
        icon: javaIcon,
        level: 'core',
        usedIn: [],
        usedInText: 'Coursework and projects',
      },
      {
        id: 'sql',
        name: 'SQL',
        icon: sqlIcon,
        level: 'core',
        usedIn: ['safechit', 'mediguard-ai', 'career-compass'],
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    accent: '#b79bff',
    lightAccent: '#341948',
    lightBandTo: '#6d4c85',
    lightInk: '#2c143d',
    pattern: 'stripes',
    skills: [
      {
        id: 'git',
        name: 'Git',
        icon: gitIcon,
        level: 'core',
        usedIn: ['*'],
      },
      {
        id: 'github',
        name: 'GitHub',
        icon: githubIcon,
        darkIcon: true,
        level: 'core',
        usedIn: ['*'],
      },
      {
        id: 'vs-code',
        name: 'VS Code',
        icon: vscodeIcon,
        level: 'core',
        usedIn: ['*'],
      },
      {
        id: 'hugging-face',
        name: 'Hugging Face',
        icon: huggingfaceIcon,
        level: 'core',
        usedIn: ['dr-detection'],
      },
      {
        id: 'google-colab',
        name: 'Google Colab',
        icon: colabIcon,
        level: 'core',
        usedIn: ['cashpilot'],
      },
    ],
  },
  {
    id: 'web',
    title: 'Web',
    accent: '#6ea8ff',
    lightAccent: '#141c52',
    lightBandTo: '#434f8c',
    lightInk: '#101A91',
    pattern: 'burst',
    skills: [
      {
        id: 'react',
        name: 'React',
        icon: reactIcon,
        level: 'core',
        usedIn: ['hireconnect', 'cashpilot', 'career-compass'],
      },
      {
        id: 'typescript',
        name: 'TypeScript',
        icon: typescriptIcon,
        level: 'core',
        usedIn: ['hireconnect', 'cashpilot', 'mediguard-ai', 'career-compass'],
      },
      {
        id: 'tailwind-css',
        name: 'Tailwind CSS',
        icon: tailwindIcon,
        level: 'core',
        usedIn: ['hireconnect'],
      },
      {
        id: 'three-js',
        name: 'Three.js',
        icon: threejsIcon,
        darkIcon: true,
        level: 'core',
        usedIn: [],
        usedInText: '3D Interactive Portfolio & R3F Visuals',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile',
    accent: '#7dffb0',
    lightAccent: '#0f3d28',
    lightBandTo: '#397d5d',
    lightInk: '#0b3321',
    pattern: 'equalizer',
    skills: [
      {
        id: 'flutter',
        name: 'Flutter',
        icon: flutterIcon,
        level: 'core',
        usedIn: ['jeevalink', 'safechit', 'mediguard-ai'],
      },
      {
        id: 'dart',
        name: 'Dart',
        icon: dartIcon,
        level: 'core',
        usedIn: ['jeevalink', 'safechit', 'mediguard-ai'],
      },
      {
        id: 'kotlin',
        name: 'Kotlin',
        icon: kotlinIcon,
        level: 'core',
        usedIn: ['jeevalink'],
      },
      {
        id: 'android-studio',
        name: 'Android Studio',
        icon: androidstudioIcon,
        level: 'core',
        usedIn: ['jeevalink', 'safechit', 'mediguard-ai'],
      },
    ],
  },
  {
    id: 'backend',
    title: 'Backend & Cloud',
    accent: '#ff8fb1',
    lightAccent: '#47162b',
    lightBandTo: '#7f435d',
    lightInk: '#3f1225',
    pattern: 'trail',
    skills: [
      {
        id: 'firebase',
        name: 'Firebase',
        icon: firebaseIcon,
        level: 'core',
        usedIn: ['hireconnect'],
      },
      {
        id: 'supabase',
        name: 'Supabase',
        icon: supabaseIcon,
        level: 'core',
        usedIn: ['safechit', 'mediguard-ai', 'career-compass'],
      },
      {
        id: 'nodejs',
        name: 'Node.js',
        icon: nodejsIcon,
        level: 'core',
        usedIn: ['safechit', 'mediguard-ai', 'hireconnect'],
      },
      {
        id: 'spring-boot',
        name: 'Spring Boot',
        icon: springbootIcon,
        level: 'core',
        usedIn: [],
        usedInText: 'Coursework and projects',
      },
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        icon: postgresqlIcon,
        level: 'core',
        usedIn: ['safechit', 'mediguard-ai', 'career-compass'],
      },
    ],
  },
]

export function getSkillsCounts() {
  const totalSkills = groups.reduce((acc, group) => acc + group.skills.length, 0)
  const totalGroups = groups.length
  return {
    totalSkills,
    totalGroups,
    label: `${totalSkills} skills - ${totalGroups} areas`,
  }
}

export default { groups }
