import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import * as THREE from "three";
import Experience from "#experience/Experience.js";

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAspect: { value: 1.0 },
    // Start closer to center by lowering uRadius, and control falloff with uSoftness.
    // Typical: uRadius ~ 0.35-0.55, uSoftness ~ 0.2-0.5
    uRadius: { value: 0.283 },
    uSoftness: { value: 1 },
    // How much darkening at the edges (0 = none, 1 = full)
    uDarkness: { value: 1 },
    // Tint/multiply color (kept as THREE.Color but uploads as vec3)
    uColor: { value: new THREE.Color("#5ebaf8") },
  },
  vertexShader: `
   varying vec2 vUv;

        void main()
        {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 vUv = uv;
        
            }
    `,
  fragmentShader: `
  varying vec2 vUv;

  uniform sampler2D tDiffuse;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uSoftness;
  uniform float uDarkness;
  uniform vec3 uColor;        

        void main()
        {
            vec3 sceneColor = texture2D(tDiffuse, vUv).rgb;

            // Circular vignette (aspect-corrected)
            vec2 p = vUv - 0.5;
p.x *= uAspect;

// distance to current pixel
float d = length(p);

// distance from center to farthest corner in the same space
float corner = length(vec2(0.5 * uAspect, 0.5));

// normalize so corners are always ~1.0
d /= corner;

// now uRadius is consistent across aspect ratios
float edge = smoothstep(uRadius, uRadius + max(uSoftness, 1e-5), d);
float vignette = mix(1.0, 1.0 - uDarkness, edge);
gl_FragColor = vec4(mix(uColor, sceneColor, vignette), 1.0);

        }                   
    `,
};

export default class Vignette extends ShaderPass {
  constructor() {
    super(VignetteShader);

    this.experience = new Experience();
    this.sizes = this.experience.sizes;
    this.debug = this.experience.debug;

    this.sizes.addEventListener("resize", this.resize);

    if (this.debug.active) {
      this.debugFolder = this.debug.pane.addFolder({
        title: "Vignette",
        expanded: false,
      });

      const parameters = {
        radius: this.uniforms.uRadius.value,
        softness: this.uniforms.uSoftness.value,
        darkness: this.uniforms.uDarkness.value,
        color: "#85cdff",
      };

      this.debugFolder
        .addBinding(parameters, "radius", {
          min: -1,
          max: 1,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.uniforms.uRadius.value = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "softness", {
          min: 0,
          max: 1,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.uniforms.uSoftness.value = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "darkness", {
          min: 0,
          max: 1,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.uniforms.uDarkness.value = ev.value;
        });

      this.debugFolder.addBinding(parameters, "color").on("change", (ev) => {
        // ev.value is { r, g, b } in [0..1]
        this.uniforms.uColor.value = new THREE.Color(ev.value);
      });
    }
  }

  resize = () => {
    this.uniforms.uAspect.value =
      this.sizes.height === 0 ? 1.0 : this.sizes.width / this.sizes.height;
  };
}
