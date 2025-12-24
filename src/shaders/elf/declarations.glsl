#include <common>

uniform float uTime; 
uniform float fps;
uniform sampler2D uVATCheering; 
uniform sampler2D uVATSitting; 
uniform float uTotalFramesCheering;
uniform float uTotalFramesSitting;

attribute vec2 uv1;

mat4 removeScale(mat4 m) {
    m[0].xyz = normalize(m[0].xyz);
    m[1].xyz = normalize(m[1].xyz);
    m[2].xyz = normalize(m[2].xyz);
    return m;
}