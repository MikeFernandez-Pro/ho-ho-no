#include <common>
uniform float uAmbiantIntensity;
uniform vec3 uSkyColor;
uniform vec3 uGroundColor;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uFresnelPower;
uniform float uFresnelImpact;
uniform float uFakeAOIntensity;   // 0..1, how much to darken undersides
uniform float uFakeAOPower;       // >0, controls the falloff of AO from underside  

varying vec3 vCustomNormal;
varying vec3 vCustomPosition;

float remap(float value, float from1, float to1, float from2, float to2) {
  return from2 + (value - from1) * (to2 - from2) / (to1 - from1);
}