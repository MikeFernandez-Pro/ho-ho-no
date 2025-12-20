import * as THREE from "three";
import Experience from "#experience/Experience.js";

// import SantaClous from "./SantaClous.js";

import declarationsShaderChunk from "../../../shaders/batchedMeshWorld/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/batchedMeshWorld/logic.glsl?raw";
import TestEnemy from "#world/batchedMeshWorld/TestEnemy.js";

export default class BatchedMeshWorld {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setBaseColorTexture();
    this.setMaterial();
    this.setBatchedMesh();
    this.setInstances();
    this.setShadersConfig();
  }

  setBaseColorTexture = () => {
    this.gradientTexture = this.resources.items.gradientTexture;
  };

  setMaterial = () => {
    this.material = new THREE.MeshStandardMaterial({
      map: this.gradientTexture,
      // color: 0x00ff00,
      metalness: 1.0,
      normalScale: new THREE.Vector2(1, -1),
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

    this.scene.add(this.batchedMesh);
  };

  setInstances = () => {
    //   this.santaClous = new SantaClous(this.batchedMesh);
    this.testEnemy = new TestEnemy(this.batchedMesh);
  };

  setShadersConfig = () => {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 40 },
      totalFrames: { value: 48 },
    };

    this.batchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    this.configureMaterialShader(this.material);
    this.configureMaterialShader(this.batchedMesh.customDepthMaterial);
  };

  configureMaterialShader = (material) => {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      Object.assign(shader.uniforms, this.testEnemy.uniforms);
      // Object.assign(shader.uniforms, this.santaClous.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
          #include <common>
          ${declarationsShaderChunk}
          ${this.testEnemy.declarationsShaderChunk}
          
          `
        //${this.testEnemy.declarationsShaderChunk}
        // ${this.santaClous.declarationsShaderChunk}
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
          #include <begin_vertex>
          ${logicShaderChunk}

    
   
          `
        // ${this.santaClous.logicShaderChunk}
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `
        ${this.testEnemy.logicShaderChunk}
  `
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
