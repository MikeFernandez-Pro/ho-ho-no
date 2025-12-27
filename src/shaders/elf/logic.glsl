   vec4 mvPosition;

   const float TWO_PI = 6.28318530718;
   const float CSM_PI = 3.14159265359;

   // BatchedMesh per-instance "color" is stored in a texture, not an attribute.
   // This returns exactly what JS writes via `elfBatchedMesh.setColorAt( instanceId, color )`.
   // Packed convention (see `Elf.js`):
   // - packed.r: type (1.0 = cheering, 2.0 = sitting)
   // - packed.g: target yaw normalized [0..1] (world-space yaw / TWO_PI)
   // - packed.b: unused (reserved)
   vec3 packed = getBatchingColor( getIndirectIndex( gl_DrawID ) );
   float sx = packed.r;
   float targetYaw01 = clamp(packed.g, 0.0, 1.0);
   float targetYaw = targetYaw01 * TWO_PI;

   // We'll reuse the unscaled batching matrix for both transforming and yaw extraction.
   mat4 batchNoScale = removeScale(batchingMatrix);

   if (abs(sx - 1.0) < 0.001 ) {

      float frame = mod(uTime * fps, uTotalFramesCheering   ) / uTotalFramesCheering ;
      frame = 1.0 - frame;  
      vec3 pos = texture(uVATCheering, vec2(uv1.x, uv1.y - frame)).xzy;


         
         
      mvPosition = batchNoScale * vec4(pos, 1.0);

   

   } else {

      float frame = mod(uTime * fps, uTotalFramesSitting  ) / uTotalFramesSitting ;
      frame = 1.0 - frame;  
      vec3 pos = texture(uVATSitting, vec2(uv1.x, uv1.y - frame)).xzy;

      if (pos.y > 1.276) {
      vec2 pivotXZ = vec2(0.0, -0.456);          // <- set this to the center of rotation
      vec2 xz = pos.xz - pivotXZ;
      // Convert world-space targetYaw into *local-space delta yaw* so it works
      // no matter what rotation the instance already has in batchingMatrix.
      mat3 rot = mat3(batchNoScale);
      vec3 forwardWorld = normalize(rot[2]); // local +Z axis in world space
      float baseYaw = atan(forwardWorld.x, forwardWorld.z); // (-CSM_PI..CSM_PI]

      float deltaYaw = targetYaw - baseYaw;
      // Wrap to (-CSM_PI..CSM_PI] to avoid huge spins
      deltaYaw = atan(sin(deltaYaw), cos(deltaYaw));
      // Clamp twist to +/- 45 degrees
      deltaYaw = clamp(deltaYaw, -CSM_PI * 0.25, CSM_PI * 0.25);

      mat2 rotateMatrix = get2dRotateMatrix(deltaYaw);
      xz = rotateMatrix * xz;
      pos.xz = xz + pivotXZ;
   }
      mvPosition = batchNoScale * vec4(pos, 1.0);

   }

   mvPosition = modelViewMatrix * mvPosition;
   gl_Position = projectionMatrix * mvPosition;