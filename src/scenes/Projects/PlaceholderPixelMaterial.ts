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
  uniform float uWaveProgress; // 0.0 (dormant deep black) -> 1.0 (illuminated cyber matrix)
  uniform float uResolution;   // pixel block density (~24.0 rows for chunky square pixels)
  uniform float uBrightness;   // depth brightness
  uniform float uOpacity;      // total card opacity
  uniform float uFlickerStep;  // discrete step tied to scroll
  uniform float uAspect;       // card width / height
  uniform float uSeed;         // unique per-card deterministic seed

  varying vec2 vUv;

  // Deterministic 2D PRNG
  float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;

    // Grid size: chunky square pixel size (matching the projects' calibrated pixel size)
    vec2 gridSize = vec2(round(uResolution * uAspect), uResolution);
    vec2 blockId = floor(uv * gridSize);
    vec2 blockUv = (blockId + 0.5) / gridSize;

    // Left-to-right wipe across the placeholder face
    float d = blockUv.x;

    // Wave travels from before left edge to past right edge
    float edge = mix(-0.15, 1.15, uWaveProgress);

    // Row jitter and cell scatter noise matching Graham Mast After Effects wipe
    float flicker = uFlickerStep;
    float rowJitter = (hash2(vec2(blockId.y + uSeed * 13.7, flicker * 0.04)) - 0.5) * 0.12;
    float cellNoise = (hash2(blockId + vec2(flicker * 0.04 + uSeed * 5.3, 7.13)) - 0.5) * 0.15;
    float val = (d - (edge + rowJitter)) + cellNoise;

    vec2 cellUv = fract(uv * gridSize);
    float border = step(0.05, cellUv.x) * step(cellUv.x, 0.95) *
                   step(0.05, cellUv.y) * step(cellUv.y, 0.95);

    vec3 rgb;

    if (uWaveProgress >= 0.999 || val <= 0.0) {
      // -------------------------------------------------------------
      // 1. BEHIND THE WAVE: Illuminated technical cyber blueprint on pure black
      // -------------------------------------------------------------
      vec4 texColor;
      if (uWaveProgress < 0.96 && d > edge - 0.14) {
        // Square pixel block right at the wave transition front
        texColor = texture2D(map, blockUv);
        // Bright cyan & white electrical spark accents right on the wave edge
        float spark = hash2(blockId + vec2(flicker * 0.08 + uSeed, 17.2));
        if (spark > 0.70) {
          texColor.rgb = mix(texColor.rgb, vec3(0.18, 0.82, 1.0), 0.75); // Electric cyan #2fd0ff
        } else if (spark > 0.55) {
          texColor.rgb = mix(texColor.rgb, vec3(1.0, 1.0, 1.0), 0.90);   // White core
        }
        texColor.rgb *= (0.85 + 0.15 * border);
      } else {
        // High-contrast illuminated blueprint on pure black
        texColor = texture2D(map, uv);
      }

      rgb = texColor.rgb;

      // Electric cyan corner brackets (#2fd0ff)
      float edgeX = min(uv.x, 1.0 - uv.x);
      float edgeY = min(uv.y, 1.0 - uv.y);
      float isCorner = (step(edgeX, 0.04) * step(edgeY, 0.06)) +
                       (step(edgeX, 0.06) * step(edgeY, 0.04));
      if (isCorner > 0.0) {
        rgb = mix(rgb, vec3(0.18, 0.82, 1.0), 0.65);
      }

    } else {
      // -------------------------------------------------------------
      // 2. AHEAD OF THE WAVE: Deep OLED black with subtle dormant grid & sparks
      // -------------------------------------------------------------
      vec3 darkBase = vec3(0.005, 0.008, 0.015); // Deep jet black

      // Faint dormant technical grid line
      float dormantGrid = step(0.04, cellUv.x) * step(cellUv.x, 0.96) *
                          step(0.04, cellUv.y) * step(cellUv.y, 0.96);
      darkBase += vec3(0.01, 0.02, 0.04) * (1.0 - dormantGrid);

      // Digital sparks leaping ahead of the incoming wave front
      float sparkAhead = hash2(blockId + vec2(flicker * 0.06 + uSeed * 3.1, 41.7));
      if (d < edge + 0.16 && sparkAhead > 0.80) {
        darkBase = mix(darkBase, vec3(0.18, 0.82, 1.0), 0.70);
      } else if (sparkAhead > 0.97) {
        // Ambient subtle cyber twinkle across distance
        darkBase = mix(darkBase, vec3(0.30, 0.60, 1.0), 0.40);
      }

      // Faint dormant corner tick marks
      float edgeX = min(uv.x, 1.0 - uv.x);
      float edgeY = min(uv.y, 1.0 - uv.y);
      float isCorner = (step(edgeX, 0.035) * step(edgeY, 0.055)) +
                       (step(edgeX, 0.055) * step(edgeY, 0.035));
      if (isCorner > 0.0) {
        darkBase = mix(darkBase, vec3(0.10, 0.25, 0.50), 0.55);
      }

      rgb = darkBase;
    }

    gl_FragColor = vec4(rgb * uBrightness, uOpacity);
  }
`

export function createPlaceholderPixelMaterial(
  texture: THREE.Texture,
  seed = 0,
  aspect = 1.5,
  resolution = 22.0
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      uWaveProgress: { value: 0.0 },
      uResolution: { value: resolution },
      uBrightness: { value: 1.0 },
      uOpacity: { value: 0.0 },
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
