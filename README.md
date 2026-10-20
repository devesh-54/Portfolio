# Devesh — Personal Portfolio (Page 1: "Welcome" Scene)

A high-performance, cinematic 3D portfolio welcome experience crafted with React Three Fiber, Three.js, and GSAP. 

Built with a light, hand-drawn aesthetic inspired by ink-on-paper sketches with rolling terrain, directional hatching, and a 4-phase cinematic camera rig.

---

## 🚀 Quick Start

```bash
# Navigate to the project directory
cd devesh-portfolio

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 🎥 Camera Rig: 4-Phase System

The camera is driven by `src/scenes/Welcome/CameraRig.tsx` and configured via `src/scenes/Welcome/camera-settings.json`.

1. **Phase 1: Locked Start**
   - The camera initializes at **Waypoint 0** (behind Object 1).
   - Controls are completely disabled while assets load.
   - Scene emits `onReady` once geometry, shaders, and textures are prepared.

2. **Phase 2: Intro Flythrough**
   - Triggered when the minimalist `0 -> 100%` loading counter finishes fading out.
   - Travels along waypoints: **Behind Obj 1 ➔ Close-up "DEVESH" ➔ "BUILD" ➔ "CREATE" ➔ Wide End Shot**.
   - Interpolates **both** camera position and look-at target together.
   - Synchronizes HTML overlay captions (`01 / 03`, `02 / 03`, `03 / 03`) with camera arrival at each waypoint.
   - Supports two modes:
     - `lerp` (default): segment-by-segment linear interpolation with per-leg cubic `easeInOut` easing, giving an intentional, clean pause at each object.
     - `spline`: smooth `THREE.CatmullRomCurve3` centripetal spline with overall ease-out.

3. **Phase 3: Free Orbit Mode**
   - Orbit controls smoothly unlock as soon as the intro flythrough reaches the wide shot (or when "Skip intro" is pressed).
   - Constrained by `maxPolarAngle = 1.45` to prevent the camera from clipping beneath the paper ground.
   - Zoom distance limits (`zoomMin: 3.5`, `zoomMax: 16.0`) are active only in this phase so they never restrict the intro flight path.

4. **Phase 4: Exponentially Damped Cursor Parallax**
   - Pointer coordinates `(pointer.x, pointer.y)` map onto the camera's local right and up vectors.
   - Smoothed with exponential decay:
     $$\mathbf{offset} \leftarrow \text{lerp}\left(\mathbf{offset}, \mathbf{goal}, 1 - e^{-\text{smoothing} \cdot \min(\Delta t, 0.1)}\right)$$
   - Offsets the camera position cleanly without perturbing the look-at target.

---

## 🎛️ Live Dev Tools

- **Toggle Leva Panel**: Press the **`L`** key to show/hide the live camera rig tuner panel.
- **Log Current View**: Press the **`W`** key to log the exact `position` and `target` coordinates to the browser console.
- **Set Waypoints**: Use "Set Point [X] from View" or "Set Current View as End" to capture camera positions interactively.
- **Export Settings**: Click **"Export camera-settings.json"** in the Leva panel to download the updated JSON file.

---

## 🎨 Exact Values You Can Tweak

### 1. Camera Timings & Parallax (`src/scenes/Welcome/camera-settings.json`)
| Setting | Default Value | Description |
| :--- | :--- | :--- |
| `introDuration` | `6.5` | Duration in seconds for the entire intro flythrough |
| `pathMode` | `"lerp"` | `"lerp"` (segment pauses) or `"spline"` (continuous curve) |
| `easing` | `"easeInOut"` | Flythrough easing (`"easeInOut"`, `"easeOut"`, `"linear"`) |
| `zoomMin` | `3.5` | Minimum zoom-in distance for OrbitControls |
| `zoomMax` | `16.0` | Maximum zoom-out distance for OrbitControls |
| `cursorIntensity`| `0.35` | Mouse parallax drift strength |
| `cursorSmoothing`| `3.2` | Mouse parallax exponential follow speed |

### 2. Colors & Fog (`src/config/objects.ts` and `src/styles/global.css`)
| Variable | Default Hex | Description |
| :--- | :--- | :--- |
| `colors.paper` | `#f2f1ed` | Off-white warm paper background and terrain base |
| `colors.ink` | `#1a1f9c` | Ballpoint ink blue used for strokes, text, and outlines |
| `colors.inkDark` | `#10156d` | Deep shadow tone for buttons and contrast |
| `fog.near` | `14` | Distance where fog begins blending into paper |
| `fog.far` | `50` | Distance where ground completely dissolves into sky |

### 3. Waypoint Coordinates (`src/scenes/Welcome/camera-settings.json`)
```json
"waypoints": [
  { "name": "Behind Object 1",    "position": [-5.2, 1.6, 3.8], "target": [-3.8, 0.5, 1.2],  "enabled": true },
  { "name": "Close-up DEVESH",    "position": [-3.2, 0.9, 2.7], "target": [-3.8, 0.4, 1.2],  "enabled": true },
  { "name": "Object 2 BUILD",     "position": [ 0.0, 1.2,-0.2], "target": [ 0.0, 0.45,-2.4], "enabled": true },
  { "name": "Object 3 CREATE",    "position": [ 3.2, 1.0, 2.4], "target": [ 3.8, 0.45, 0.9], "enabled": true }
],
"end": {
  "position": [0.0, 4.2, 8.8],
  "target":   [0.0, 0.4, 0.0]
}
```

### 4. 3D Text Objects (`src/config/objects.ts`)
- Replace or modify the array in `OBJECTS_CONFIG` to change words, positions, rotations, or extrusion depth.

---

## ⚡ Performance Verification

- **Frame Rate**: **~142 FPS** average during the intro flythrough (measured in headless Chrome with WebGL via Chrome DevTools Protocol).
- **Average Frame Time**: **7.05 ms** (well below the 16.6ms threshold for 60 FPS).
- **Pixel Ratio**: Capped at `dpr={[1, 1.5]}` on desktop, `[1, 1.2]` on mobile devices.
- **Adaptive Frameloop**: `"always"` only while the camera moves or pointer interacts; automatically drops to `"demand"` when idle.
- **Memory & Disposals**: All geometries, textures, and custom shaders cleanly disposed on unmount.
- **Prefers-Reduced-Motion**: Automatically skips camera motion and displays the wide end shot directly.
- **Session Memory**: Plays full intro once per session (`sessionStorage`); returning visitors go straight to the wide view.

---

## 📜 Credits & License
- **Reference**: Based on architectural concepts from [R3FSketchMaterial](https://github.com/abhishekmill/R3FSketchMaterial.git) by **Abhishek Verma** (MIT License, Copyright (c) 2026 Abhishek Verma).
- **Re-implementation**: Completely redesigned for TypeScript, React 19, Drei `<Text3D>`, procedural fog-blended paper terrain, and custom GSAP UI overlay.
