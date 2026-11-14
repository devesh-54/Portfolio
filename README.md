# S Devesh — Personal Portfolio

A cinematic, high-performance personal portfolio built with React 19, Three.js, React Three Fiber, GSAP ScrollTrigger, and Lenis smooth scrolling.

Features a hand-drawn 3D welcome scene with directional hatching and procedural ink shaders, flowing seamlessly into a scroll-driven stage (`PixelStage`) showcasing biography, technical skills, hackathons, featured projects, achievements, and contact channels.

---

## 🛠️ Tech Stack

- **Framework & Bundler**: [Vite 8](https://vite.dev) + [React 19](https://react.dev) + [TypeScript 6](https://www.typescriptlang.org)
- **3D Graphics & Shaders**: [Three.js](https://threejs.org), [@react-three/fiber](https://r3f.docs.pmnd.rs), [@react-three/drei](https://github.com/pmndrs/drei)
- **Animation & Transitions**: [GSAP 3](https://greensock.com/gsap) (ScrollTrigger) + [Lenis](https://lenis.darkroom.engineering) smooth scroll
- **Styling**: Vanilla CSS with modern custom properties, dark obsidian palette, and light editorial accents
- **Linter**: [Oxlint](https://oxc.rs)

---

## 🚀 Quick Start

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`

### Installation & Development

```bash
# Clone the repository
git clone <repo-url>
cd devesh-portfolio

# Install dependencies
npm install

# Start local development server (Vite)
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🏛️ Architecture & Sections

The application is structured around a dual-layer experience:

1. **Pinned 3D Welcome Canvas (`src/scenes/Welcome/`)**
   - Procedural hand-drawn sketch material with cross-hatching, rim lighting, and paper tooth.
   - 3D workstation setup with optimized GLB assets (`curved_monitor.opt.glb`, `gaming_computer.opt.glb`, `keyboard.opt.glb`, `mouse.opt.glb`).
   - Cinematic 4-phase camera rig with exponential damping and mouse parallax.
   - Pinned screen dive transition that smoothly hands over control to the scroll container.

2. **Unified Scroll Stage (`src/sections/PixelStage.tsx`)**
   - **About**: Personal introduction, education at Rajalakshmi Institute of Technology, and interactive particle formation.
   - **Skills**: 3D floating armory conveyor featuring 25 categorized core competencies with SVG logos.
   - **Hackathons**: Interactive 4-quadrant storytelling showcase with animated expand/collapse mechanics.
   - **Selected Projects**: Editorial stream with project detail modals and deep-dive technical specs.
   - **Achievements**: Dual-card 3D flip display with dark elevation depth.
   - **Contact**: Clean monochrome communication terminal with direct links and copy-to-clipboard functionality.

3. **Motion & Accessibility**
   - Automatically detects `prefers-reduced-motion` to bypass heavy 3D camera animations and deliver an instant, accessible static layout.
   - Fully responsive across desktop (1920x1080), laptop (1366x768), and mobile (390x844) with zero horizontal overflow.

---

## 🚢 Deployment

### Vercel / Netlify (Static SPA)
Because this project is a Single Page Application (SPA) with client-side routing, configure your host to rewrite all routes to `/index.html`:

- **Vercel**: Deploy with the default Vite preset.
- **Netlify**: Ensure a `_redirects` rule `/*  /index.html  200` is present.

---

## 📜 Credits & Licensing

- 3D models, procedural shaders, and animation inspirations are credited in [CREDITS.md](./CREDITS.md).
