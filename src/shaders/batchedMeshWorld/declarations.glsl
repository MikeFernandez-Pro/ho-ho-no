 #include <common>
attribute vec2 uv1; 
uniform float uTime;
uniform float totalFrames;
uniform float fps;

mat4 removeScale(mat4 m) {
  m[0].xyz = normalize(m[0].xyz);
  m[1].xyz = normalize(m[1].xyz);
  m[2].xyz = normalize(m[2].xyz);
  return m;
}

