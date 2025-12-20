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

    this.aliveCount = 0;

    this.capacity = 100;

    // Stable IDs
    this.nextEnemyId = 1;

    // Maps
    this.idToSlot = new Map(); // enemyId -> slot
    this.slotToId = new Int32Array(this.capacity).fill(-1);

    // Temp objects (avoid allocations)
    this._tmpMatrix = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();

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

        // delete first instance
        this.despawnEnemy(this.enemyInstance);

        // toggle anim on instance2
        if (this.test === 0) {
          this.test = 1;
          this.setEnemyAnimById(this.enemyInstance2, WALK_ANIM_ID, 0);
        } else {
          this.test = 0;
          this.setEnemyAnimById(
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
    this.instancedMesh.count = 0;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.instancedMesh);

    this.aAnim = new THREE.InstancedBufferAttribute(
      new Float32Array(this.capacity),
      1
    );
    this.aStartTime = new THREE.InstancedBufferAttribute(
      new Float32Array(this.capacity),
      1
    );

    // defaults (optional)
    for (let i = 0; i < this.capacity; i++) {
      this.aAnim.setX(i, WALK_ANIM_ID);
      this.aStartTime.setX(i, 0);
    }

    this.instancedMesh.geometry.setAttribute("aAnim", this.aAnim);
    this.instancedMesh.geometry.setAttribute("aStartTime", this.aStartTime);

    this.aAnim.needsUpdate = true;
    this.aStartTime.needsUpdate = true;
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
    if (this.aliveCount >= this.capacity) return -1;

    const slot = this.aliveCount++;
    this.instancedMesh.count = this.aliveCount;

    const enemyId = this.nextEnemyId++;

    // register mappings
    this.idToSlot.set(enemyId, slot);
    this.slotToId[slot] = enemyId;

    // write instance data
    this._setInstanceMatrix(slot, position, 1);
    this.setEnemyAnim(slot, animId, this.time.elapsed);

    return enemyId; // stable handle for gameplay
  }

  despawnEnemy(enemyId) {
    const slot = this.idToSlot.get(enemyId);
    if (slot === undefined) return;

    const lastSlot = this.aliveCount - 1;
    const lastId = this.slotToId[lastSlot];

    // If not removing the last one, swap last into removed slot
    if (slot !== lastSlot) {
      // --- copy matrix lastSlot -> slot
      this.instancedMesh.getMatrixAt(lastSlot, this._tmpMatrix);
      this.instancedMesh.setMatrixAt(slot, this._tmpMatrix);

      // --- copy per-instance attributes lastSlot -> slot
      this.aAnim.setX(slot, this.aAnim.getX(lastSlot));
      this.aStartTime.setX(slot, this.aStartTime.getX(lastSlot));

      // --- fix mappings for the moved enemy (lastId)
      this.slotToId[slot] = lastId;
      this.idToSlot.set(lastId, slot);
    }

    // Remove the last slot (now duplicated or removed)
    this.slotToId[lastSlot] = -1;
    this.idToSlot.delete(enemyId);

    this.aliveCount--;
    this.instancedMesh.count = this.aliveCount;

    // Mark buffers dirty
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.aAnim.needsUpdate = true;
    this.aStartTime.needsUpdate = true;
  }

  _setInstanceMatrix(slot, pos, scale) {
    this._tmpQuat.identity();
    this._tmpScale.set(scale, scale, scale);
    this._tmpMatrix.compose(pos, this._tmpQuat, this._tmpScale);

    this.instancedMesh.setMatrixAt(slot, this._tmpMatrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  setEnemyAnim(instanceId, animId, startTime) {
    this.aAnim.setX(instanceId, animId);
    this.aStartTime.setX(instanceId, startTime);
    this.aAnim.needsUpdate = true;
    this.aStartTime.needsUpdate = true;
  }

  setEnemyAnimById(enemyId, animId, startTime) {
    const slot = this.idToSlot.get(enemyId);
    if (slot === undefined) return;
    this.setEnemyAnim(slot, animId, startTime);
  }

  update() {
    this.uniforms.uTime.value = this.time.elapsed;
  }
}
