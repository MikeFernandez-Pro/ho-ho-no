// ===== FRAGMENT SHADER =====
uniform vec3 uColor;

varying float vOpacity;

void main()
{
  // Soft-ish circular sprite
  float d = distance(gl_PointCoord, vec2(0.5));
  float circle = 1.0 - step(0.5, d); // hard disc

  // (Optional) softer edge:
  // float circle = 1.0 - smoothstep(0.45, 0.5, d);

  float alpha = circle * vOpacity;

  gl_FragColor = vec4(uColor, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
