import * as THREE from "three";

import Experience from "#experience/experience.js";

import declarationsShaderChunk from "../../../shaders/testEnemy/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/testEnemy/logic.glsl?raw";

const WALK_ANIM_ID = 1;
const DEATH_ANIM_ID = 0;

export default class Enemy {
  constructor(batchedMesh) {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.batchedMesh = batchedMesh;

    this.setGeometry();
    this.setInstances();
    this.setVertexAnimationTextures();
    this.setShadersConfig();
  }

  setGeometry() {
    this.enemyModel = this.resources.items.enemyModel;
    this.enemyMesh = this.enemyModel.scene.children[0];

    this.enemyRunningGeometry = this.enemyMesh.geometry.clone();
    this.enemyDyingGeometry = this.enemyMesh.geometry.clone();

    this.enemyRunningBatchedMeshGeometry = this.batchedMesh.addGeometry(
      this.enemyRunningGeometry
    );
    this.enemyDyingBatchedMeshGeometry = this.batchedMesh.addGeometry(
      this.enemyDyingGeometry
    );
  }

  setInstances() {
    this.enemyRunningInstance = this.batchedMesh.addInstance(
      this.enemyRunningBatchedMeshGeometry
    );

    this.enemyDyingInstance = this.batchedMesh.addInstance(
      this.enemyDyingBatchedMeshGeometry
    );

    const matrix = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3(3, 5, 0), // position
      new THREE.Quaternion(), // rotation
      new THREE.Vector3(2, 2, 2) // scale
    );
    this.batchedMesh.setMatrixAt(this.enemyRunningInstance, matrix);
    const matrix2 = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3(-3, 5, 0), // position
      new THREE.Quaternion(), // rotation
      new THREE.Vector3(3, 3, 3) // scale
    );
    this.batchedMesh.setMatrixAt(this.enemyDyingInstance, matrix);
  }

  setVertexAnimationTextures() {
    this.enemyWalkVATTexture = this.resources.items.enemyWalkVATTexture;
    this.enemyDeathVATTexture = this.resources.items.enemyDeathVATTexture;
  }

  setShadersConfig() {
    this.uniforms = {
      uVATWalk: { value: this.enemyWalkVATTexture },
      uVATDeath: { value: this.enemyDeathVATTexture },
      uTotalFramesWalk: { value: 48 },
      uTotalFramesDeath: { value: 107 },
    };

    this.declarationsShaderChunk = declarationsShaderChunk;
    this.logicShaderChunk = logicShaderChunk;
  }
}
