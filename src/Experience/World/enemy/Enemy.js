import * as THREE from "three";

import Experience from "#experience/experience.js";

import declarationsShaderChunk from "../../../shaders/enemy/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/enemy/logic.glsl?raw";

const WALK_ANIM_ID = 1;
const DEATH_ANIM_ID = 0;

export default class Enemy {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setMaterial();
    this.setBatchedMesh();
    this.createEnemyParamsTexture();
    this.setGeometry();
    this.setInstances();
    this.setVertexAnimationTextures();
    this.setShadersConfig();
  }

  setMaterial() {
    this.gradientTexture = this.resources.items.gradientTexture;
    this.material = new THREE.MeshStandardMaterial({
      map: this.gradientTexture,
      metalness: 1.0,
      normalScale: new THREE.Vector2(1, -1),
    });
  }

  setBatchedMesh() {
    this.batchedMesh = new THREE.BatchedMesh(
      10000,
      1000000,
      1000000,
      this.material
    );
    // this.batchedMesh.sortObjects = false;
    // this.batchedMesh.perObjectFrustumCulled = false;
    // this.batchedMesh.castShadow = true;

    this.scene.add(this.batchedMesh);

    this.test = 1;
    window.addEventListener("keydown", (event) => {
      if (event.key === " ") {
        this.batchedMesh.deleteInstance(this.enemyInstance);

        if (this.test === 0) {
          this.test = 1;
          this.setEnemyAnim(this.enemyInstance2, WALK_ANIM_ID, 0); // spawn
        } else {
          this.test = 0;
          this.setEnemyAnim(
            this.enemyInstance2,
            DEATH_ANIM_ID,
            this.time.elapsed
          ); // walk
        }
      }
    });
  }

  createEnemyParamsTexture() {
    this.maxEnemies = this.batchedMesh.maxInstanceCount; // 10000 chez toi
    const size = Math.ceil(Math.sqrt(this.maxEnemies)); // texture carrée
    this.enemyParamsSize = size;

    // RGBA float
    const data = new Float32Array(size * size * 4);

    // init par défaut: walk, startTime=0
    for (let i = 0; i < this.maxEnemies; i++) {
      data[i * 4 + 0] = WALK_ANIM_ID; // animId = walk
      data[i * 4 + 1] = 0; // startTime
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 0;
    }

    this.enemyParamsData = data;

    this.enemyParamsTex = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.enemyParamsTex.needsUpdate = true;
    this.enemyParamsTex.magFilter = THREE.NearestFilter;
    this.enemyParamsTex.minFilter = THREE.NearestFilter;
    this.enemyParamsTex.generateMipmaps = false;
  }

  setGeometry() {
    this.enemyModel = this.resources.items.enemyModel;
    this.enemyMesh = this.enemyModel.scene.children[0];
    this.enemyBatchedMeshGeometry = this.batchedMesh.addGeometry(
      this.enemyMesh.geometry
    );
  }

  setInstances() {
    this.enemyInstance = this.batchedMesh.addInstance(
      this.enemyBatchedMeshGeometry
    );

    this.enemyInstance2 = this.batchedMesh.addInstance(
      this.enemyBatchedMeshGeometry
    );

    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(3, 0, 0);
    this.batchedMesh.setMatrixAt(this.enemyInstance2, matrix);

    this.setEnemyAnim(this.enemyInstance, DEATH_ANIM_ID, this.time.elapsed); // walk
    this.setEnemyAnim(this.enemyInstance2, WALK_ANIM_ID, this.time.elapsed); // death
  }

  setVertexAnimationTextures() {
    this.enemyWalkVATTexture = this.resources.items.enemyWalkVATTexture;
    this.enemyDeathVATTexture = this.resources.items.enemyDeathVATTexture;
  }

  setShadersConfig() {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 40 },
      totalFrames: { value: 48 },
      uVATWalk: { value: this.enemyWalkVATTexture },
      uVATDeath: { value: this.enemyDeathVATTexture },
      uTotalFramesWalk: { value: 48 },
      uTotalFramesDeath: { value: 107 },
      uEnemyParams: { value: this.enemyParamsTex },
      uEnemyParamsSize: { value: this.enemyParamsSize },
    };

    // this.ba

    this.declarationsShaderChunk = declarationsShaderChunk;
    this.logicShaderChunk = logicShaderChunk;

    this.configureMaterialShader(this.material);
    // this.configureMaterialShader(this.batchedMesh.customDepthMaterial);
  }

  configureMaterialShader(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      // Object.assign(shader.uniforms, this.santaClous.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
          #include <common>
          ${declarationsShaderChunk}
          `
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
    };
  }

  setEnemyAnim(instanceId, animId, startTime) {
    const i = instanceId; // on suppose instanceId == drawId (on sécurise ça avec sort/cull off)
    this.enemyParamsData[i * 4 + 0] = animId;
    this.enemyParamsData[i * 4 + 1] = startTime;
    this.enemyParamsTex.needsUpdate = true;
  }

  update() {
    const t = this.time.elapsed;
    this.uniforms.uTime.value = t;
  }
}
