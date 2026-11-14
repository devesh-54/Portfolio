/**
 * stageConfig.ts
 *
 * Central cumulative vh timeline for #stage inside PixelStage.tsx:
 *   Welcome (Hero #hero: 0 .. 102vh)
 *     -> About Me (0 .. 286vh inside #stage: tiny-parts assemble 0..140vh -> hold 140..175vh -> scatter 175..270vh -> L-to-R whip pan 236..286vh)
 *     -> Skills (244 .. 737vh, 3D depth flythrough + Left-3/Right-3 Constellation)
 *     -> Hackathons (737 .. 1053vh, 4-quadrant interactive + exit seam drop)
 *     -> Falling Cards Cascade (1053 .. 1179vh, black+grey -> overlapping pure white)
 *     -> Selected Projects (1176 .. 1434vh, Bot + center line descend & branch 6 featured projects -> hold -> shrink into boxes & gather into Bot)
 *     -> Achievements (1434 .. 1594vh, dark pixel scan + 3 milestones)
 *     -> Contact (1594 .. 1744vh, light pixel scan + Contact card)
 */

export const STAGE_TOTAL_VH = 2010

export const STAGE_SEGMENTS = {
  ABOUT_REVEAL_START_VH: 0,
  ABOUT_REVEAL_END_VH: 140,
  ABOUT_HOLD_VH: 158,
  ABOUT_EXIT_START_VH: 175,
  ABOUT_SCATTER_END_VH: 220,
  ABOUT_EXIT_END_VH: 220,

  // Kinetic Split-Wipe Transition (About Me black void -> Half White/Half Black Hold -> Clockwise Incline Rotation -> Sweep Right -> Full White)
  SKILLS_SPLIT_ENTER_VH: 220,
  SKILLS_SPLIT_HOLD_START_VH: 255,
  SKILLS_SPLIT_HOLD_END_VH: 275,
  SKILLS_SPLIT_TILT_END_VH: 310,
  SKILLS_SPLIT_WIPE_END_VH: 350,

  // Skills Section: pure white background + heading ascend -> cards fly into screen
  SKILLS_START_VH: 220,
  SKILLS_INTRO_START_VH: 350,
  SKILLS_INTRO_END_VH: 420,
  SKILLS_HOLD_VH: 420,
  SKILLS_END_VH: 737,
  SKILLS_DURATION_VH: 322,

  HACK_ENTRY_START_VH: 737,
  HACK_ENTRY_END_VH: 867,
  HACK_HOLD_VH: 917,
  HACK_EXIT_START_VH: 967,
  HACK_EXIT_END_VH: 1053,

  FALL_START_VH: 1053,
  FALL_END_VH: 1179,

  PROJECTS_START_VH: 1176,
  PROJECTS_DEPLOY_END_VH: 1246,
  PROJECTS_HOLD_VH: 1260,
  PROJECTS_STREAM_START_VH: 1260,
  PROJECTS_STREAM_END_VH: 1520,
  PROJECTS_END_VH: 1530,

  // Achievements Section (3D Card Split & 180° Flip: White Page -> Split -> Dark Void Flip)
  ACH_START_VH: 1520,
  ACH_TITLE_DROP_END_VH: 1560,
  ACH_CARD_HOLD_VH: 1585,
  ACH_DIVIDERS_END_VH: 1610,
  ACH_SEPARATE_END_VH: 1655,
  ACH_FLIP_START_VH: 1655,
  ACH_FLIP_END_VH: 1720,
  ACH_HOLD_VH: 1780,

  CONTACT_TRANS_START_VH: 1780,
  CONTACT_TRANS_END_VH: 1910,
  CONTACT_HOLD_VH: 1960,
} as const

export const STAGE_HOLD_PROGRESS = {
  about: STAGE_SEGMENTS.ABOUT_HOLD_VH / STAGE_TOTAL_VH,
  skills: STAGE_SEGMENTS.SKILLS_HOLD_VH / STAGE_TOTAL_VH,
  hackathons: STAGE_SEGMENTS.HACK_HOLD_VH / STAGE_TOTAL_VH,
  projects: STAGE_SEGMENTS.PROJECTS_HOLD_VH / STAGE_TOTAL_VH,
  achievements: STAGE_SEGMENTS.ACH_HOLD_VH / STAGE_TOTAL_VH,
  contact: STAGE_SEGMENTS.CONTACT_HOLD_VH / STAGE_TOTAL_VH,
} as const
