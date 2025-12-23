import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "#experience/Experience.js";

import declarationsShaderChunk from "../../../shaders/testEnemy/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/testEnemy/logic.glsl?raw";

const ENEMY_MESH_OFFSET = new THREE.Vector3(0, -1, 0);
const DEAD_SINK_DELAY = 3; // seconds after hit before sinking starts
const DEAD_SINK_TARGET_Y = -3;
const DEAD_SINK_SPEED = 1; // units / second
const DEATH_BLEND_DURATION = 0.25; // seconds (stored in scale.z, used in shader)

// Simple chase tuning (no stop distance)
const CHASE_SPEED = 3.5;

// Spawning
const SPAWN_INTERVAL_START = 2.0; // seconds at t=0
const SPAWN_INTERVAL_END = 0.5; // seconds at t=SPAWN_INTERVAL_RAMP_DURATION
const SPAWN_INTERVAL_RAMP_DURATION = 60.0; // seconds (2 minutes)
const SPAWN_MAX_RADIUS = 17; // max distance from center (0,0,0)
const SPAWN_MIN_PLAYER_DISTANCE = 7; // min distance from player
const SPAWN_MAX_TRIES = 30;

export default class Enemy extends THREE.EventDispatcher {
  constructor(batchedMesh) {
    super();

    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.physics = this.experience.physics;

    this.batchedMesh = batchedMesh;
    this.list = [];
    this.tmpMatrix = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._tmpDir = new THREE.Vector3();
    this._tmpCharPos = new THREE.Vector3();
    this._tmpSpawnPos = new THREE.Vector3();
    this._tmpCenterPos = new THREE.Vector3(0, 0, 0);

    this._nextSpawnTime = 0;
    this._spawnStartTime = 0;

    this.setGeometry();
    this.setVertexAnimationTextures();
    this.setShadersConfig();

    // Start spawning once the loop begins
    this._spawnStartTime = this.time.elapsed;
    this._nextSpawnTime = this.time.elapsed + SPAWN_INTERVAL_START;

    this.physics.addEventListener("collision", this.collisionEventHandler);
  }

  killEnemyByInstanceId = (enemyInstanceId) => {
    const enemyIndex = this.list.findIndex(
      (e) => e.instance === enemyInstanceId
    );
    if (enemyIndex === -1) return;

    const enemy = this.list[enemyIndex];
    if (!enemy.rigidBody) {
      return;
    }

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    this.batchedMesh.getMatrixAt(enemyInstanceId, m);
    m.decompose(pos, quat, scl);

    // pos.y = 0.;
    scl.x = 3;
    scl.y = this.time.elapsed;
    scl.z = DEATH_BLEND_DURATION;
    m.compose(pos, quat, scl);
    this.batchedMesh.setMatrixAt(enemyInstanceId, m);

    // Remove rigidbody; attached colliders get removed with it in Rapier
    this.physics.world.removeRigidBody(enemy.rigidBody);

    // Mark as dead so `update()` stops copying RB position and starts sinking after a delay
    enemy.rigidBody = null;
    enemy.hitTime = this.time.elapsed;
    enemy.deadPosition = pos;
    enemy.deadQuaternion = quat;
    enemy.deadScale = scl;
  };

  collisionEventHandler = (event) => {
    const c1Type = event.collider1.userData.type;
    const c2Type = event.collider2.userData.type;
    const isEnemyProjectile =
      (c1Type === "enemy" && c2Type === "projectile") ||
      (c1Type === "projectile" && c2Type === "enemy");

    if (!isEnemyProjectile) return;

    const enemyCollider =
      c1Type === "enemy" ? event.collider1 : event.collider2;
    const projectileCollider =
      c1Type === "projectile" ? event.collider1 : event.collider2;

    this.dispatchEvent({
      type: "enemyHit",
      projectile: projectileCollider.userData.id,
    });

    // Freeze transform + remove physics so we stop copying RB position each frame
    this.killEnemyByInstanceId(enemyCollider.userData.id);
  };

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

