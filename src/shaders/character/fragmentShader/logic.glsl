#include <map_fragment>

vec3 normal = normalize(vCustomNormal);
vec3 viewDirection = normalize(cameraPosition - vCustomPosition);

// Ambient
vec3 ambient = vec3(uAmbiantIntensity);

// Hemi (world-up based)
vec3 hemi = mix(uGroundColor, uSkyColor, remap(normal.y, -1.0, 1.0, 0.0, 1.0));

// Diffuse (toon)
vec3 lightDir = normalize(vec3(uLightDirection));
vec3 lightColor = vec3(uLightColor);
float dp = max(0.0, dot(lightDir, normal));
dp *= smoothstep(0.5, 0.505, dp);
vec3 diffuse = dp * lightColor;

// Fresnel
float VoN = max(dot(viewDirection, normal), 0.0);
float fresnel = pow(1.0 - VoN, uFresnelPower);

vec3 lighting = ambient + hemi * (fresnel + uFresnelImpact) + diffuse * 0.8;
diffuseColor.rgb *= lighting;

