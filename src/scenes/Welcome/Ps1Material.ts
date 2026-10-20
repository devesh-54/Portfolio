import * as THREE from 'three'
import { PS1_CONFIG } from '../../config/ps1'

/**
 * Reusable PS1 Retro Console Shader Material
 *
 * Implements:
 * 1. Vertex Snapping (Jitter/Wobble): Quantizes screen clip coordinates to a coarse grid
 * 2. Affine Texture Warping: Disables perspective-correct UV interpolation
 * 3. 15-bit Color Quantization: Limits color channels to 32 discrete steps (5 bits per channel)
 * 4. 4x4 Bayer Matrix Ordered Dithering: Crosshatch color banding on surfaces only
 * 5. Lighting: Cool ambient + Warm directional key light
 * 6. Seamless Void Fog: Surface dithers, but blends into pure un-dithered fog color at distance >= fogFar
 * 7. Optional Vertex Colors: For per-vertex tinting (e.g., ground edge fade)
 */

const ps1VertexShader = /* glsl */ `
  uniform float uSnapEnabled;
  uniform vec2 uSnapResolution;
  uniform float uUseVertexColors;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec2 vAffineUv;
  varying float vAffineW;
  varying vec3 vVertexColor;

  attribute vec3 color;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);

    // Pass vertex colors through (default white if not using vertex colors)
    vVertexColor = uUseVertexColors > 0.5 ? color : vec3(1.0);

    vec4 clip = projectionMatrix * viewMatrix * worldPos;

    // PS1 Vertex Snapping: Emulate lack of floating-point polygon vertex hardware
    if (uSnapEnabled > 0.5) {
      vec3 ndc = clip.xyz / clip.w;
      ndc.xy = floor(ndc.xy * uSnapResolution) / uSnapResolution;
      clip.xyz = ndc * clip.w;
    }

    // Affine texture coordinate calculation:
    // Scale UV by w at vertices; in fragment shader, unscaled interpolation mimics affine warping
    vAffineUv = uv * clip.w;
    vAffineW = clip.w;

    gl_Position = clip;
  }
`

const ps1FragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform float uOpacity;
  uniform float uAffineEnabled;
  uniform float uDitherEnabled;
  uniform float uColorSteps;

  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uAmbientColor;

  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec2 vAffineUv;
  varying float vAffineW;
  varying vec3 vVertexColor;

  // 4x4 Bayer Matrix for ordered dithering
  float getBayerValue(vec2 coord) {
    int x = int(mod(coord.x, 4.0));
    int y = int(mod(coord.y, 4.0));
    
    if (y == 0) {
      if (x == 0) return 0.0 / 16.0;
      if (x == 1) return 8.0 / 16.0;
      if (x == 2) return 2.0 / 16.0;
      return 10.0 / 16.0;
    } else if (y == 1) {
      if (x == 0) return 12.0 / 16.0;
      if (x == 1) return 4.0 / 16.0;
      if (x == 2) return 14.0 / 16.0;
      return 6.0 / 16.0;
    } else if (y == 2) {
      if (x == 0) return 3.0 / 16.0;
      if (x == 1) return 11.0 / 16.0;
      if (x == 2) return 1.0 / 16.0;
      return 9.0 / 16.0;
    } else {
      if (x == 0) return 15.0 / 16.0;
      if (x == 1) return 7.0 / 16.0;
      if (x == 2) return 13.0 / 16.0;
      return 5.0 / 16.0;
    }
  }

  void main() {
    // 1. Texture sampling (affine warped vs perspective-correct)
    vec2 sampleUv = vUv;
    if (uAffineEnabled > 0.5 && abs(vAffineW) > 0.0001) {
      sampleUv = vAffineUv / vAffineW;
    }

    vec3 baseColor = uColor * vVertexColor;
    float texAlpha = 1.0;
    if (uHasMap > 0.5) {
      vec4 texColor = texture2D(uMap, sampleUv);
      baseColor *= texColor.rgb;
      texAlpha = texColor.a;
    }

    if (texAlpha * uOpacity < 0.01) {
      discard;
    }

    // 2. Simple diffuse lighting + Ambient (Lit side vs Shaded side)
    float diffuse = max(dot(vNormal, normalize(uLightDir)), 0.0);
    vec3 litColor = baseColor * (uAmbientColor * 0.75 + uLightColor * diffuse * 0.85) + uEmissive;

    // 3. Color quantization + Bayer dithering (ON SURFACE ONLY)
    vec3 surfaceColor = litColor;
    if (uDitherEnabled > 0.5) {
      float bayer = getBayerValue(gl_FragCoord.xy) - 0.5;
      vec3 dithered = litColor + (bayer / uColorSteps);
      surfaceColor = floor(dithered * uColorSteps + 0.5) / uColorSteps;
    }

    // 4. Void fog blending into PURE un-dithered fog color
    // When distance >= uFogFar, fogFactor is 1.0 and color is exactly uFogColor with zero dither/banding
    float dist = length(vWorldPosition - cameraPosition);
    float fogFactor = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    vec3 finalColor = mix(surfaceColor, uFogColor, fogFactor);

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), texAlpha * uOpacity);
  }
