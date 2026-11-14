# Comprehensive Project Audit Report

**Date:** 2026-11-14  
**Branch:** `chore/audit-cleanup`  
**Repository:** `devesh-portfolio`  
**Stack:** Vite 8 + React 19 + TypeScript 6 + Three.js / React Three Fiber + GSAP + Lenis

---

## 1. Executive Summary

### Key Project Statistics
- **Total Tracked Files:** 151 files
- **Source Files (`src/`):** 126 files (117 active in primary portfolio flow, 9 in unlinked `/projects` route)
- **Public Assets (`public/`):** 20 files (including a 766 MB unoptimized original GLB)
- **Node & NPM:** Node.js v22.20.0, npm 10.9.3, single lockfile (`package-lock.json`)
- **TypeScript Errors:** **0 errors** (`npx tsc --noEmit` passes cleanly)
- **Circular Dependencies:** **0 circular dependencies** (verified with `npx madge`)
- **Vulnerabilities:** 0 critical, 0 high, 4 moderate (transitive dev CLI dependencies in `@gltf-transform/cli`)

### The 10 Most Important Findings
1. **Oversized Unoptimized 3D Model in `public/models/`:** `public/models/gaming_computer.glb` is **766.3 MB** (784,722 KB). The active code loads `gaming_computer.opt.glb` (2.9 MB). Because Vite copies all files in `public/` into `dist/` during build, this 766 MB raw asset bloats repository and deployment bundles.
2. **Unused Standalone `/projects` Scene (9 Files):** The unlinked `/projects` route (old logo-space scene) keeps 9 files alive (`ProjectsScene.tsx`, `CameraRig.tsx`, `LogoTile.tsx`, `Space.tsx`, `useLogoTexture.ts`, `camera-settings.json`, `ProjectsOverlay.tsx`, `logos.ts`, and `pages/Projects.tsx`). The main portfolio now showcases projects via `ProjectsEditorial.tsx` within the unified `PixelStage` scroll experience.
3. **Unused NPM Dependency:** `react-icons` (`^5.7.0`) is declared in `package.json:21` but has **0 imports** across the entire codebase.
4. **Dev Tooling in Production Bundle:** `leva` (`^0.10.1`) is listed under `dependencies` rather than `devDependencies` and is statically imported into the 3D scene, inflating the client bundle by ~120 KB gzip.
5. **Misgrouped Dependency:** `@types/three` (`^0.186.0`) is declared in runtime `dependencies` instead of `devDependencies`.
6. **Duplicate Assets in `public/`:** 
   - `public/paper.webp` (391.5 KB) and `public/textures/paper.webp` (391.5 KB) are identical duplicates and neither is referenced in the active GLSL shaders (which generate procedural noise).
   - `public/draco/gltf/` is a redundant duplicate copy of `public/draco/`.
   - `public/Resume___.pdf` (109.7 KB) and `public/resume.pdf` (109.7 KB) are identical duplicates.
7. **Missing Metadata and Unlinked Favicon in `index.html`:** `index.html` has no `<meta name="description">`, no `<meta name="theme-color">`, no Open Graph (`og:*`) or Twitter card tags, and does not link `public/favicon.svg`.
8. **Missing Core Project Files:** No `LICENSE` file, no `robots.txt`, no `sitemap.xml`, and no SPA redirect configuration (`vercel.json` or `_redirects`).
9. **Placeholder Project Images & Missing Credit Lines:** `campus-ims.webp` and `mediguard-ai.webp` are Lorem Picsum placeholder images, and `career-compass.svg` is an illustration placeholder. `CREDITS.md` is missing attribution for the CC-BY 3D models of the keyboard (`keyboard.opt.glb`) and mouse (`mouse.opt.glb`).
10. **Single Giant Client Bundle Chunk (>1.2 MB minified):** `dist/assets/SiteNav-*.js` is **1,212.92 kB** (gzip: 345.99 kB) due to bundled Three.js + R3F + Leva.

---

## 2. Required Files and Content Checklist

