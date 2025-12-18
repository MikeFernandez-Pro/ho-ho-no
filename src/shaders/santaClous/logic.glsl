

float santaClousframe = mod(uTime * fps, totalFrames) / totalFrames;  

vec4 texSantaClousPrevious = texture(uSantaClousPreviousTexture, vec2(uv1.x, uv1.y - santaClousframe));
vec4 texSantaClousCurrent = texture(uSantaClousCurrentTexture, vec2(uv1.x, uv1.y - santaClousframe));
    
vec4 santaClousTexturePos = mix(texSantaClousPrevious, texSantaClousCurrent, uSantaClousAnimationMix);
transformed  = santaClousTexturePos.xzy;