// Match Character.js lighting varyings, but for batched (non-skinned) + VAT-transformed vertices.
// At this point, `mvPosition` is still in object space (after batching/instancing), so we can
// compute world-space position and normal before converting to view space.


mvPosition = modelViewMatrix * mvPosition;