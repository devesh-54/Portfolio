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
  uniform float uWaveProgress; // 0.0 (veiled) -> 1.0 (complete project)
  uniform float uResolution;   // pixel block density (~24.0 rows for chunky square pixels)
  uniform float uBrightness;   // depth brightness
  uniform float uOpacity;      // total card opacity
  uniform float uHover;        // hover pop
  uniform float uFlickerStep;  // discrete step
  uniform float uAspect;       // 1.5 aspect ratio

  varying vec2 vUv;

  // Deterministic 2D PRNG
  float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;

    // Grid size: chunky square pixel size (24 rows: chunky & clear, not too big)
    vec2 gridSize = vec2(round(uResolution * uAspect), uResolution);
    vec2 blockId = floor(uv * gridSize);
    vec2 blockUv = (blockId + 0.5) / gridSize;

    // Left-to-right wipe across the card (matching the video)
    float d = blockUv.x;

    // Wave travels from before left edge to past right edge
    float edge = mix(-0.14, 1.14, uWaveProgress);

    // Row jitter and cell scatter noise matching Graham Mast After Effects pixel wipe
    float flicker = uFlickerStep;
    float rowJitter = (hash2(vec2(blockId.y, flicker * 0.04)) - 0.5) * 0.12;
    float cellNoise = (hash2(blockId + vec2(flicker * 0.04, 3.14)) - 0.5) * 0.15;
    float val = (d - (edge + rowJitter)) + cellNoise;

    if (uWaveProgress >= 0.999 || val <= 0.0) {
      // -------------------------------------------------------------
      // 1. BEHIND THE WAVE: Revealed project picture
      // -------------------------------------------------------------
      vec4 texColor;
      if (uWaveProgress < 0.98 && d > edge - 0.14) {
        // Square pixel block right at the wave transition front
        texColor = texture2D(map, blockUv);
        vec2 cellUv = fract(uv * gridSize);
        float border = step(0.05, cellUv.x) * step(cellUv.x, 0.95) *
                       step(0.05, cellUv.y) * step(cellUv.y, 0.95);
        texColor.rgb *= (0.85 + 0.15 * border);
      } else {
        // 100% crisp high-resolution project image
        texColor = texture2D(map, uv);
      }

      vec3 rgb = texColor.rgb * uBrightness;

      // Subtle cyber corner tick marks (#101A91 / #2fd0ff)
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

      gl_FragColor = vec4(rgb, uOpacity);

    } else {
      // -------------------------------------------------------------
      // 2. AHEAD OF THE WAVE: Digital placeholder / veiled state
      // -------------------------------------------------------------
      vec2 cellUv = fract(uv * gridSize);
      float gridLine = step(0.05, cellUv.x) * step(cellUv.x, 0.95) *
                       step(0.05, cellUv.y) * step(cellUv.y, 0.95);

      vec3 veiledRgb = vec3(0.03, 0.06, 0.15) * (0.85 + 0.15 * gridLine) * uBrightness;
      gl_FragColor = vec4(veiledRgb, uOpacity * 0.92);
    }
  }
`

export function createCardPixelMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      uWaveProgress: { value: 0.0 },
      uResolution: { value: 24.0 },
      uBrightness: { value: 1.0 },
      uOpacity: { value: 0.0 },
      uHover: { value: 0.0 },
      uFlickerStep: { value: 0.0 },
      uAspect: { value: 1.5 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  })
}
