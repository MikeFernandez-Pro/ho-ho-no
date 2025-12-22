uniform vec3 uColor;

varying float vOpacity;

void main()
{
    float circle = step(0.5, distance(gl_PointCoord, vec2(0.5)) + 0.25);
    circle = 1.0 - circle;

    vec3 color = uColor;    
    color *= circle;

    float opacity = 1.0 - vOpacity + 0.4;
    opacity = min(1.0, opacity);
    
    float alpha = circle * opacity;

    // Final color
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}       