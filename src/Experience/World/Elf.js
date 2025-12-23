import Experience from "#experience/Experience.js";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";

export default class Elf {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.elfModel = this.resources.items.elfModel;

    this.gradientTexture = this.resources.items.gradientTexture;
    this.elfCheeringVATTexture = this.resources.items.elfCheeringVATTexture;

    this.elfMesh = this.elfModel.scene.children[0];
    this.elfMesh.material = new CustomShaderMaterial({
      baseMaterial: new THREE.MeshToonMaterial({ map: this.gradientTexture }),
      uniforms: {
        uTime: { value: 0 },
        totalFrames: { value: 30 },
        fps: { value: 30 },
        posTexture: { value: this.elfCheeringVATTexture },
      },
      vertexShader: `
      // vertexShader.glsl
attribute vec2 uv1; // define uv1 attribute for vertex_anim uv set
uniform sampler2D posTexture; // positions.exr or positions.png


uniform float uTime; // time in seconds
uniform float totalFrames;
uniform float fps; 


void main() {
    // calculate uv coordinates
    float frame = mod(uTime * fps, totalFrames) / totalFrames;

    // get the position from the texture
    vec4 texturePos = texture(posTexture, vec2(uv1.x, uv1.y - frame));

    // translate the position
    vec4 translated = vec4(position + texturePos.xzy, 1.0);
    csm_PositionRaw = projectionMatrix * modelViewMatrix * translated;
}
    `,
    });

    this.scene.add(this.elfMesh);
  }

  update() {
    if (this.elfMesh.material) {
      this.elfMesh.material.uniforms.uTime.value = this.time.elapsed;
    }
  }
}