| Item | Status | Details / Evidence |
| :--- | :--- | :--- |
| `README.md` | **PLACEHOLDER** | Out of date; only documents Page 1 / Welcome scene; references deleted `src/config/objects.ts`; missing full portfolio guide & deployment instructions. |
| `CREDITS.md` | **PLACEHOLDER** | Missing CC-BY attribution for `keyboard.opt.glb` and `mouse.opt.glb`. Mentions stale `/projects` logos. |
| `LICENSE` | **MISSING** | No license file in repository root. |
| `.gitignore` | **INCOMPLETE** | Missing explicit entries for `*.log`, `.env*`, and raw unoptimized 3D models (`*.glb` in public/models). |
| `.env.example` | **MISSING** | No environment variables currently used in source. |
| `package.json` | **INCOMPLETE** | Missing `typecheck` script (`tsc -b`). Has `dev`, `build`, `lint` (`oxlint`), `preview`. |
| `tsconfig.json` | **OK** | Configured with project references to `tsconfig.app.json` and `tsconfig.node.json`. |
| `vite.config.ts` | **OK** | Vite 8 + `@vitejs/plugin-react`. |
| 404 Route | **OK** | In `src/App.tsx:33`: `<Route path="*" element={<Navigate to="/" replace />} />`. |
| Favicon | **PLACEHOLDER** | File `public/favicon.svg` exists, but is NOT linked in `index.html`. |
| `robots.txt` | **MISSING** | `public/robots.txt` does not exist (Lighthouse audit warning). |
| `sitemap.xml` | **MISSING** | Optional, but missing. |
| Deployment Config | **MISSING** | No `vercel.json` or Netlify `_redirects` file for client-side routing. |
| `index.html` tags | **PLACEHOLDER** | Missing meta description, theme-color, og tags, twitter tags, and favicon link. |

---

## 3. Placeholders and TODOs

### Audit Results:
- **`TODO` / `FIXME` / `XXX` in Source Code:** **0 occurrences** in `src/` (all previous TODOs in `site.ts`, `projects.ts`, and `skills.ts` were eliminated).
- **Placeholder Values in Content:**
  - **Images:** `campus-ims.webp` and `mediguard-ai.webp` are confirmed Lorem Picsum placeholder downloads (`CREDITS.md:47`). `career-compass.svg` is an SVG placeholder graphic.
  - **Project Links:** `retinai` (DR Detection), `campus-ims`, `mediguard-ai`, and `career-compass` live demo links point to github repositories rather than live hosted deployments.
  - **Personal Details:** Verified accurate against `Resume___.pdf`: S Devesh, Rajalakshmi Institute of Technology (CGPA 7.95, 2024–2028), `deveshdhanush73@gmail.com`, `+91-9391329177`.

---

## 4. Unused or Unwanted Files Classification

### A. Public Assets
| File Path | Size | Evidence | Recommendation |
| :--- | :--- | :--- | :--- |
| `public/models/gaming_computer.glb` | 766.3 MB | Unoptimized original. Code loads `gaming_computer.opt.glb` (2.9 MB) in `GamingPC.jsx:4`. | **DELETE** |
| `public/models/curved_monitor.glb` | 45.8 KB | Unoptimized original. Code loads `curved_monitor.opt.glb` (4.8 KB) in `CurvedMonitor.jsx:4`. | **DELETE** |
| `public/paper.webp` | 391.5 KB | Unreferenced in code (`SketchMaterial.jsx` uses procedural GLSL noise). Duplicate of `textures/paper.webp`. | **DELETE** |
| `public/textures/paper.webp` | 391.5 KB | Unreferenced in code. Duplicate of `public/paper.webp`. | **DELETE** |
| `public/draco/gltf/*` (3 files) | 745.5 KB | Redundant duplicate folder. Active code sets `DRACO_PATH = '/draco/'` (using `public/draco/`). | **DELETE** |
| `public/Resume___.pdf` | 109.7 KB | Duplicate resume file. Main site links `resume.pdf`. | **DELETE** |
| `public/fonts/helvetiker_bold.typeface.json` | 60.2 KB | Unreferenced in code. (3D text in `WelcomeApp` uses standard fonts). | **ARCHIVE** |

### B. Old Unlinked 3D Logo Scene (`/projects` route)
*Note: In `src/App.tsx:26-27`, this route is flagged as "Keep existing /projects logo-scene route working but UNLINKED". If you wish to retire this legacy scene in favor of the current unified `PixelStage` projects section, these 9 files can be removed:*

