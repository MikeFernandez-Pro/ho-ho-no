uniform float uTime;
uniform float fps;
uniform sampler2D uVATWalk;
uniform sampler2D uVATDeath;
uniform float uTotalFramesWalk;
uniform float uTotalFramesDeath;

attribute vec2 uv1; 

uniform sampler2D uEnemyParams;
uniform float uEnemyParamsSize;

vec4 getVec4FromTexture( sampler2D texture, uint i ) {
  int size = int(uEnemyParamsSize);
  int j = int(i);
  int x = j % size;
  int y = j / size;
  return texelFetch( texture, ivec2( x, y ), 0 );
}   
