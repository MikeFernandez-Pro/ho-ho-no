vCustomPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;

// MeshBasic only computes normals when USE_SKINNING or USE_ENVMAP is enabled.
// transformedNormal is view-space; convert to world-space using viewMatrix.
#if defined( USE_SKINNING ) || defined( USE_ENVMAP )
  vCustomNormal = normalize(inverseTransformDirection(transformedNormal, viewMatrix));
#else
  vCustomNormal = vec3(0.0, 1.0, 0.0);
#endif

#include <project_vertex>