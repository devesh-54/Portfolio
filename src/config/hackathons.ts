export type HackathonQuadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface HackathonMetaItem {
  label: string
  value: string
  highlight?: boolean
}

export interface HackathonEntry {
  id: string
  index: string
  quadrant: HackathonQuadrant
  title: string
  shortBadge: string
  venue?: string
  year: string
  statusTag: string
  headline: string
  paragraphs: string[]
  meta: HackathonMetaItem[]
  /** Optional fields ready to populate when additional details are provided */
  dateLabel?: string
  teamSize?: string
  duration?: string
  learnings?: string
}

export const hackathons: HackathonEntry[] = [
  {
    id: 'csi-origins-2026',
    index: '01',
    quadrant: 'top-left',
    title: 'CSI ORIGINS 2026',
    shortBadge: 'VIT College · Shortlisted',
    venue: 'VIT College',
    year: '2026',
    statusTag: 'PPT Shortlist & New PS Pivot',
    headline: 'Selected in the PPT shortlist round and pivoted on-site to a newly assigned problem statement.',
    paragraphs: [
      'Cleared the initial screening round at VIT College through a PPT selection pitched around the SafeChit concept.',
      'During the main hackathon round, organizers issued a fresh problem statement on-site — prompting a pivot to build CapitalMind.',
    ],
    meta: [
      { label: 'Stage', value: 'PPT Shortlist Selected', highlight: true },
      { label: 'Initial Pitch', value: 'SafeChit' },
      { label: 'On-Site PS Build', value: 'CapitalMind', highlight: true },
    ],
  },
  {
    id: 'sih-2026',
    index: '02',
    quadrant: 'top-right',
    title: 'SIH 2026',
    shortBadge: 'Internal Round · Top 50 Teams',
    year: '2026',
    statusTag: 'Top 50 Shortlist · PS SIH26173',
    headline: 'Shortlisted among the Top 50 teams in the internal Smart India Hackathon selection round.',
    paragraphs: [
      'Advanced through the internal institutional screening round, ranking within the Top 50 shortlisted teams.',
      'Selected official problem statement SIH26173 and developed the JeevaLink submission for the track.',
    ],
    meta: [
      { label: 'Standing', value: 'Top 50 Teams (Internal)', highlight: true },
      { label: 'PS Code', value: 'SIH26173', highlight: true },
      { label: 'Built', value: 'JeevaLink' },
    ],
  },
  {
    id: 'nanohack-2026',
    index: '03',
    quadrant: 'bottom-left',
    title: 'Nanohack 2026',
    shortBadge: 'SIMATS Engineering · 2026',
    venue: 'SIMATS Engineering',
    year: '2026',
    statusTag: 'SIMATS Engineering · Participant',
    headline: 'Participated at Nanohack 2026 hosted by SIMATS Engineering, building MediGuard.',
    paragraphs: [
      'Competed in the 2026 edition of Nanohack organized at SIMATS Engineering.',
      'Designed and built the MediGuard hackathon submission directly for the event track.',
    ],
    meta: [
      { label: 'Host', value: 'SIMATS Engineering', highlight: true },
      { label: 'Edition', value: '2026' },
      { label: 'Built', value: 'MediGuard' },
    ],
  },
  {
    id: 'innoclash-26',
    index: '04',
    quadrant: 'bottom-right',
    title: 'INNOCLASH’26',
    shortBadge: '2026 · Hackathon Entry',
    year: '2026',
    statusTag: 'INNOCLASH’26 · Participant',
    headline: 'Competed in INNOCLASH’26 with the HireConnect hackathon build.',
    paragraphs: [
      'Participated in INNOCLASH’26 and developed HireConnect as the core hackathon entry for the competition.',
    ],
    meta: [
      { label: 'Edition', value: '2026' },
      { label: 'Submission', value: 'HireConnect', highlight: true },
    ],
  },
]

export default hackathons

