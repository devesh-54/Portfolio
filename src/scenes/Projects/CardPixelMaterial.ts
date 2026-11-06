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
  uniform float uBandWidth;    // width of the sweeping pixel wave
  uniform float uResolution;   // pixel block density
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

    // Diagonal wave sweep from bottom-left (0,0) to top-right (1,1)
    // Angle ~ 37 deg: cos ~ 0.8, sin ~ 0.6
    float dRaw = uv.x * 0.80 + uv.y * 0.60;
    float dWave = dRaw / 1.40; // Normalized [0, 1] across the card surface

    // Wave travels from 0.0 to 1.0 + bandW
    float bandW = uBandWidth;
    float edge = mix(0.0, 1.0 + bandW, uWaveProgress);

    if (uWaveProgress >= 0.999 || dWave <= edge - bandW) {
      // -------------------------------------------------------------
      // 1. BEHIND THE WAVE: The wave has passed!
      // Shows the crisp, true high-resolution picture of the project.
      // -------------------------------------------------------------
      vec4 texColor = texture2D(map, uv);
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

    } else if (uWaveProgress > 0.001 && dWave <= edge) {
      // -------------------------------------------------------------
      // 2. THE WAVE ITSELF: Glowing retro square pixel band
      // -------------------------------------------------------------
      vec2 gridSize = vec2(uResolution, uResolution / uAspect);
      vec2 blockId = floor(uv * gridSize);
      vec2 blockUv = (blockId + 0.5) / gridSize;

      vec4 blockTex = texture2D(map, blockUv);

      // Pixel cell border outline
      vec2 cellUv = fract(uv * gridSize);
      float cellBorder = step(0.07, cellUv.x) * step(cellUv.x, 0.93) *
                         step(0.07, cellUv.y) * step(cellUv.y, 0.93);

      // Position within the wave band: 0 at rear, 1 at front edge
      float bandT = (dWave - (edge - bandW)) / bandW;

      // Leading edge has a white-hot / cyan glowing cyber crest
      vec3 cyberEdge = mix(vec3(0.18, 0.82, 1.0), vec3(1.0, 1.0, 1.0), step(0.80, bandT));

      // Block color: blend of project color and cyber highlight
      vec3 blockRgb = mix(blockTex.rgb, cyberEdge, 0.50 + 0.50 * bandT) * uBrightness;
      blockRgb *= (0.80 + 0.20 * cellBorder);

      // Deterministic pixel spark flicker
      float spark = hash2(blockId + vec2(uFlickerStep * 0.05, 3.14));
      float blockAlpha = step(spark * 0.25, 1.0 - bandT * 0.35);

      gl_FragColor = vec4(blockRgb, uOpacity * blockAlpha);

    } else {
      // -------------------------------------------------------------
      // 3. AHEAD OF THE WAVE: Digital placeholder / veiled state
      // -------------------------------------------------------------
      // Subtle dark cyber blueprint block ahead of the wave
      vec2 gridSize = vec2(uResolution * 0.5, (uResolution * 0.5) / uAspect);
      vec2 cellUv = fract(uv * gridSize);
      float gridLine = step(0.05, cellUv.x) * step(cellUv.x, 0.95) *
                       step(0.05, cellUv.y) * step(cellUv.y, 0.95);

      // Dark veiled color (deep void ink #081026)
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
      uBandWidth: { value: 0.22 },
      uResolution: { value: 32.0 },
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
