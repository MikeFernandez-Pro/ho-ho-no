import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
import { Howl } from "howler";

import Experience from "#experience/Experience.js";
import { CollisionGroup, makeCollisionGroups } from "#utils/collisionGroups.js";

import declarationsShaderChunk from "../../../shaders/enemy/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/enemy/logic.glsl?raw";

const enemiesApproachSound = new Howl({
  src: ["/audio/soundEffects/enemiesApproach.mp3"],
  volume: 0.1,
  loop: true,
});

const walkingInSnowSound = new Howl({
  src: ["/audio/soundEffects/walkingInSnow.mp3"],
  volume: 0.3,
  loop: true,
  rate: 0.6,
});

const ENEMY_MESH_OFFSET = new THREE.Vector3(0, -1, 0);
const ENEMY_MESH_OFFSET_UP = new THREE.Vector3(0, 1, 0);
const DEAD_SINK_DELAY = 1.2; // seconds after hit before sinking starts
const DEAD_SINK_TARGET_Y = -3;
const DEAD_SINK_SPEED = 1; // units / second
const DEATH_BLEND_DURATION = 0.1; // seconds (stored in scale.z, used in shader)

// Simple chase tuning (no stop distance)
const CHASE_SPEED = 3.5;

// Spawning
const SPAWN_INTERVAL_START = 1; // seconds at t=0
const SPAWN_INTERVAL_END = 0.35; // seconds at t=SPAWN_INTERVAL_RAMP_DURATION
const SPAWN_INTERVAL_RAMP_DURATION = 60.0; // seconds (2 minutes)
const SPAWN_RADIUS = 17; // exact distance from center (0,0,0)

export default class Enemy extends THREE.EventDispatcher {
  constructor() {
    super();

    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.physics = this.experience.physics;

    this.list = [];
    this.tmpMatrix = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._tmpDir = new THREE.Vector3();
    this._tmpCharPos = new THREE.Vector3();
    this._tmpSpawnPos = new THREE.Vector3();
    this._tmpCenterPos = new THREE.Vector3(0, 0, 0);
    this.enemiesApproachSoundActivated = false;

    this._nextSpawnTime = 0;
    this._spawnStartTime = 0;
    this.started = false;

    this.setTextures();
    this.setMaterial();
    this.setBatchedMesh();
    this.setGeometry();
    this.setShadersConfig();

    this.physics.addEventListener("collision", this.collisionEventHandler);
  }

  destroyAll() {
    // Stop spawning / updating
    this.started = false;

    // Stop any delayed audio start + stop active loops
    if (this.walkingInSnowSoundTimeout) {
      clearTimeout(this.walkingInSnowSoundTimeout);
      this.walkingInSnowSoundTimeout = null;
    }
    enemiesApproachSound.stop?.();
    walkingInSnowSound.stop?.();

    // Remove all remaining rigid bodies (Rapier removes attached colliders too)
    for (const enemy of this.list) {
      if (enemy?.rigidBody) {
        this.physics.world.removeRigidBody(enemy.rigidBody);
        enemy.rigidBody = null;
      }
    }
    this.list.length = 0;

    // Remove draw calls
    if (this.enemyBatchedMesh) {
      this.scene.remove(this.enemyBatchedMesh);
    }

    // Prevent further collision processing
    this.physics.removeEventListener?.("collision", this.collisionEventHandler);
  }

  start() {
    if (this.started) return;
    this.started = true;

    // Start spawning once the run begins
    this._spawnStartTime = this.time.elapsed;
    this._nextSpawnTime = this.time.elapsed + SPAWN_INTERVAL_START;

    // Start ambient enemy sounds slightly after the run begins
    this.walkingInSnowSoundTimeout = setTimeout(() => {
      enemiesApproachSound.play();
      walkingInSnowSound.play();
    }, 1000);
  }

  setTextures() {
    this.gradientTexture = this.resources.items.gradientTexture;
    this.fiveToneTexture = this.resources.items.fiveToneTexture;
    this.enemyWalkVATTexture = this.resources.items.enemyWalkVATTexture;
    this.enemyDeathVATTexture = this.resources.items.enemyDeathVATTexture;
  }

