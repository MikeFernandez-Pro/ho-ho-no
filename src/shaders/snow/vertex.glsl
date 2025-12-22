uniform float uSize;
uniform float uSpeed;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCharacterVelocity;

attribute float aScale;
attribute float aMovement;

varying float vOpacity;

float remap01(float v, float a, float b) {
  return clamp((v - a) / (b - a), 0.0, 1.0);
}

void main()
{
  vec3 csmPosition = position;

  // --- Falling ---
  csmPosition.y -= uTime * uSpeed * aScale;

  // Wrap in [-1, 1] smoothly
  csmPosition.y = mod(csmPosition.y + 1.0, 2.0) - 1.0;

  // 0 at top, 1 at bottom -> bottom flakes drift more
  float lower = remap01(csmPosition.y, 1.0, -1.0);
  lower = lower * lower; // stronger bias to the bottom

  // --- Wind / drift from character velocity ---
  // If character goes +X (right), flakes drift -X (diagonal left), and vice versa.
  // Same for Z (forward/back).
  vec2 wind = -uCharacterVelocity.xz;

  // A little per-particle variation so it isn't rigid
  float swirl = sin(uTime * uSpeed + aMovement * 10.0) * 0.2;

  // Scale drift: lower flakes move more sideways
  csmPosition.x += wind.x * (0.15 + 0.35 * lower) + swirl;
  csmPosition.z += wind.y * (0.10 + 0.25 * lower);

  // Final position
  vec4 modelPosition = modelMatrix * vec4(csmPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  // Final size
  gl_PointSize = uSize * uResolution.y * aScale;
  gl_PointSize *= 1.0 / -viewPosition.z;

  vOpacity = aScale;
}
