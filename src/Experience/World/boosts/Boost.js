import Experience from "#experience/Experience.js";
import * as THREE from "three";
export default class Boost {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    this.boostsTexture = this.resources.items.boostsTexture;
    this.boostsTexture.colorSpace = THREE.SRGBColorSpace;
    this.boostsTexture.flipY = false;

    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.geometry.rotateX(Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uBoostsTexture: { value: this.boostsTexture },
      },
      vertexShader: `
      varying vec2 vUv; 
      void main() {
        vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uBoostsTexture;

        void main() {
          vec2 uv = vUv;
          uv.x /= 3.0;
          uv.x+=0.66;

          float angle = atan(vUv.x, vUv.y);
float strength = 0.6;

          vec4 color = texture2D(uBoostsTexture, uv);

          color.rgb = mix(color.rgb, color.rgb, strength);

          gl_FragColor = color;

          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(0, 3, 0);
    this.scene.add(this.mesh);
  }

  update() {
    this.mesh.lookAt(this.experience.world.character.characterScene.position);
  }
}
