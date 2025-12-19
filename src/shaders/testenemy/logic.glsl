vec4 mvPosition;

#ifdef USE_BATCHING
   float sx = length(batchingMatrix[0].xyz);
   float sy = length(batchingMatrix[1].xyz);

   // Walk Animation
   if (abs(sx - 2.0) < 0.001 ) {

      float frame = mod(uTime * fps, uTotalFramesWalk) / uTotalFramesWalk;
      frame = 1.0 -frame;
      vec3 pos = texture(uVATWalk, vec2(uv1.x, uv1.y - frame)).xzy;
      mvPosition = removeScale(batchingMatrix) * vec4(pos, 1.0);

   } else if (abs(sx - 3.0) < 0.001) {

      if (sy > 0.002) {
         // Death Animation   
         float localTime = max(uTime - abs(sy), 0.0);
         float frame = min(localTime * fps, uTotalFramesDeath) / uTotalFramesDeath;
         frame = 1.0 -frame;
         vec3 pos = texture(uVATDeath, vec2(uv1.x, uv1.y - frame)).xzy;
         mvPosition = removeScale(batchingMatrix) * vec4(pos, 1.0);
      } else {
         mvPosition = removeScale(batchingMatrix) * vec4(transformed, 1.0);
      }

   } else {

      mvPosition = batchingMatrix * vec4(transformed, 1.0);

   }
#else
   mvPosition = vec4(transformed, 1.0);
#endif

#ifdef USE_INSTANCING
   mvPosition = instanceMatrix * mvPosition;
#endif

mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