| File Path | Size | Evidence | Recommendation |
| :--- | :--- | :--- | :--- |
| `src/pages/Projects.tsx` | 2.5 KB | Reachable only via unlinked `/projects` route. | **ARCHIVE** or **DELETE** |
| `src/scenes/Projects/ProjectsScene.tsx` | 4.8 KB | Used only by `pages/Projects.tsx`. | **ARCHIVE** or **DELETE** |
| `src/scenes/Projects/CameraRig.tsx` | 16.5 KB | Used only by `ProjectsScene.tsx`. Contains Leva GUI. | **ARCHIVE** or **DELETE** |
| `src/scenes/Projects/LogoTile.tsx` | 2.1 KB | Used only by `ProjectsScene.tsx`. | **ARCHIVE** or **DELETE** |
| `src/scenes/Projects/Space.tsx` | 2.0 KB | Used only by `ProjectsScene.tsx`. | **ARCHIVE** or **DELETE** |
| `src/scenes/Projects/useLogoTexture.ts` | 1.8 KB | Used only by `ProjectsScene.tsx`. | **ARCHIVE** or **DELETE** |
| `src/scenes/Projects/camera-settings.json` | 1.2 KB | Used only by `Projects/CameraRig.tsx`. | **ARCHIVE** or **DELETE** |
| `src/ui/ProjectsOverlay.tsx` | 2.6 KB | Used only by `pages/Projects.tsx`. | **ARCHIVE** or **DELETE** |
| `src/config/logos.ts` | 2.1 KB | Used only by `ProjectsScene.tsx` and `useLogoTexture.ts`. | **ARCHIVE** or **DELETE** |

### C. Temporary Scratch Scripts & Images
| Folder / Pattern | Count | Size | Evidence | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `scratch/*` | 92 files | ~15 MB | Temporary Playwright, CDP, analysis, and QA inspection scripts created during development. | **DELETE** |

---

## 5. Dependencies Audit

### Unused Runtime Dependencies
- **`react-icons`** (`^5.7.0`): 0 imports found in `src/`. Recommendation: **REMOVE** from `package.json`.

### Misgrouped Dependencies
- **`@types/three`** (`^0.186.0`): Placed in `dependencies`. Recommendation: **MOVE** to `devDependencies`.

### Heavy Dev Tooling in Production Bundle
- **`leva`** (`^0.10.1`): Placed in `dependencies`. Used in `Welcome/App.jsx`, `Welcome/CameraRig.jsx`, and `Welcome/useSketchControls.js`.
  - Statically imported into the Welcome scene bundle, increasing client bundle size.
  - Recommendation: Lazy-load Leva only when `?dev=1` is in the URL, or move to `devDependencies` and strip during production builds.

### Unused DevDependencies
- **`@gltf-transform/cli`**, `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`: Used only in offline CLI scripts. Recommendation: **KEEP** in `devDependencies` if running model optimization scripts, or **REMOVE** if model pipeline is finished.

---

## 6. Asset Problems

1. **Oversized Images (>300 KB):**
   - `src/assets/about-portrait.png`: **530.5 KB** (can be converted to WebP ~60 KB with zero visible loss).
   - `src/assets/projects/hireconnect-1.png`: **414.4 KB** (can be WebP ~75 KB).
   - `src/assets/projects/cashpilot-1.png`: **374.8 KB** (can be WebP ~70 KB).
2. **Oversized 3D Models (>3 MB):**
   - `public/models/gaming_computer.glb`: **766.3 MB** (unoptimized; should be removed from `public/`).
3. **Placeholder Images Needing Real Screenshots:**
   - `src/assets/projects/campus-ims.webp` (Lorem Picsum placeholder).
   - `src/assets/projects/mediguard-ai.webp` (Lorem Picsum placeholder).
   - `src/assets/projects/career-compass.svg` (Generic SVG graphic placeholder).
4. **Missing Assets:**
   - Social preview image (`og:image`, 1200x630 png).
   - Favicon link in HTML head.

---

## 7. Credits and Licenses

1. **Active 3D Models & Credits:**
   - Curved Monitor: Arnau Rocher Alcayde [CC-BY-4.0] — **Credited** in `CREDITS.md`.
   - Gaming Computer: Marcseus [CC-BY-4.0] — **Credited** in `CREDITS.md`.
   - Keyboard (`keyboard.opt.glb`): **MISSING** author/license credit in `CREDITS.md`.
   - Mouse (`mouse.opt.glb`): **MISSING** author/license credit in `CREDITS.md`.
2. **Stale Credits:**
   - Stale reference in `CREDITS.md:43` to `/projects` tool logos.
   - Mention of Lorem Picsum images in `CREDITS.md:47` can be cleaned once real screenshots are placed.
