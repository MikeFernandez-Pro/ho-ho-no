import * as THREE from "three";

import Experience from "#experience/Experience.js";

import declarationsShaderChunk from "#shaders/elf/declarations.glsl?raw";
import logicShaderChunk from "#shaders/elf/logic.glsl?raw";

export default class Elf {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setTextures();
    this.setMaterial();
    this.setBatchedMesh();
    this.setGeometry();
    this.setInstances();

    this.setShadersConfig();
  }

  setTextures() {
    this.gradientTexture = this.resources.items.gradientTexture;
    this.fiveToneTexture = this.resources.items.fiveToneTexture;
    this.elfCheeringVATTexture = this.resources.items.elfCheeringVATTexture;
    this.sittingVATTexture = this.resources.items.sittingVATTexture;
  }

  setMaterial() {
    this.elfMeshMaterial = new THREE.MeshToonMaterial({
      map: this.gradientTexture,
      gradientMap: this.fiveToneTexture,
    });
  }

  setBatchedMesh() {
    this.elfBatchedMesh = new THREE.BatchedMesh(
      2,
      10000,
      1000000,
      this.elfMeshMaterial
    );
    this.elfBatchedMesh.castShadow = true;
    this.scene.add(this.elfBatchedMesh);
  }

  setGeometry() {
    const elfModel = this.resources.items.elfModel;
    const elfMesh = elfModel.scene.children[0];
    const elfMeshGeometry = elfMesh.geometry;

    this.elfGeometryID = this.elfBatchedMesh.addGeometry(elfMeshGeometry);
  }

  setInstances() {
    this.elfInstanceID = this.elfBatchedMesh.addInstance(this.elfGeometryID);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3(-20, 1.7, 0.5);
    const quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, Math.PI / 2, 0)
    );
    const scale = new THREE.Vector3(1, 1, 1);
    matrix.compose(position, quaternion, scale);
    this.elfBatchedMesh.setMatrixAt(this.elfInstanceID, matrix);

    this.elfInstanceID2 = this.elfBatchedMesh.addInstance(this.elfGeometryID);

    const matrix2 = new THREE.Matrix4();
    const position2 = new THREE.Vector3(3, 1.7, 3);
    const quaternion2 = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, 0)
    );
    const scale2 = new THREE.Vector3(2, 1, 1);
    matrix2.compose(position2, quaternion2, scale2);
    this.elfBatchedMesh.setMatrixAt(this.elfInstanceID2, matrix2);
  }

  setShadersConfig() {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 24 },
      uVATCheering: { value: this.elfCheeringVATTexture },
      uVATSitting: { value: this.sittingVATTexture },
      uTotalFramesCheering: { value: 30 },
      uTotalFramesSitting: { value: 108 },
    };

    this.elfBatchedMesh.material.uniforms = this.uniforms;
    this.elfBatchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    this.configureMaterialShader(this.elfBatchedMesh.material);
    this.configureMaterialShader(this.elfBatchedMesh.customDepthMaterial);

    this.elfBatchedMesh.material.needsUpdate = true;
    this.elfBatchedMesh.customDepthMaterial.needsUpdate = true;
  }

  configureMaterialShader(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        declarationsShaderChunk
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        logicShaderChunk
      );
    };
  }

  update() {
    if (this.elfBatchedMesh.material) {
      this.elfBatchedMesh.material.uniforms.uTime.value = this.time.elapsed;
    }
  }
}
