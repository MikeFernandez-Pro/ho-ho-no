// ============================================================
// logic.glsl
// Per-instance animation selection (spawn OR walk) with BatchedMesh
// ============================================================

// ---- per-instance parameters (from DataTexture) ----
uint objectId = uint(getIndirectIndex( gl_DrawID ));
vec4 params = getVec4FromTexture(uEnemyParams, objectId);

// params.r = animId : 0=walk, 1=death
// params.g = startTime
float animId = params.r;
float startTime = params.g;

// local time per instance
float localTime = max(uTime - startTime, 0.0);

// // ---- choose VAT + totalFrames per instance ----
 float totalFramesLocal = uTotalFramesWalk;

 if (animId < 0.5) {
   totalFramesLocal = uTotalFramesDeath;
 } else {
  totalFramesLocal = uTotalFramesWalk;
}

// // ---- compute frame using localTime ----

// // ---- sample VAT ----`

if (animId < 0.5) {
  float enemyframe = min(localTime * fps, totalFramesLocal) / totalFramesLocal;
enemyframe = 1.0 -enemyframe;

  vec4 enemyTexturePos = texture(uVATDeath, vec2(uv1.x, uv1.y - enemyframe));
   transformed = enemyTexturePos.xzy;
} else {
  float enemyframe = mod(localTime * fps, totalFramesLocal) / totalFramesLocal;
enemyframe = 1.0 -enemyframe;

  vec4 enemyTexturePos = texture(uVATWalk, vec2(uv1.x, uv1.y - enemyframe));
   transformed = enemyTexturePos.xzy;
}