  setMaterial() {
    this.enemyMeshMaterial = new THREE.MeshToonMaterial({
      map: this.gradientTexture,
      gradientMap: this.fiveToneTexture,
    });
  }

  setBatchedMesh() {
    this.enemyBatchedMesh = new THREE.BatchedMesh(
      400,
      5660,
      18858,
      this.enemyMeshMaterial
    );
    this.enemyBatchedMesh.castShadow = true;
    this.enemyBatchedMesh.frustumCulled = false;

    this.scene.add(this.enemyBatchedMesh);
  }

  setGeometry() {
    const enemyModel = this.resources.items.enemyModel;
    const enemyMesh = enemyModel.scene.children[0];
    const enemyMeshGeometry = enemyMesh.geometry;

    this.enemyGeometryID = this.enemyBatchedMesh.addGeometry(enemyMeshGeometry);
  }

  setShadersConfig() {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 60 },
      uVATWalk: { value: this.enemyWalkVATTexture },
      uVATDeath: { value: this.enemyDeathVATTexture },
      uTotalFramesWalk: { value: 48 },
      uTotalFramesDeath: { value: 107 },
    };

    this.enemyBatchedMesh.material.uniforms = this.uniforms;
    this.enemyBatchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    this.enemyBatchedMesh.material.customProgramCacheKey = () => "enemy_vat";
    this.enemyBatchedMesh.customDepthMaterial.customProgramCacheKey = () =>
      "enemy_vat_depth";

    this.configureMaterialShader(this.enemyBatchedMesh.material);
    this.configureMaterialShader(this.enemyBatchedMesh.customDepthMaterial);

    this.enemyBatchedMesh.material.needsUpdate = true;
    this.enemyBatchedMesh.customDepthMaterial.needsUpdate = true;
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

      // NOTE:
      // We use BatchedMesh per-instance color (`setColorAt`) as *data* on the GPU.
      // Three's built-in material shaders apply that color in the fragment stage
      // (tinting the final shading). Strip those chunks so the fragment ignores it.
      // The attribute/varying still exists for vertex-side usage.
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <batching_color_fragment>", "")
        .replace("#include <color_fragment>", "");
    };
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

    this.enemyBatchedMesh.getMatrixAt(enemyInstanceId, m);
    m.decompose(pos, quat, scl);

    // NOTE: We no longer pack GPU-side state in batchingMatrix scale channels.
    // Pack it into BatchedMesh per-instance "color" instead (see `logic.glsl`).
    // Keep `scl` as the real scale.
    m.compose(pos, quat, scl);
    this.enemyBatchedMesh.setMatrixAt(enemyInstanceId, m);

    // sx: 3 => force the shader into the "death" branch (previously scale.x=3)
    // sy: hitTime (seconds)
    // sz: blend duration (seconds)
    this.enemyBatchedMesh.setColorAt(
      enemyInstanceId,
      new THREE.Color(3, this.time.elapsed, DEATH_BLEND_DURATION)
    );

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
    const c1Type = event.collider1?.userData?.type;
    const c2Type = event.collider2?.userData?.type;

    // Ignore arena/ground noise here as a safety net (even though collision groups
    // should prevent enemy-arena contacts entirely).
    if (
      (c1Type === "enemy" && (c2Type === "arena" || c2Type === "ground")) ||
      (c2Type === "enemy" && (c1Type === "arena" || c1Type === "ground"))
    ) {
      return;
    }

    const isEnemyProjectile =
      (c1Type === "enemy" && c2Type === "projectile") ||
      (c1Type === "projectile" && c2Type === "enemy");

    if (isEnemyProjectile) {
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

      return;
    }

    const isEnemyCharacter =
      (c1Type === "enemy" && c2Type === "character") ||
      (c1Type === "character" && c2Type === "enemy");

    if (isEnemyCharacter) {
      this.dispatchEvent({
        type: "enemyHitCharacter",
      });
      return;
    }
  };

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
    const enemyColliderDesc = RAPIER.ColliderDesc.cuboid(0.8, 1, 0.7);

    const enemyCollider = this.physics.world.createCollider(
      enemyColliderDesc,
      enemyRigidBody
    );
    // Enable collision events so enemy-character contacts are detectable.
    enemyCollider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    // Enemies should collide with character/projectiles/ground, but NOT the arena mesh.
    enemyCollider.setCollisionGroups(
      makeCollisionGroups(
        CollisionGroup.ENEMY,
        CollisionGroup.GROUND |
          CollisionGroup.CHARACTER |
          CollisionGroup.PROJECTILE
      )
    );
    enemyCollider.userData = {
      type: "enemy",
      id: enemyInstanceID,
    };

    return { rigidBody: enemyRigidBody, collider: enemyCollider };
  }

  createEnnemie(spawnPosition) {
    const enemyInstanceID = this.enemyBatchedMesh.addInstance(
      this.enemyGeometryID
    );

    // Initialize transform at spawn so it doesn't "pop" from origin on the first frame.
    // Real scale only (shader uses per-instance "color" for animation state/data).
    this._tmpScale.set(1, 1, 1);
    this._tmpQuat.identity();
    this._tmpPos.copy(spawnPosition).add(ENEMY_MESH_OFFSET);
    this.tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
    this.enemyBatchedMesh.setMatrixAt(enemyInstanceID, this.tmpMatrix);

    // sx: 2 => walk animation branch
    // sy: 0 => not hit
    // sz: blend duration (seconds)
    this.enemyBatchedMesh.setColorAt(
      enemyInstanceID,
      new THREE.Color(2, 0, DEATH_BLEND_DURATION)
    );

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

  _sampleSpawnPositionOnCircle(angle) {
    // Spawn on a fixed-radius ring centered on _tmpCenterPos (XZ plane)
    const cx = this._tmpCenterPos.x;
    const cz = this._tmpCenterPos.z;
    this._tmpSpawnPos.set(
      cx + Math.cos(angle) * SPAWN_RADIUS,
      0,
      cz + Math.sin(angle) * SPAWN_RADIUS
    );
    return this._tmpSpawnPos;
  }

  _computeSpawnPosition(characterRb) {
    // Enemies spawn on a fixed-radius circle around the center (XZ plane).
    // `characterRb` is intentionally ignored: the ring is always valid to spawn on.
    const a = Math.random() * Math.PI * 2;
    return this._sampleSpawnPositionOnCircle(a);
  }

  update() {
    if (this.enemyBatchedMesh.material) {
      this.enemyBatchedMesh.material.uniforms.uTime.value = this.time.elapsed;
    }
    if (!this.started) return;

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
    while (
      spawnedThisFrame < maxSpawnsPerFrame &&
      this.time.elapsed >= this._nextSpawnTime
    ) {
      if (!this.enemiesApproachSoundActivated) {
        enemiesApproachSound.play();
        this.enemiesApproachSoundActivated = true;
      }
      const spawnPos = this._computeSpawnPosition(characterRb);
      // clone so list stores a stable snapshot, not our temp vector
      this.createEnnemie(spawnPos.clone());
      spawnedThisFrame++;
      this._nextSpawnTime += this._getSpawnInterval();
    }

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
            //  Face the target (yaw only)
            const yaw = Math.atan2(this._tmpDir.x, this._tmpDir.z);
            this._tmpQuat.setFromAxisAngle(ENEMY_MESH_OFFSET_UP, yaw);
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
        this.enemyBatchedMesh.getMatrixAt(enemy.instance, this.tmpMatrix);
        this.tmpMatrix.decompose(this._tmpDir, this._tmpQuat, this._tmpScale);
        const rbRot = enemy.rigidBody.rotation();
        this._tmpQuat.set(rbRot.x, rbRot.y, rbRot.z, rbRot.w);
        this.tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        this.enemyBatchedMesh.setMatrixAt(enemy.instance, this.tmpMatrix);
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
      this.enemyBatchedMesh.setMatrixAt(enemy.instance, this.tmpMatrix);

      if (enemy.deadPosition.y <= DEAD_SINK_TARGET_Y) {
        this.enemyBatchedMesh.deleteInstance(enemy.instance);
        this.list.splice(i, 1);
      }
    }
  }
}
