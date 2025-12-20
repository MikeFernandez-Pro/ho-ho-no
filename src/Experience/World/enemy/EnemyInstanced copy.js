import * as THREE from "three";
import Experience from "#experience/Experience.js";

import declarationsShaderChunk from "../../../shaders/enemyInstanced/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/enemyInstanced/logic.glsl?raw";

const DEATH_ANIM_ID = 0;
const WALK_ANIM_ID = 1;

export default class EnemyInstanced {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    // pool
    this.capacity = 100;
    this.free = [];
    for (let i = this.capacity - 1; i >= 0; i--) this.free.push(i);

    this.setMaterial();
    this.setGeometry();
    this.setInstancedMesh(); // <-- replaces BatchedMesh + DataTexture
    this.setVertexAnimationTextures();
    this.setShadersConfig();

    // demo: spawn 2
    this.enemyInstance = this.spawnEnemy(
      new THREE.Vector3(0, 0, 0),
      DEATH_ANIM_ID
    );
    this.enemyInstance2 = this.spawnEnemy(
      new THREE.Vector3(3, 0, 0),
      WALK_ANIM_ID
    );

    this.test = 1;
    window.addEventListener("keydown", (event) => {
      if (event.key === " ") {
        // "delete" first instance (hide + recycle)
        this.despawnEnemy(this.enemyInstance);

        // toggle anim on instance2
        if (this.test === 0) {
          this.test = 1;
          this.setEnemyAnim(this.enemyInstance2, WALK_ANIM_ID, 0);
        } else {
          this.test = 0;
          this.setEnemyAnim(
            this.enemyInstance2,
            DEATH_ANIM_ID,
            this.time.elapsed
          );
        }
      }
    });
  }

  setMaterial() {
    this.gradientTexture = this.resources.items.gradientTexture;
    this.material = new THREE.MeshStandardMaterial({
      map: this.gradientTexture,
      metalness: 1.0,
      normalScale: new THREE.Vector2(1, -1),
    });
  }

  setGeometry() {
    this.enemyModel = this.resources.items.enemyModel;
    this.enemyMesh = this.enemyModel.scene.children[0];
    this.geometry = this.enemyMesh.geometry;
  }

  setInstancedMesh() {
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.capacity
    );
    this.instancedMesh.count = 5;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.instancedMesh);

    // per-instance attributes
    this.aAnim = new THREE.InstancedBufferAttribute(
      new Float32Array(this.capacity),
      1
    );
    this.aStartTime = new THREE.InstancedBufferAttribute(
      new Float32Array(this.capacity),
      1
    );

    // init defaults
    for (let i = 0; i < this.capacity; i++) {
      this.aAnim.setX(i, WALK_ANIM_ID);
      this.aStartTime.setX(i, 0);
      // hide initially (scale 0)
      this._setInstanceMatrix(i, new THREE.Vector3(0, 0, 0), 0);
    }

    this.instancedMesh.geometry.setAttribute("aAnim", this.aAnim);
    this.instancedMesh.geometry.setAttribute("aStartTime", this.aStartTime);

    this.aAnim.needsUpdate = true;
    this.aStartTime.needsUpdate = true;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  setVertexAnimationTextures() {
    this.enemyWalkVATTexture = this.resources.items.enemyWalkVATTexture;
    this.enemyDeathVATTexture = this.resources.items.enemyDeathVATTexture;
  }

  setShadersConfig() {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 40 },

      uVATWalk: { value: this.enemyWalkVATTexture },
      uVATDeath: { value: this.enemyDeathVATTexture },

      uTotalFramesWalk: { value: 48 },
      uTotalFramesDeath: { value: 107 },
    };

    this.configureMaterialShader(this.material);
  }

  configureMaterialShader(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>\n${declarationsShaderChunk}\n`
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n${logicShaderChunk}\n`
      );
    };
  }

  spawnEnemy(position, animId) {
    if (!this.free.length) return -1;
    const i = this.free.pop();

    this._setInstanceMatrix(i, position, 1); // scale 1 = visible
    this.setEnemyAnim(i, animId, this.time.elapsed);

    return i;
  }

  despawnEnemy(i) {
    if (i < 0) return;
    // hide + recycle
    this._setInstanceMatrix(i, new THREE.Vector3(0, 0, 0), 0);
    this.free.push(i);
  }

  _setInstanceMatrix(i, pos, scale) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(scale, scale, scale);
    m.compose(pos, q, s);
    this.instancedMesh.setMatrixAt(i, m);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  setEnemyAnim(instanceId, animId, startTime) {
    this.aAnim.setX(instanceId, animId);
    this.aStartTime.setX(instanceId, startTime);
    this.aAnim.needsUpdate = true;
    this.aStartTime.needsUpdate = true;
  }

  update() {
    this.uniforms.uTime.value = this.time.elapsed;
  }
}
