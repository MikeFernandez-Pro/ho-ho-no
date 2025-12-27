vec4 mvPosition;

// BatchedMesh "instance color" is NOT an attribute like InstancedMesh's `instanceColor`.
// It's stored in a texture and can be sampled in the vertex stage:
// - `getBatchingColor( getIndirectIndex( gl_DrawID ) )`
// This returns exactly what you set via `batchedMesh.setColorAt( instanceId, color )`.
#ifdef USE_BATCHING_COLOR
vec3 packed = getBatchingColor( getIndirectIndex( gl_DrawID ) );
#elif defined( USE_INSTANCING_COLOR )
vec3 packed = instanceColor.xyz;
#else
vec3 packed = vec3( 1.0 );
#endif

float sx = packed.r;
float sy = packed.g;
float sz = packed.b;

// Walk Animation
if (abs(sx - 2.0) < 0.001 ) {

   float frame = mod(uTime * fps, uTotalFramesWalk) / uTotalFramesWalk;
   frame = 1.0 -frame;
   vec3 pos = texture(uVATWalk, vec2(uv1.x, uv1.y - frame)).xzy;
   mvPosition = batchingMatrix * vec4(pos, 1.0);

} else {

   if (sy > 0.002) {
      float hitTime = abs(sy);
      float localTime = max(uTime - hitTime, 0.0);
      float blendDuration = max(abs(sz), 0.0001);
      float blendT = clamp(localTime / blendDuration, 0.0, 1.0);

      // Walk pose frozen at hit moment (so transition is continuous)
      float walkFrame = mod(hitTime * fps, uTotalFramesWalk) / uTotalFramesWalk;
      walkFrame = 1.0 - walkFrame;
      vec3 posWalk = texture(uVATWalk, vec2(uv1.x, uv1.y - walkFrame)).xzy;

      // Death pose starting at localTime=0
      float deathFrame = min(localTime * fps, uTotalFramesDeath) / uTotalFramesDeath;
      deathFrame = 1.0 - deathFrame;
      vec3 posDeath = texture(uVATDeath, vec2(uv1.x, uv1.y - deathFrame)).xzy;

      vec3 pos = mix(posWalk, posDeath, blendT);
      mvPosition = batchingMatrix * vec4(pos, 1.0);
   } else {
      mvPosition = batchingMatrix* vec4(transformed, 1.0);
   }

} 



mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