3. **Repository License:**
   - Currently no `LICENSE` file. Needs a choice from the owner (e.g. MIT, or proprietary "All Rights Reserved").

---

## 8. Code Quality and Security

### Code Quality Breakdown
- **TypeScript `any` usages:** 48 occurrences (predominantly in GSAP ScrollTrigger event bindings and Three.js dynamic uniform updates in `PixelStage.tsx`).
- **`@ts-ignore` / `@ts-nocheck`:** 0.
- **Untyped `.jsx` / `.js` files:** 19 files under `src/scenes/Welcome/` bypass strict typing via `allowJs`.
- **Active `console.log` statements:** 8 occurrences (including autocapture test hooks in `Home.tsx`).
- **Accessibility:**
  - One `<img>` tag in `src/pages/About.tsx` was flagged for missing/incomplete `alt`.
  - Buttons across `FullscreenToggle` and `SiteNav` have appropriate titles/labels.
  - `prefers-reduced-motion` is respected at the root in `Home.tsx` by providing an instant-complete static view bypassing 3D animations.

### Security Audit
- **API Keys / Secrets:** **0 secrets found** in code or git history.
- **Personal Information:** Personal contact details verified: email `deveshdhanush73@gmail.com` and phone `+91-9391329177` (both are intentional for a portfolio contact section).
- **Vulnerabilities (`npm audit`):** 4 moderate severity transitive issues in `@gltf-transform/cli` via `glob`/`minimatch`. 0 production runtime vulnerabilities.

---

## 9. Build, Runtime and Performance Numbers

### Production Build
- **Build Command:** `npm run build` (`tsc -b && vite build`)
- **Status:** **PASS** (1.51s, 0 errors)
- **Output Chunks:**
  - `dist/assets/SiteNav-Bkw3c18j.js`: **1,212.92 kB** (gzip: 345.99 kB) — *Flags Vite >500 kB chunk warning*
  - `dist/assets/Home-B9mav-dq.js`: **402.06 kB** (gzip: 125.19 kB)
  - `dist/assets/index-BaqMB4nl.js`: **264.09 kB** (gzip: 83.91 kB)
  - `dist/assets/Projects-OAundI1y.js`: **88.35 kB** (gzip: 31.00 kB)
  - CSS chunks total: ~110 kB (gzip: ~22 kB)

### Runtime & Browser Verification
- **Routes & Redirects:** All 14 routes/anchors (`/`, `/#about`, `/#skills`, `/#hackathons`, `/#projects`, `/#achievements`, `/#contact`, `/about`, `/skills`, etc.) verified working with 0 404s.
- **Horizontal Scrollbar / Overflow:**
  - `1920x1080` (Desktop): **0px overflow** (PASS)
  - `1366x768` (Laptop): **0px overflow** (PASS)
  - `390x844` (Mobile): **0px overflow** (PASS)
- **Welcome Scene FPS:** ~142 FPS capability (frame time 7.05 ms, capped by refresh rate to 60–120 FPS).
- **Lighthouse Scores (Mobile Profile):**
  - **Accessibility:** **93 / 100**
  - **Best Practices:** **96 / 100**
  - **SEO:** **83 / 100**
  - **Performance:** **38 / 100** (dragged down by initial WebGL/GLB parsing on simulated mobile 4G throttle; CLS is 0, FCP is 0.8s).

---

## 10. Suggested Fixes in Priority Order

1. **Delete 766 MB raw GLB from `public/models/`** (`gaming_computer.glb`) and duplicate unreferenced paper textures (`public/paper.webp` and `public/textures/paper.webp`).
2. **Add `index.html` essentials:** meta description, theme color, Open Graph tags, and link `favicon.svg`.
3. **Remove `react-icons`** from `package.json` and move `@types/three` to `devDependencies`.
4. **Delete or archive the legacy unlinked `/projects` logo scene** (9 files) to simplify architecture.
5. **Clean up `scratch/` directory** (92 temporary debug scripts and screenshots).
6. **Add `robots.txt` and `typecheck` script** in `package.json`.
7. **Optimize oversized images** (`about-portrait.png`, `hireconnect-1.png`, `cashpilot-1.png`) to WebP to boost Lighthouse Performance.
8. **Add missing credits** in `CREDITS.md` for keyboard and mouse CC-BY models.

