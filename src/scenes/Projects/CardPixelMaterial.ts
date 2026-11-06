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
  uniform float uResolution;
  uniform float uProgress;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uFlickerStep;
  uniform float uAspect;

  varying vec2 vUv;

  // Deterministic 2D PRNG
  float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;

    if (uResolution < 256.0) {
      // 1. Quantize coordinates to discrete pixel blocks
      vec2 gridSize = vec2(uResolution, uResolution / uAspect);
      vec2 blockId = floor(uv * gridSize);
      vec2 blockUv = (blockId + 0.5) / gridSize;

      // Sample texture at quantized pixel center
      vec4 texColor = texture2D(map, blockUv);

      // 2. Retro pixel cell border (L-edge highlight for tactile square pixels)
      vec2 cellUv = fract(uv * gridSize);
      float cellBorder = step(0.06, cellUv.x) * step(cellUv.x, 0.94) *
                         step(0.06, cellUv.y) * step(cellUv.y, 0.94);

      // 3. Cyber cyan/ink-blue edge tint (#2fd0ff -> #8fc4ff)
      vec3 cyberTint = mix(vec3(0.18, 0.82, 1.0), texColor.rgb, 0.65);
      vec3 finalRgb = mix(cyberTint, texColor.rgb, uProgress) * uBrightness;

      // 4. Deterministic pixel decode assembly:
      // individual blocks materialize and snap into place
      float blockH = hash2(blockId + vec2(uFlickerStep * 0.05, 1.71));
      float blockActive = step(blockH * 0.40, uProgress + 0.15);

      // Add slight pixel grid contrast
      finalRgb *= (0.82 + 0.18 * cellBorder);

      gl_FragColor = vec4(finalRgb, uOpacity * blockActive);
    } else {
      // High-resolution crisp rendering at focus moment
      vec4 texColor = texture2D(map, uv);
      vec3 rgb = texColor.rgb * uBrightness;

      // Subtle cyber corner tick marks (#8fc4ff)
      float edgeX = min(uv.x, 1.0 - uv.x);
      float edgeY = min(uv.y, 1.0 - uv.y);
      float isCorner = (step(edgeX, 0.035) * step(edgeY, 0.055)) +
                       (step(edgeX, 0.055) * step(edgeY, 0.035));

      if (isCorner > 0.0) {
        rgb = mix(rgb, vec3(0.56, 0.77, 1.0), 0.50 + 0.50 * uHover);
      }

      // Outer rim highlight on hover
      if (uHover > 0.01) {
        float isBorder = step(edgeX, 0.012) + step(edgeY, 0.018);
        if (isBorder > 0.0) {
          rgb = mix(rgb, vec3(0.18, 0.82, 1.0), 0.75 * uHover);
        }
      }

      gl_FragColor = vec4(rgb, uOpacity);
    }
  }
`

export function createCardPixelMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      uResolution: { value: 16.0 },
      uProgress: { value: 0.0 },
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
