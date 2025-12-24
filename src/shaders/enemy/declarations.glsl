
uniform sampler2D uVATWalk;
uniform sampler2D uVATDeath;
uniform float uTotalFramesWalk;
uniform float uTotalFramesDeath;

mat4 removeScale(mat4 m) {
  m[0].xyz = normalize(m[0].xyz);
  m[1].xyz = normalize(m[1].xyz);
  m[2].xyz = normalize(m[2].xyz);
  return m;
}
