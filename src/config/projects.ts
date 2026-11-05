import jeevalinkImg from '../assets/projects/jeevalink.webp'
import chitguardImg from '../assets/projects/chitguard.webp'
import drDetectionImg from '../assets/projects/dr-detection.webp'
import cashpilotImg from '../assets/projects/cashpilot.webp'
import mediguardAiImg from '../assets/projects/mediguard-ai.webp'
import hireconnectImg from '../assets/projects/hireconnect.webp'
import campusImsImg from '../assets/projects/campus-ims.webp'

export interface ProjectLink {
  label: string
  url: string
}

export interface ProjectItem {
  id: string
  title: string
  status: 'In progress' | 'Completed' | string
  summary: string
  highlights: string[]
  stack: string[]
  description?: string
  role?: string
  year?: string
  focus?: string // CSS object-position, default "50% 50%"
  image: string
  detailImage?: string
  links: ProjectLink[]
}

export const projects: ProjectItem[] = [
  {
    id: 'jeevalink',
    title: 'JeevaLink',
    status: 'In progress',
    summary: 'Offline peer-to-peer mesh emergency communication for disasters and cellular blackouts.',
    highlights: [
      'Wi-Fi Direct + BLE dual-mode mesh with TTL routing',
      'On-device offline speech recognition (Telugu, Tamil, Hindi, English)',
      'One-tap SOS with strobe and siren. Built for Smart India Hackathon.',
    ],
    stack: ['Flutter', 'Kotlin', 'Wi-Fi Direct', 'BLE', 'Sherpa-ONNX'],
    image: jeevalinkImg,
    focus: '50% 50%',
    links: [],
  },
  {
    id: 'chitguard',
    title: 'ChitGuard (SafeChit)',
    status: 'In progress',
    summary: 'App for securing informal Indian chit funds.',
    highlights: [
      'Live bidding room, auction close and dividend payout, random draw',
      'Digital agreement signing and 9-step KYC with liveness',
      'UPI payment flow. Top 120 teams at CSI ORIGIN (VIT Chennai).',
    ],
    stack: ['Flutter', 'Supabase', 'Node.js', 'Google ML Kit'],
    image: chitguardImg,
    focus: '50% 50%',
    links: [],
  },
  {
    id: 'dr-detection',
    title: 'DR Detection',
    status: 'Completed',
    summary: 'Diabetic retinopathy grading from retinal images.',
    highlights: [
      'CLAHE preprocessing, EfficientNet-B4, Grad-CAM explainability and a clinical report',
      '83.88% accuracy, 0.8913 kappa, 0.9227 AUC',
      'Published on Hugging Face (huggingface.co/devesh73/DR-EfficientNet-B4)',
    ],
    stack: ['Python', 'PyTorch', 'EfficientNet-B4', 'Grad-CAM'],
    image: drDetectionImg,
    focus: '50% 50%',
    links: [
      {
        label: 'Hugging Face',
        url: 'https://huggingface.co/devesh73/DR-EfficientNet-B4',
      },
    ],
  },
  {
    id: 'cashpilot',
    title: 'CashPilot',
    status: 'In progress',
    summary: 'Autonomous working-capital management agent.',
    highlights: [
      'Cash-flow forecasting feeding a constraint-based decision engine (reserves, financing, supplier payments)',
      'FastAPI backend with live SSE dashboard',
      '33 automated tests passing. Built for CSI ORIGIN 2026.',
    ],
    stack: ['Python', 'FastAPI', 'React', 'TypeScript', 'ARIMA'],
    image: cashpilotImg,
    focus: '50% 50%',
    links: [],
  },
  {
    id: 'mediguard-ai',
    title: 'MediGuard AI',
    status: 'In progress',
    summary: 'Medicine management app with safety checks.',
    highlights: [
      'Risk-graded drug and food interaction checks',
      'Missed-dose advisor and caretaker portal',
      'Evidence-first data (RxNav, OpenFDA, DailyMed) with an LLM used only for plain-English output. Presented at Nanohack 2026.',
    ],
    stack: ['Flutter', 'TypeScript', 'Supabase', 'Groq'],
    image: mediguardAiImg,
    focus: '50% 50%',
    links: [],
  },
  {
    id: 'hireconnect',
    title: 'HireConnect',
    status: 'Completed',
    summary: 'Inclusive job portal for persons with disabilities.',
    highlights: [
      'Job-seeker and recruiter sides with accessibility accommodations in job posts',
      'Bilingual English/Tamil',
      'Role-based security and automated shortlist emails.',
    ],
    stack: ['React', 'TypeScript', 'Firebase', 'Tailwind'],
    image: hireconnectImg,
    focus: '50% 50%',
    links: [],
  },
  {
    id: 'campus-ims',
    title: 'Campus-IMS',
    status: 'Completed',
    summary: '3D campus information management system.',
    highlights: [
      'Three.js navigator over 3 buildings, 16 floors and 108+ rooms',
      'Role isolation with Supabase row-level security',
      'LMS (attendance, marks, leave/OD) and a print-services queue.',
    ],
    stack: ['React', 'Three.js', 'TypeScript', 'Supabase'],
    image: campusImsImg,
    focus: '50% 50%',
    links: [],
  },
]

export default projects