  setPhysics() {
    this.physics = this.experience.physics;
  }

  createEnnemieRigidBody(spawnPosition, enemyInstanceID) {
    // Rigid body configuration
    const enemyRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    enemyRigidBodyDesc.setTranslation(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    );
    // Keep enemies upright; we control yaw manually.
    enemyRigidBodyDesc.lockRotations();

    const enemyRigidBody =
      this.physics.world.createRigidBody(enemyRigidBodyDesc);

    // Collider configuration
    const enemyColliderDesc = RAPIER.ColliderDesc.cuboid(0.8, 1, 0.8);

    const enemyCollider = this.physics.world.createCollider(
      enemyColliderDesc,
      enemyRigidBody
    );
    enemyCollider.userData = {
      type: "enemy",
      id: enemyInstanceID,
    };

    return { rigidBody: enemyRigidBody, collider: enemyCollider };
  }

  createEnnemie(spawnPosition) {
    const enemyInstanceID = this.batchedMesh.addInstance(
      this.enemyRunningBatchedMeshGeometry
    );

    // Initialize transform at spawn so it doesn't "pop" from origin on the first frame.
    // Keep scale.x = 2 for walk animation (see shader logic).
    this._tmpScale.set(2, 1, 1);
    this._tmpQuat.identity();
    this._tmpPos.copy(spawnPosition).add(ENEMY_MESH_OFFSET);
    this.tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
    this.batchedMesh.setMatrixAt(enemyInstanceID, this.tmpMatrix);

    const { rigidBody, collider } = this.createEnnemieRigidBody(
      spawnPosition,
      enemyInstanceID
    );

    this.list.push({
      instance: enemyInstanceID,
      rigidBody,
      collider,
      spawnPosition,
      hitTime: null,
      deadPosition: null,
      deadQuaternion: null,
      deadScale: null,
    });
  }

  _getSpawnInterval() {
    // Linearly decrease spawn interval from START -> END over RAMP_DURATION, then clamp.
    const t = this.time.elapsed - this._spawnStartTime;
    const alpha = THREE.MathUtils.clamp(t / SPAWN_INTERVAL_RAMP_DURATION, 0, 1);
    return THREE.MathUtils.lerp(
      SPAWN_INTERVAL_START,
      SPAWN_INTERVAL_END,
      alpha
    );
  }

  _computeSpawnPosition(characterRb) {
    // If we don't have a player, just spawn somewhere inside the circle.
    if (characterRb) {
      const t = characterRb.translation();
      this._tmpCharPos.set(t.x, t.y, t.z);
    }

    for (let i = 0; i < SPAWN_MAX_TRIES; i++) {
      // Uniform distribution over disk area
      const r = Math.sqrt(Math.random()) * SPAWN_MAX_RADIUS;
      const a = Math.random() * Math.PI * 2;
      this._tmpSpawnPos.set(Math.cos(a) * r, 0, Math.sin(a) * r);

      if (!characterRb) return this._tmpSpawnPos;

      const dx = this._tmpSpawnPos.x - this._tmpCharPos.x;
      const dz = this._tmpSpawnPos.z - this._tmpCharPos.z;
      if (
        dx * dx + dz * dz >=
        SPAWN_MIN_PLAYER_DISTANCE * SPAWN_MIN_PLAYER_DISTANCE
      ) {
        return this._tmpSpawnPos;
      }
    }

    // Fallback: place on the rim, away from the player direction
    if (characterRb) {
      this._tmpDir.subVectors(this._tmpCenterPos, this._tmpCharPos);
      this._tmpDir.y = 0;
      if (this._tmpDir.lengthSq() > 0.000001) {
        this._tmpDir.normalize().multiplyScalar(SPAWN_MAX_RADIUS);
        this._tmpSpawnPos.set(this._tmpDir.x, 0, this._tmpDir.z);
        return this._tmpSpawnPos;
      }
    }

    this._tmpSpawnPos.set(SPAWN_MAX_RADIUS, 0, 0);
    return this._tmpSpawnPos;
  }