`

export interface Ps1MaterialOptions {
  color?: string | THREE.Color
  emissive?: string | THREE.Color
  opacity?: number
  transparent?: boolean
  map?: THREE.Texture | null
  snapEnabled?: boolean
  snapResolution?: [number, number]
  affineEnabled?: boolean
  ditherEnabled?: boolean
  colorSteps?: number
  fogNear?: number
  fogFar?: number
  fogColor?: string
  vertexColors?: boolean
}

/**
 * Creates an instance of Ps1Material configured with PS1_CONFIG defaults.
 */
export function createPs1Material(options: Ps1MaterialOptions = {}): THREE.ShaderMaterial {
  const {
    color = PS1_CONFIG.palette.ink,
    emissive = '#000000',
    opacity = 1.0,
    transparent = false,
    map = null,
    snapEnabled = PS1_CONFIG.snapEnabled,
    snapResolution = PS1_CONFIG.snapResolution,
    affineEnabled = PS1_CONFIG.affineEnabled,
    ditherEnabled = PS1_CONFIG.ditherEnabled,
    colorSteps = PS1_CONFIG.colorSteps,
    fogNear = PS1_CONFIG.fog.near,
    fogFar = PS1_CONFIG.fog.far,
    fogColor = PS1_CONFIG.fog.color,
    vertexColors = false,
  } = options

  if (map) {
    map.magFilter = THREE.NearestFilter
    map.minFilter = THREE.NearestFilter
    map.generateMipmaps = false
  }

  const uniforms = {
    uMap: { value: map },
    uHasMap: { value: map ? 1.0 : 0.0 },
    uColor: { value: color instanceof THREE.Color ? color : new THREE.Color(color) },
    uEmissive: { value: emissive instanceof THREE.Color ? emissive : new THREE.Color(emissive) },
    uOpacity: { value: opacity },
    uSnapEnabled: { value: snapEnabled ? 1.0 : 0.0 },
    uSnapResolution: { value: new THREE.Vector2(snapResolution[0], snapResolution[1]) },
    uAffineEnabled: { value: affineEnabled ? 1.0 : 0.0 },
    uDitherEnabled: { value: ditherEnabled ? 1.0 : 0.0 },
    uColorSteps: { value: colorSteps },
    uUseVertexColors: { value: vertexColors ? 1.0 : 0.0 },

    uLightDir: { value: new THREE.Vector3(...PS1_CONFIG.lighting.directionalPosition).normalize() },
    uLightColor: { value: new THREE.Color(PS1_CONFIG.lighting.directionalColor) },
    uAmbientColor: { value: new THREE.Color(PS1_CONFIG.lighting.ambientColor) },

    uFogColor: { value: new THREE.Color(fogColor) },
    uFogNear: { value: fogNear },
    uFogFar: { value: fogFar },
  }

  return new THREE.ShaderMaterial({
    vertexShader: ps1VertexShader,
    fragmentShader: ps1FragmentShader,
    uniforms,
    transparent: transparent || opacity < 1.0,
    depthWrite: !transparent && opacity >= 1.0,
    toneMapped: false,
  })
}
