import * as THREE from "three";
import Experience from "#experience/Experience.js";

// import SantaClous from "./SantaClous.js";

import declarationsVertexShaderChunk from "#shaders/batchedMeshWorld/declarations.glsl?raw";
import logicVertexShaderChunk from "#shaders/batchedMeshWorld/logic.glsl?raw";
import TestEnemy from "#world/batchedMeshWorld/TestEnemy.js";

export default class BatchedMeshWorld {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setTextures();
    this.setMaterial();
    this.setBatchedMesh();
    this.setInstances();
    this.setShadersConfig();
  }

  setTextures = () => {
    this.gradientTexture = this.resources.items.gradientTexture;
    this.gradientTexture.colorSpace = THREE.SRGBColorSpace;
    this.gradientTexture.flipY = false;

    this.fiveToneTexture = this.resources.items.fiveToneTexture;
    this.fiveToneTexture.colorSpace = THREE.SRGBColorSpace;
    this.fiveToneTexture.flipY = false;
    this.fiveToneTexture.minFilter = THREE.NearestFilter;
    this.fiveToneTexture.magFilter = THREE.NearestFilter;
    this.fiveToneTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.fiveToneTexture.wrapT = THREE.ClampToEdgeWrapping;
  };

  setMaterial = () => {
    // Match Character Toon Material.js material "style": MeshBasicMaterial + shader chunk overrides
    this.material = new THREE.MeshToonMaterial({
      map: this.gradientTexture,
      gradientMap: this.fiveToneTexture,
    });
  };

  setBatchedMesh = () => {
    this.batchedMesh = new THREE.BatchedMesh(
      10000,
      1000000,
      1000000,
      this.material
    );
    this.batchedMesh.castShadow = true;
    this.batchedMesh.receiveShadow = true;

    this.scene.add(this.batchedMesh);
  };

  setInstances = () => {
    //   this.santaClous = new SantaClous(this.batchedMesh);
    this.testEnemy = new TestEnemy(this.batchedMesh);
  };

  setShadersConfig = () => {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 60 },
      totalFrames: { value: 48 },
    };

    // Keep the same external API pattern as Character.js
    // (useful if you later hook debug UI to `this.material.uniforms.*`).
    this.material.uniforms = this.uniforms;

    this.batchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    this.configureMaterialShader(this.material);
    this.configureMaterialShader(this.batchedMesh.customDepthMaterial);

    // Ensure onBeforeCompile runs at least once on next render
    this.material.needsUpdate = true;
    this.batchedMesh.customDepthMaterial.needsUpdate = true;
  };

  configureMaterialShader = (material) => {
    material.onBeforeCompile = (shader) => {
      // Hook our uniforms into the program uniforms (same pattern as Character.js)
      Object.assign(shader.uniforms, this.uniforms);
      Object.assign(shader.uniforms, this.testEnemy.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `${declarationsVertexShaderChunk}\n${this.testEnemy.declarationsShaderChunk}\n`
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `${this.testEnemy.logicShaderChunk}\n`
      );
    };
  };

  update = () => {
    const t = this.time.elapsed;
    this.uniforms.uTime.value = t;

    this.testEnemy.update();

    // this.santaClous.update();
  };
}