  update() {
    const dt = this.time.delta * 0.001;
    const character = this.experience.world?.character;
    const characterRb = character?.characterRigidBody;

    if (characterRb) {
      const t = characterRb.translation();
      this._tmpCharPos.set(t.x, t.y, t.z);
    }

    // Spawn loop (interval ramps from 3s -> 0.5s over 2 minutes)
    // Safety cap prevents too many spawns in a single long frame.
    let spawnedThisFrame = 0;
    const maxSpawnsPerFrame = 10;
    // while (
    //   spawnedThisFrame < maxSpawnsPerFrame &&
    //   this.time.elapsed >= this._nextSpawnTime
    // ) {
    //   const spawnPos = this._computeSpawnPosition(characterRb);
    //   // clone so list stores a stable snapshot, not our temp vector
    //   this.createEnnemie(spawnPos.clone());
    //   spawnedThisFrame++;
    //   this._nextSpawnTime += this._getSpawnInterval();
    // }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const enemy = this.list[i];

      // Alive: sync from Rapier
      if (enemy.rigidBody) {
        // Always move toward the character (no stop distance)
        if (characterRb) {
          const enemyT = enemy.rigidBody.translation();
          this._tmpPos.set(enemyT.x, enemyT.y, enemyT.z);

          this._tmpDir.subVectors(this._tmpCharPos, this._tmpPos);
          this._tmpDir.y = 0;

          // Avoid NaNs if on same XZ position
          if (this._tmpDir.lengthSq() > 0.000001) {
            this._tmpDir.normalize();

            // Face the target (yaw only)
            const yaw = Math.atan2(this._tmpDir.x, this._tmpDir.z);
            this._tmpQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            enemy.rigidBody.setRotation(
              {
                x: this._tmpQuat.x,
                y: this._tmpQuat.y,
                z: this._tmpQuat.z,
                w: this._tmpQuat.w,
              },
              true
            );

            const currentVel = enemy.rigidBody.linvel();
            enemy.rigidBody.setLinvel(
              {
                x: this._tmpDir.x * CHASE_SPEED,
                y: currentVel.y,
                z: this._tmpDir.z * CHASE_SPEED,
              },
              true
            );
          }
        }

        const enemyTranslation = enemy.rigidBody.translation();
        this._tmpPos.set(
          enemyTranslation.x,
          enemyTranslation.y,
          enemyTranslation.z
        );
        this._tmpPos.add(ENEMY_MESH_OFFSET);

        // Preserve batchingMatrix scale channels (shader uses them for animation),
        // but overwrite translation + yaw rotation.
        this.batchedMesh.getMatrixAt(enemy.instance, this.tmpMatrix);
        this.tmpMatrix.decompose(this._tmpDir, this._tmpQuat, this._tmpScale);

        const rbRot = enemy.rigidBody.rotation();
        this._tmpQuat.set(rbRot.x, rbRot.y, rbRot.z, rbRot.w);

        this.tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        this.batchedMesh.setMatrixAt(enemy.instance, this.tmpMatrix);
        continue;
      }

      // Dead: after a delay, sink down, then delete instance + remove from list
      if (enemy.hitTime === null) continue;
      if (this.time.elapsed < enemy.hitTime + DEAD_SINK_DELAY) continue;
      if (!enemy.deadPosition || !enemy.deadQuaternion || !enemy.deadScale)
        continue;

      enemy.deadPosition.y -= DEAD_SINK_SPEED * dt;
      this.tmpMatrix.compose(
        enemy.deadPosition,
        enemy.deadQuaternion,
        enemy.deadScale
      );
      this.batchedMesh.setMatrixAt(enemy.instance, this.tmpMatrix);

      if (enemy.deadPosition.y <= DEAD_SINK_TARGET_Y) {
        this.batchedMesh.deleteInstance(enemy.instance);
        this.list.splice(i, 1);
      }
    }
  }
}
