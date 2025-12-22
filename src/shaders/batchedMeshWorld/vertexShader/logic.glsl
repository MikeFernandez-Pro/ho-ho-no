// Match Character.js lighting varyings, but for batched (non-skinned) + VAT-transformed vertices.
// At this point, `mvPosition` is still in object space (after batching/instancing), so we can
// compute world-space position and normal before converting to view space.
vCustomPosition = (modelMatrix * mvPosition).xyz;

vec3 n = normal;
#ifdef USE_BATCHING
   n = mat3(removeScale(batchingMatrix)) * n;
#endif
#ifdef USE_INSTANCING
   n = mat3(instanceMatrix) * n;
#endif
n = mat3(modelMatrix) * n;
vCustomNormal = normalize(n);

mvPosition = modelViewMatrix * mvPosition;