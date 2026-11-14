export interface AchievementItem {
  id: string
  index: string
  kind: string
  title: string
  venue: string
  location: string
  date: string
  role: string
  summary: string
  tags: string[]
  project?: string
  links?: string[]
  // Presentation fields for card layout
  category: string
  metric: string
  subtitle: string
  description: string
}

export const achievements: AchievementItem[] = [
  {
    id: 'makegpt-iitm-2025',
    index: '01',
    kind: 'Generative AI & Industry Summit',
    title: 'MakeGPT Summit 2025 — IIT Madras',
    venue: 'IIT Madras Research Park (IITMRP)',
    location: 'Chennai, India',
    date: '2025',
    role: "Represented RIT Chennai's AI & Data Science delegation",
    summary:
      "Represented RIT Chennai's AI & Data Science delegation at the MakeGPT Summit hosted at the IIT Madras Research Park. Explored advancements in Generative AI and enterprise LLM architectures, and networked with technology leaders on turning AI research into real-world systems.",
    tags: ['IIT Madras Research Park', 'Enterprise GenAI Applications', 'Academic-Industry Synergy'],
    links: [],
    category: 'Generative AI & Industry Summit',
    metric: 'IIT Madras Research Park',
    subtitle: 'IITMRP · Chennai, India',
    description:
      "Represented RIT Chennai's AI & Data Science delegation at the MakeGPT Summit hosted at the IIT Madras Research Park. Explored advancements in Generative AI and enterprise LLM architectures, and networked with technology leaders on turning AI research into real-world systems.",
  },
  {
    id: 'csi-origin-2026',
    index: '02',
    kind: 'National fintech hackathon',
    title: 'CSI ORIGIN 2026',
    venue: 'VIT Chennai',
    location: 'Chennai, India',
    date: '2026',
    role: 'Top 120 Teams Finalist',
    summary:
      'SafeChit was selected among the top 120 teams at CSI ORIGIN, a national fintech hackathon at VIT Chennai. SafeChit is an AI-verified chit fund platform with live bidding, KYC with liveness check, a guarantor system and an events-based reputation score.',
    tags: ['Top 120 Teams', 'Fintech', 'SafeChit'],
    project: 'safechit',
    links: [],
    category: 'National Fintech Hackathon · VIT Chennai',
    metric: 'Top 120 Teams',
    subtitle: 'VIT Chennai · Chennai, India',
    description:
      'SafeChit was selected among the top 120 teams at CSI ORIGIN, a national fintech hackathon at VIT Chennai. SafeChit is an AI-verified chit fund platform with live bidding, KYC with liveness check, a guarantor system and an events-based reputation score.',
  },
  {
    id: 'sih-ps-26173',
    index: '03',
    kind: 'Smart India Hackathon',
    title: 'Smart India Hackathon — PS 26173',
    venue: 'Disaster Communication Mesh',
    location: 'Chennai, India',
    date: '2026',
    role: 'Team 4 Titans',
    summary:
      'Built JeevaLink for problem statement PS 26173: an off-grid peer-to-peer emergency mesh network that keeps communication alive during disasters and cellular blackouts. It works with offline voice in Telugu, Tamil, Hindi and English, a one-tap SOS and a nearby-peer radar.',
    tags: ['Smart India Hackathon', 'Disaster Communication', 'JeevaLink'],
    project: 'jeevalink',
    links: [],
    category: 'Smart India Hackathon',
    metric: 'SIH PS 26173',
    subtitle: 'JeevaLink · Emergency Mesh Network',
    description:
      'Built JeevaLink for problem statement PS 26173: an off-grid peer-to-peer emergency mesh network that keeps communication alive during disasters and cellular blackouts. It works with offline voice in Telugu, Tamil, Hindi and English, a one-tap SOS and a nearby-peer radar.',
  },
]

export default achievements
