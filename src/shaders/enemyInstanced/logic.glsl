float animId = aAnim;
float startTime = aStartTime;

float localTime = max(uTime - startTime, 0.0);

float totalFramesLocal = uTotalFramesWalk;

if (animId < 0.5) {
  totalFramesLocal = uTotalFramesDeath;
}


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
