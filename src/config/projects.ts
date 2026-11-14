import jeevalink1Img from '../assets/projects/jeevalink-1.jpeg'
import jeevalink2Img from '../assets/projects/jeevalink-2.jpeg'
import jeevalink3Img from '../assets/projects/jeevalink-3.jpeg'
import cashpilot1Img from '../assets/projects/cashpilot-1.png'
import cashpilot2Img from '../assets/projects/cashpilot-2.png'
import cashpilot3Img from '../assets/projects/cashpilot-3.png'
import mediguardAiImg from '../assets/projects/mediguard-ai.webp'
import hireconnect1Img from '../assets/projects/hireconnect-1.png'
import hireconnect2Img from '../assets/projects/hireconnect-2.png'
import hireconnect3Img from '../assets/projects/hireconnect-3.png'
import campusImsImg from '../assets/projects/campus-ims.webp'
import careerCompassImg from '../assets/projects/career-compass.svg'
import retinaiLandingImg from '../assets/projects/retinai-landing.jpg'
import retinaiTryImg from '../assets/projects/retinai-try.png'
import retinaiPerfImg from '../assets/projects/retinai-performance.jpg'
import safechit1Img from '../assets/projects/safechit-1.jpeg'
import safechit2Img from '../assets/projects/safechit-2.jpeg'
import safechit3Img from '../assets/projects/safechit-3.jpeg'
import safechit4Img from '../assets/projects/safechit-4.jpeg'

export interface ProjectLink {
  label: string
  url: string
}

export interface FeatureHighlight {
  label: string
  description: string
}

export interface TechnicalDetail {
  architecture?: string
  technologies?: string
  challenges?: string
}

export interface AboutDetail {
  overview?: string
  purpose?: string
  targetUsers?: string
}

export interface ProjectItem {
  id: string
  kind?: 'web' | 'mobile'
  featured?: boolean
  title: string
  status: 'In progress' | 'Completed' | string
  summary: string
  description: string
  aboutDetails?: AboutDetail
  highlights?: string[]
  featureColumns?: FeatureHighlight[]
  technicalDetails?: TechnicalDetail
  stack: string[]
  role?: string
  year?: string
  focus?: string // CSS object-position, default "50% 50%"
  image: string
  detailImage?: string
  images?: string[] // Multiple screenshots for detail view slideshow
  links: ProjectLink[]
}

