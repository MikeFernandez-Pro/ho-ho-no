import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "#experience/experience.js";

import declarationsShaderChunk from "../../../shaders/testEnemy/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/testEnemy/logic.glsl?raw";

const ENEMY_MESH_OFFSET = new THREE.Vector3(0, -1, 0);

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

    this.setGeometry();
    this.setVertexAnimationTextures();
    this.setShadersConfig();

    this.createEnnemie(new THREE.Vector3(3, 0, 0));

    this.physics.addEventListener("collision", this.collisionEventHandler);
  }

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

    // Keep the exact same matrix edits as before, just without duplication
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    this.batchedMesh.getMatrixAt(enemyCollider.userData.id, m);
    m.decompose(pos, quat, scl);
    pos.y = -2;
    scl.x = 3;
    scl.y = this.time.elapsed;
    m.compose(pos, quat, scl);
    this.batchedMesh.setMatrixAt(enemyCollider.userData.id, m);
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

  createEnnemieRigidBody(spawnPosition, enemyInstanceID, deadInstanceID) {
    // Rigid body configuration
    const enemyRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    enemyRigidBodyDesc.setTranslation(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    );

    const enemyRigidBody =
      this.physics.world.createRigidBody(enemyRigidBodyDesc);

    // Collider configuration
    const enemyColliderDesc = RAPIER.ColliderDesc.cuboid(0.8, 1, 0.8);

    const enemyCollider = this.physics.world.createCollider(
      enemyColliderDesc,
      enemyRigidBody
    );
    enemyCollider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
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

    this.tmpMatrix.makeScale(2, 1, 1);
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
    });
  }

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const enemy = this.list[i];
      const enemyTranslation = enemy.rigidBody.translation();
      const enemyRotation = enemy.rigidBody.rotation();
      //   projectile.rigidBody.setLinvel(
      //     {
      //       x: projectile.directionVector.x * PROJECTILE_SPEED,
      //       y: 0,
      //       z: projectile.directionVector.z * PROJECTILE_SPEED,
      //     },
      //     true
      //   );
      const q = new THREE.Quaternion(
        enemyRotation.x,
        enemyRotation.y,
        enemyRotation.z,
        enemyRotation.w
      );
      const enemyPosition = new THREE.Vector3(
        enemyTranslation.x,
        enemyTranslation.y,
        enemyTranslation.z
      );

      const enemyMatrix = this.batchedMesh.getMatrixAt(
        enemy.instance,
        this.tmpMatrix
      );
      enemyMatrix.setPosition(enemyPosition.add(ENEMY_MESH_OFFSET));

      this.batchedMesh.setMatrixAt(enemy.instance, this.tmpMatrix);

      //   if (
      //     projectile.spawnPosition.distanceTo(projectileTranslation) >
      //     PROJECTILE_MAX_DISTANCE
      //   ) {
      //     this.destroyProjectile(i);
      //   }
    }
  }
}
