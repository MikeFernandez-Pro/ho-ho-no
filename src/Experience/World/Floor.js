import * as THREE from "three";
import Experience from "#experience/Experience.js";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

export default class Floor {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.noiseTexture = this.resources.items.voronoiTexture;
    this.debug = this.experience.debug;

    this.noiseTexture.colorSpace = THREE.NoColorSpace;
    this.noiseTexture.wrapS = THREE.RepeatWrapping;
    this.noiseTexture.wrapT = THREE.RepeatWrapping;

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new CustomShaderMaterial({
        baseMaterial: THREE.MeshToonMaterial,
        vertexShader: `
       varying vec2 vUv;

        void main() {
          vUv = uv;
          

          }
        `,
        fragmentShader: `
        uniform sampler2D uNoiseTexture;
        uniform float uScale;
           

        varying vec2 vUv;
    
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        
        mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

            void main() {
         // Perlin Noise
  vec2 perlinNoiseUv = vec2(vUv.x * uScale, vUv.y * uScale);        
  float perlinNoise = texture2D(uNoiseTexture, perlinNoiseUv).r;

    vec2 perlinNoiseUv2 = vec2(vUv.x * uScale, vUv.y * uScale   + 0.5);        
  float perlinNoise2 = texture2D(uNoiseTexture, perlinNoiseUv2).r;

        
  float combinedPerlinNoise =  perlinNoise + perlinNoise2   ;

  vec3 color = mix(uColor1, uColor2, combinedPerlinNoise);
  

  
            
          csm_DiffuseColor = vec4(color, 1.0);
            
                
        }
        `,
        uniforms: {
          uNoiseTexture: { value: this.noiseTexture },
          uColor1: { value: new THREE.Color("#d0f1ff") },
          uColor2: { value: new THREE.Color("#88b0d2") },
          uScale: { value: 4.0 },
        },
      })
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0.55;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    if (this.debug.active) {
      const parameters = {
        color1: this.floor.material.uniforms.uColor1.value,
        color2: this.floor.material.uniforms.uColor2.value,
        scale: 4.0,
      };

      this.debugFolder = this.debug.pane.addFolder({
        title: "Floor",
        expanded: false,
      });

      this.debugFolder.addBinding(parameters, "color1").on("change", (ev) => {
        this.floor.material.uniforms.uColor1.value = new THREE.Color(ev.value);
      });

      this.debugFolder.addBinding(parameters, "color2").on("change", (ev) => {
        this.floor.material.uniforms.uColor2.value = new THREE.Color(ev.value);
      });

      this.debugFolder
        .addBinding(parameters, "scale", {
          min: 0,
          max: 100,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.floor.material.uniforms.uScale.value = ev.value;
        });
    }
  }
}