export const projects: ProjectItem[] = [
  {
    id: 'jeevalink',
    kind: 'mobile',
    featured: true,
    title: 'JeevaLink',
    summary:
      'Offline peer-to-peer mesh app that keeps emergency communication alive when networks fail.',
    description:
      'JeevaLink is an off-grid emergency network for disasters like floods, cyclones and earthquakes. Phones connect directly to each other over Wi-Fi Direct and Bluetooth LE, and messages are routed across the mesh with de-duplication, queueing and a hop limit.\n\nIt has a one-tap SOS with strobe and siren, offline voice-to-text in Telugu, Tamil, Hindi and English, and a radar that shows how far nearby peers are. A foreground service keeps connections alive with the screen locked. Built for the Smart India Hackathon (PS 26173).',
    aboutDetails: {
      overview:
        'JeevaLink is a decentralized off-grid mobile emergency communication network engineered for disaster zones where cellular towers and power grids collapse.',
      purpose:
        'To eliminate life-threatening communication blackouts by turning everyday civilian smartphones into autonomous, multi-hop peer-to-peer relay nodes without internet access.',
      targetUsers:
        'Disaster survivors, community volunteers, and emergency responders in network blackout zones.',
    },
    year: '2026',
    status: 'In progress',
    stack: ['Flutter', 'Dart', 'Kotlin', 'Wi-Fi Direct', 'BLE', 'Sherpa-ONNX'],
    highlights: [
      'Off-grid mesh over Wi-Fi Direct & BLE with multi-hop packet de-duplication',
      'One-tap SOS strobe & siren with offline voice-to-text in 4 Indian languages',
      'Interactive peer proximity radar with signal attenuation metrics',
    ],
    featureColumns: [
      {
        label: '01 — OFF-GRID DUAL-BAND MESH',
        description:
          'Ad-hoc Wi-Fi Direct and BLE routing mesh with multi-hop packet de-duplication, persistent queueing, and hop-limit safeguards.',
      },
      {
        label: '02 — EMERGENCY SOS & RADAR',
        description:
          'One-tap SOS strobe and audible siren with an interactive radar displaying nearby peer distances.',
      },
      {
        label: '03 — OFFLINE MULTILINGUAL STT',
        description:
          'On-device Sherpa-ONNX neural speech engine providing offline speech-to-text in Telugu, Tamil, Hindi, and English.',
      },
    ],
    technicalDetails: {
      architecture:
        'Cross-platform Flutter frontend backed by native Android Kotlin foreground daemon services for continuous background socket management.',
      technologies:
        'Wi-Fi Direct P2P, BLE peripheral/central modes, Sherpa-ONNX neural STT, Android Foreground Services.',
      challenges:
        'Maintaining stable background mesh discovery and packet relay with locked screens under aggressive Android battery saving.',
    },
    image: jeevalink1Img,
    images: [jeevalink1Img, jeevalink2Img, jeevalink3Img],
    focus: '50% 20%',
    links: [
      { label: 'Repo', url: 'https://github.com/ashwin-kumaar-b/lifelink' },
    ],
  },
  {
    id: 'safechit',
    kind: 'mobile',
    featured: true,
    title: 'SafeChit',
    summary:
      'AI-verified chit fund platform that makes informal chit groups safer and transparent.',
    description:
      'SafeChit turns real-time chit groups into a complete app, addressing default risk, opaque bidding and manual KYC. It has a host console, a member dashboard, digital agreement signing, a live bidding room with auction close and dividend payout, and a random draw.\n\nSafety comes from a 9-step KYC onboarding with liveness check, a guarantor system with database-enforced rules, and an events-based reputation score. Selected among the top 120 teams at CSI ORIGIN, a national fintech hackathon at VIT Chennai.',
    aboutDetails: {
      overview:
        'SafeChit is an AI-powered financial platform that digitalizes informal chit fund circles into a transparent, secure, and legally auditable mobile application.',
      purpose:
        'To protect informal community savers from organizer fraud, bidding opacity, and member default by automating identity verification, live auctions, and dividend disbursements.',
      targetUsers:
        'Chit fund members, community savings organizers, self-help groups (SHGs), and micro-investors seeking transparent group finance.',
    },
    year: '2026',
    status: 'In progress',
    stack: ['Flutter', 'Supabase', 'Node.js', 'Google ML Kit'],
    highlights: [
      '9-step biometric KYC onboarding with ML Kit liveness verification',
      'Live chit bidding auction room with database-enforced dividend payouts',
      'Guarantor verification and events-based reputation score',
    ],
    featureColumns: [
      {
        label: '01 — BIOMETRIC ONBOARDING',
        description:
          '9-step KYC verification workflow with Google ML Kit real-time liveness detection and anti-spoofing facial analysis.',
      },
      {
        label: '02 — LIVE AUCTION ARENA',
        description:
          'Real-time bidding arena with synchronized timers, minimum bid enforcement, and instant database-locked dividend payouts.',
      },
      {
        label: '03 — GUARANTOR ENFORCEMENT',
        description:
          'Multi-party guarantor verification protocol ensuring fund release only after mutual cryptographic approval.',
      },
    ],
    technicalDetails: {
      architecture:
        'Flutter cross-platform client communicating via WebSocket streams with Supabase PostgreSQL and Node.js backend services.',
      technologies:
        'Flutter, Dart, Supabase Realtime, PostgreSQL Row Level Security (RLS), Google ML Kit Vision, Edge Functions.',
      challenges:
        'Enforcing atomic database locks during auction close to prevent race conditions and automate dividend disbursement.',
    },
    image: safechit1Img,
    images: [safechit1Img, safechit2Img, safechit3Img, safechit4Img],
    focus: '50% 20%',
    links: [
      { label: 'Repo', url: 'https://github.com/devesh-54/Safe_chit' },
    ],
  },
  {
    id: 'hireconnect',
    kind: 'web',
    featured: true,
    title: 'HireConnect',
    summary:
      'Inclusive job portal connecting job seekers, including persons with disabilities, with recruiters.',
    description:
      'HireConnect connects educated and vocational job seekers with recruiters, and adds a government exam notification portal. Job seekers get an applications tracker and a support and grievance system.\n\nRecruiters get an analytics dashboard, a multi-step job posting builder with accessibility accommodations (wheelchair access, screen readers, sign language interpreters), applicant management and automated shortlist or reject emails. The interface is bilingual (English and Tamil), screen-reader friendly and uses role-based routes.',
    aboutDetails: {
      overview:
        'HireConnect is an inclusive job portal designed for educated and vocational job seekers, including persons with disabilities (PwD).',
      purpose:
        'To bridge employment gaps by providing screen-reader accessible job boards, exam alerts, and a recruiter applicant tracking pipeline.',
      targetUsers:
        'Job seekers with disabilities, vocational applicants, and inclusive employers.',
    },
    year: '2026',
    status: 'Completed',
    stack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Firebase'],
    highlights: [
      'Accessible job board with screen-reader & sign-language support filters',
      'Recruiter pipeline dashboard with automated applicant tracking & notifications',
    ],
    featureColumns: [
      {
        label: '01 — JOB SEEKERS',
        description:
          'Accessible job board, application tracking, government exam alerts, and grievance support.',
      },
      {
        label: '02 — RECRUITERS',
        description:
          'Recruiter dashboard, applicant management pipeline, and automated email notifications.',
      },
    ],
    technicalDetails: {
      architecture: 'React 18 + TypeScript + Vite with Tailwind CSS and Firebase backend.',
      technologies: 'WCAG 2.1 AA screen-reader audio guides, bilingual English/Tamil routes.',
      challenges: 'Multi-criteria accessibility accommodations and automated applicant ranking.',
    },
    image: hireconnect1Img,
    images: [hireconnect1Img, hireconnect2Img, hireconnect3Img],
    focus: '50% 50%',
    links: [
      { label: 'Repo', url: 'https://github.com/nanbargal28/Hire-connect-' },
      { label: 'Live Demo', url: 'https://hireconnect-iota.vercel.app/' },
    ],
  },
  {
    id: 'dr-detection',
    kind: 'web',
    featured: true,
    title: 'DR Detection',
    summary:
      'Diabetic retinopathy grading model with explainable heatmaps and a clinical report.',
    description:
      'RetinAI is an AI-powered medical imaging pipeline that grades diabetic retinopathy from fundus photographs with almost perfect agreement: CLAHE preprocessing, an EfficientNet-B4 model trained in two phases, Grad-CAM heatmaps to show what the model looked at, and an auto-generated clinical report.\n\nEvaluation on the test set achieves 83.88% overall accuracy, 0.8913 quadratic weighted kappa, 0.834 weighted F1 score, and 0.9227 macro ROC-AUC, providing real-time diagnostic grading under 2 seconds.',
    aboutDetails: {
      overview:
        'RetinAI is an explainable deep learning pipeline for automated diabetic retinopathy grading from retinal fundus photographs.',
      purpose:
        'To provide fast, clinician-interpretable diagnostic assistance that prevents preventable vision loss in diabetic patients.',
      targetUsers:
        'Ophthalmologists, optometrists, diabetic care clinics, and telemedicine providers.',
    },
    year: '2026',
    status: 'Completed',
    stack: ['Python', 'EfficientNet-B4', 'Grad-CAM', 'Albumentations', 'React'],
    highlights: [
      'EfficientNet-B4 model with CLAHE preprocessing achieving 83.88% accuracy & 0.8913 Kappa',
      'Grad-CAM explainable visual heatmaps with automated clinical diagnostic reports',
      'Interactive web diagnostic portal with fundus image dropzone and real-time evaluation',
    ],
    featureColumns: [
      {
        label: '01 — DIAGNOSTIC GRADING',
        description:
          'EfficientNet-B4 pipeline with CLAHE preprocessing achieving 83.88% accuracy & 0.8913 Kappa.',
      },
      {
        label: '02 — CLINICAL EXPLAINABILITY',
        description:
          'Grad-CAM visual attention heatmaps with automated physician diagnostic report generator.',
      },
    ],
    technicalDetails: {
      architecture: 'PyTorch deep learning model served via FastAPI with React evaluation portal.',
      technologies: 'CLAHE, Grad-CAM, Albumentations augmentations, Hugging Face Hub.',
      challenges: 'Class imbalance across 5 DR severity stages and 2-second real-time inference.',
    },
    image: retinaiLandingImg,
    images: [retinaiLandingImg, retinaiTryImg, retinaiPerfImg],
    focus: '50% 50%',
    links: [
      {
        label: 'Repo',
        url: 'https://github.com/ashwin-kumaar-b/drdetectionmain',
      },
      {
        label: 'Live Demo',
        url: 'https://drdetection-delta.vercel.app/',
      },
    ],
  },
  {
    id: 'cashpilot',
    kind: 'web',
    featured: true,
    title: 'CashPilot',
    summary:
      'Autonomous working-capital agent that forecasts cash flow and decides how to pay and finance.',
    description:
      'CashPilot AI is an autonomous working-capital management agent for a Tata Motors-style automotive manufacturer, built for the CSI ORIGIN 2026 hackathon. ARIMA forecasts daily net cash flow, and a decision engine weighs payment and financing strategy against supplier obligations, discounts, penalties and financing costs.\n\nThe language model never calculates anything: it only narrates a pre-computed decision. A FastAPI backend streams live data to a React dashboard.',
    aboutDetails: {
      overview:
        'CashPilot AI is an autonomous working-capital management agent simulating corporate treasury operations for automotive supply chains.',
      purpose:
        'To optimize corporate liquidity by balancing supplier discount capture against debt financing penalties via real-time optimization.',
      targetUsers:
        'Corporate treasurers, supply chain finance teams, and automotive manufacturers.',
    },
    year: '2026',
    status: 'In progress',
    stack: ['Python', 'ARIMA', 'FastAPI', 'React', 'TypeScript'],
    highlights: [
      'ARIMA time-series net cash-flow forecasting agent for auto manufacturing',
      'Real-time decision engine weighing supplier discounts vs financing penalties',
    ],
    featureColumns: [
      {
        label: '01 — CASH FLOW FORECASTING',
        description:
          'ARIMA time-series net cash-flow forecasting agent tailored for automotive supply chains.',
      },
      {
        label: '02 — TREASURY DECISION ENGINE',
        description:
          'Real-time optimization engine weighing supplier discounts vs debt financing penalties.',
      },
    ],
    technicalDetails: {
      architecture: 'FastAPI streaming SSE backend, Python ARIMA models, and React TypeScript dashboard.',
      technologies: 'SSE live telemetry, ARIMA time-series analysis, knapsack portfolio solver.',
      challenges: 'Decoupling deterministic financial math from LLM pre-computed verdict narration.',
    },
    image: cashpilot1Img,
    images: [cashpilot1Img, cashpilot2Img, cashpilot3Img],
    focus: '50% 50%',
    links: [
      { label: 'Repo', url: 'https://github.com/devesh-54/CaptialMind' },
    ],
  },
  {
    id: 'campus-ims',
    kind: 'web',
    featured: true,
    title: 'Campus-IMS',
    summary:
      '3D interactive campus information system with an administrative suite for students, faculty and staff.',
    description:
      'Campus-IMS lets users explore a 3D campus (3 buildings, 16 floors, 108+ rooms) and find staff, with auto-focus on the room. Access is isolated by role using PostgreSQL row-level security.\n\nIt includes a smart classroom resource manager, an LMS suite (attendance, marks, gradebook, leave and OD workflow) and a cloud print hub with a first-come queue, teacher priority and automatic file purge after 24 hours.',
    aboutDetails: {
      overview:
        'Campus-IMS is an interactive 3D spatial twin and comprehensive administrative suite for modern academic institutions.',
      purpose:
        'To simplify campus navigation across 108+ rooms while automating smart classroom management, attendance, and secure print queues.',
      targetUsers:
        'Students, faculty members, lab instructors, and administrative staff.',
    },
    year: '2026',
    status: 'Completed',
    stack: ['Three.js', 'React', 'TypeScript', 'Supabase', 'Tailwind CSS'],
    highlights: [
      'Interactive 3D campus navigator across 3 buildings, 16 floors and 108+ rooms',
      'Smart classroom LMS suite & cloud print hub with PostgreSQL row-level security',
    ],
    featureColumns: [
      {
        label: '01 — 3D CAMPUS NAVIGATOR',
        description:
          'Three.js spatial digital twin mapping 3 buildings, 16 floors, and 108+ rooms with automated camera wayfinding.',
      },
      {
        label: '02 — LMS & RESOURCE SUITE',
        description:
          'Smart classroom booking, attendance records, gradebook workflows, and leave management.',
      },
      {
        label: '03 — SECURE CLOUD PRINT HUB',
        description:
          'Automated first-come print queue with teacher priority overrides and 24-hour file purge.',
      },
    ],
    technicalDetails: {
      architecture:
        'Three.js 3D viewport embedded in React with Supabase PostgreSQL Row-Level Security.',
      technologies:
        'Three.js, React, TypeScript, Supabase PostgreSQL RLS, Tailwind CSS.',
      challenges:
        'Optimizing 3D mesh rendering and camera focus across complex multi-floor building plans.',
    },
    image: campusImsImg,
    images: [campusImsImg],
    focus: '50% 50%',
    links: [
      { label: 'Repo', url: 'https://github.com/devesh-54/Campus-IMS' },
    ],
  },
  {
    id: 'mediguard-ai',
    featured: false,
    title: 'MediGuard AI',
    summary:
      'Medicine management app with risk-graded drug and food interaction checks.',
    description:
      'A patient and caretaker app that checks drug and food interactions, advises on missed doses and sets offline medicine alarms, with a caretaker portal showing adherence. Evidence comes from sources like RxNav and USDA FoodData Central, and the language model is used only to put results in plain English. Presented at Nanohack 2026 and built for the AI HealthTech & Groq LPU Hackathon.',
    year: '2026',
    status: 'In progress',
    stack: ['Flutter', 'TypeScript', 'Express', 'Supabase'],
    image: mediguardAiImg,
    focus: '50% 50%',
    links: [],
  },
  {
    id: 'career-compass',
    featured: false,
    title: 'Career Compass Flow',
    summary:
      'AI career intelligence: ATS resume scoring, skill-gap radar and a learning roadmap.',
    description:
      'Connects a degree to live job and salary data. It scores resumes (PDF or DOCX) against ATS rules, shows a skill-gap radar and builds a phased learning roadmap. Built for the Global AI Hackathon 2026 (AI & Future of Work track).',
    year: '2026',
    status: 'In progress',
    stack: ['React', 'TypeScript', 'FastAPI', 'Supabase', 'Gemini'],
    image: careerCompassImg,
    focus: '50% 50%',
    links: [
      {
        label: 'Live demo',
        url: 'https://career-compass-flow.vercel.app',
      },
    ],
  },
]

export default projects
