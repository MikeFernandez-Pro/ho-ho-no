// ===== VERTEX SHADER =====
uniform float uSize;
uniform float uSpeed;
uniform vec2  uResolution;
uniform float uTime;

uniform float uFadeNear; // start fading (closest -> invisible)
uniform float uFadeFar;  // fully visible by this distance

attribute float aScale;
attribute float aMovement;

varying float vOpacity;

void main()
{
  vec3 csmPosition = position;

  // --- Falling ---
  csmPosition.y -= uTime * uSpeed * aScale;
  csmPosition.y = mod(csmPosition.y + 2.0, 22.0) - 2.0;

  // Per-particle variation
  float swirl = sin(uTime * uSpeed + aMovement * 10.0) * 0.2;
  csmPosition.x += swirl;

  // Final position
  vec4 modelPosition = modelMatrix * vec4(csmPosition, 1.0);
  vec4 viewPosition  = viewMatrix * modelPosition;
  gl_Position        = projectionMatrix * viewPosition;

  // Final size (perspective-correct)
  gl_PointSize = uSize * uResolution.y * aScale;
  gl_PointSize *= 1.0 / -viewPosition.z;

  // Camera-space depth in front of camera
  float camDepth = -viewPosition.z;

  // Opacity: 0 near -> 1 far (clamped)
  vOpacity = smoothstep(uFadeNear, uFadeFar, camDepth);

  // If you prefer true distance instead of z-depth, use this instead:
  // float dist = length(viewPosition.xyz);
  // vOpacity = smoothstep(uFadeNear, uFadeFar, dist);
}
