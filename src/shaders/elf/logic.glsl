vec4 mvPosition;

float sx = length(batchingMatrix[0].xyz);

if (abs(sx - 1.0) < 0.001 ) {

   float frame = mod(uTime * fps, uTotalFramesCheering   ) / uTotalFramesCheering ;
   frame = 1.0 - frame;  
   vec3 pos = texture(uVATCheering, vec2(uv1.x, uv1.y - frame)).xzy;
   mvPosition = removeScale(batchingMatrix)   * vec4(pos, 1.0);

} else {

   float frame = mod(uTime * fps, uTotalFramesSitting  ) / uTotalFramesSitting ;
   frame = 1.0 - frame;  
   vec3 pos = texture(uVATSitting, vec2(uv1.x, uv1.y - frame)).xzy;
   mvPosition = removeScale(batchingMatrix)   * vec4(pos, 1.0);

}

mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;