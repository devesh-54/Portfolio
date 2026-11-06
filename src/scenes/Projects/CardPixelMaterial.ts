import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float uWaveProgress; // 0.0 (veiled deep black) -> 1.0 (complete project)
  uniform float uResolution;   // pixel block density (~20.0 rows for chunky square pixels)
  uniform float uBrightness;   // depth brightness
  uniform float uOpacity;      // total card opacity
  uniform float uHover;        // hover pop
  uniform float uFlickerStep;  // discrete step
  uniform float uAspect;       // 1.5 aspect ratio
  uniform float uSeed;         // unique deterministic seed

  varying vec2 vUv;

  // Deterministic 2D PRNG
  float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;

    // Grid size: chunky square pixel size (matching placeholders exactly)
    vec2 gridSize = vec2(round(uResolution * uAspect), uResolution);
    vec2 blockId = floor(uv * gridSize);
    vec2 blockUv = (blockId + 0.5) / gridSize;

    // Left-to-right wipe across the card face (matching Graham Mast After Effects wave)
    float d = blockUv.x;

    // Wave travels from before left edge to past right edge
    float edge = mix(-0.15, 1.15, uWaveProgress);

    // Row jitter and cell scatter noise
    float flicker = uFlickerStep;
    float rowJitter = (hash2(vec2(blockId.y + uSeed * 13.7, flicker * 0.04)) - 0.5) * 0.12;
    float cellNoise = (hash2(blockId + vec2(flicker * 0.04 + uSeed * 5.3, 3.14)) - 0.5) * 0.15;
    float val = (d - (edge + rowJitter)) + cellNoise;

    vec2 cellUv = fract(uv * gridSize);
    float border = step(0.05, cellUv.x) * step(cellUv.x, 0.95) *
                   step(0.05, cellUv.y) * step(cellUv.y, 0.95);

    vec3 rgb;

    if (uWaveProgress >= 0.999 || val <= 0.0) {
      // -------------------------------------------------------------
      // 1. BEHIND THE WAVE: Revealed project picture with electric cyan/white wave front
      // -------------------------------------------------------------
      vec4 texColor;
      if (uWaveProgress < 0.98 && d > edge - 0.14) {
        // Chunky square pixel blocks right at the wave transition front
        texColor = texture2D(map, blockUv);

        // Bright cyan & pure white electrical spark accents right on wave front (identical to placeholders)
        float spark = hash2(blockId + vec2(flicker * 0.08 + uSeed, 17.2));
        if (spark > 0.70) {
          texColor.rgb = mix(texColor.rgb, vec3(0.18, 0.82, 1.0), 0.75); // Electric cyan #2fd0ff
        } else if (spark > 0.55) {
          texColor.rgb = mix(texColor.rgb, vec3(1.0, 1.0, 1.0), 0.90);   // White core
        }
        texColor.rgb *= (0.85 + 0.15 * border);
      } else {
        // 100% crisp high-resolution project image
        texColor = texture2D(map, uv);
      }

      rgb = texColor.rgb;

      // Subtle cyber corner tick marks (#2fd0ff)
      float edgeX = min(uv.x, 1.0 - uv.x);
      float edgeY = min(uv.y, 1.0 - uv.y);
      float isCorner = (step(edgeX, 0.035) * step(edgeY, 0.055)) +
                       (step(edgeX, 0.055) * step(edgeY, 0.035));

      if (isCorner > 0.0) {
        rgb = mix(rgb, vec3(0.18, 0.82, 1.0), 0.50 + 0.50 * uHover);
      }

      if (uHover > 0.01) {
        float isBorder = step(edgeX, 0.012) + step(edgeY, 0.018);
        if (isBorder > 0.0) {
          rgb = mix(rgb, vec3(0.06, 0.10, 0.57), 0.70 * uHover);
        }
      }

    } else {
      // -------------------------------------------------------------
      // 2. AHEAD OF THE WAVE: Deep OLED black matching placeholders 1:1
      // -------------------------------------------------------------
      vec3 darkBase = vec3(0.0, 0.0, 0.0); // Exact same solid jet black as placeholders

      // Faint dormant technical grid lines matching placeholders
      float dormantGrid = step(0.04, cellUv.x) * step(cellUv.x, 0.96) *
                          step(0.04, cellUv.y) * step(cellUv.y, 0.96);
      darkBase += vec3(0.015, 0.025, 0.045) * (1.0 - dormantGrid);

      // Digital sparks ONLY right ahead of an active moving wave
      if (uWaveProgress > 0.01 && uWaveProgress < 0.98 && d < edge + 0.16 && d >= edge) {
        float sparkAhead = hash2(blockId + vec2(flicker * 0.06 + uSeed * 3.1, 41.7));
        if (sparkAhead > 0.80) {
          darkBase = mix(darkBase, vec3(0.18, 0.82, 1.0), 0.70);
        } else if (sparkAhead > 0.60) {
          darkBase = mix(darkBase, vec3(0.30, 0.60, 1.0), 0.40);
        }
      }

      // Faint dormant corner tick marks
      float edgeX = min(uv.x, 1.0 - uv.x);
      float edgeY = min(uv.y, 1.0 - uv.y);
      float isCorner = (step(edgeX, 0.035) * step(edgeY, 0.055)) +
                       (step(edgeX, 0.055) * step(edgeY, 0.035));
      if (isCorner > 0.0) {
        darkBase = mix(darkBase, vec3(0.18, 0.82, 1.0), 0.65);
      }

      rgb = darkBase;
    }

    gl_FragColor = vec4(rgb * uBrightness, uOpacity);
  }
`

export function createCardPixelMaterial(
  texture: THREE.Texture,
  seed = 0,
  aspect = 1.5,
  resolution = 20.0
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      uWaveProgress: { value: 0.0 },
      uResolution: { value: resolution },
      uBrightness: { value: 1.0 },
      uOpacity: { value: 0.0 },
      uHover: { value: 0.0 },
      uFlickerStep: { value: 0.0 },
      uAspect: { value: aspect },
      uSeed: { value: seed },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  })
}
