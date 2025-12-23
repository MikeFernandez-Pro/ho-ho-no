import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
import Experience from "#experience/Experience.js";

const PROJECTILE_SIZE = 0.4;
const PROJECTILE_COLLIDER_SIZE = PROJECTILE_SIZE * 0.5;
const PROJECTILE_SPEED = 50;
const PROJECTILE_MAX_DISTANCE = 50;

const SHOOT_OFFSET_LOCAL = new THREE.Vector3(-0.253, 0.596, 0.719);

export default class ProjectilesFactory {
  constructor(character) {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.physics = this.experience.physics;
    this.character = character;
    this.characterController = character.characterController;
    this.batchedMeshWorld = this.experience.world.batchedMeshWorld;
    this.testEnemy = this.experience.world.batchedMeshWorld.testEnemy;
    // NOTE: `ProjectileParticles` is created in `World` and may not exist yet
    // depending on initialization order. Always read it lazily from `world`.

    this.snowBallModel = this.resources.items.snowBallModel;
    this.gradientTexture = this.experience.resources.items.gradientTexture;

    this.list = [];
    this.tmpMatrix = new THREE.Matrix4();

    this.setGeometry();

    this.characterController.addEventListener("shoot", this.clickEventHandler);
    this.testEnemy.addEventListener("enemyHit", this.enemyHitEventHandler);

    this.physics.addEventListener("collision", this.collisionEventHandler);
  }

  collisionEventHandler = (event) => {
    const c1Type = event.collider1?.userData?.type;
    const c2Type = event.collider2?.userData?.type;
    const isProjectileArena =
      (c1Type === "projectile" && c2Type === "arena") ||
      (c1Type === "arena" && c2Type === "projectile");

    if (!isProjectileArena) {
      return;
    }

    const projectileId =
      c1Type === "projectile"
        ? event.collider1.userData.id
        : event.collider2.userData.id;

    this.destroyProjectileByInstance(projectileId);
  };

  clickEventHandler = (event) => {
    this.createProjectile(event.position, event.angle);
  };

  enemyHitEventHandler = (event) => {
    // `event.projectile` is a BatchedMesh *instance id* (not an index in `this.list`)
    this.destroyProjectileByInstance(event.projectile);
  };

  setGeometry() {
    this.geometry = this.snowBallModel.scene.children[0].geometry;

    const uv1 = this.geometry.attributes.uv.clone();

    this.geometry.setAttribute("uv1", uv1);

    this.geometryBatchedMeshId = this.batchedMeshWorld.batchedMesh.addGeometry(
      this.geometry
    );
  }

  createProjectileRigidBody(position, angle, projectileInstanceID) {
    // Rigid body configuration
    const projectileRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    projectileRigidBodyDesc.setTranslation(position.x, position.y, position.z);
    projectileRigidBodyDesc.setRotation({
      x: 0,
      y: Math.sin(angle * 0.5),
      z: 0,
      w: Math.cos(angle * 0.5),
    });
    // Helps avoid tunneling through thin trimesh colliders at high speed.
    projectileRigidBodyDesc.setCcdEnabled(true);

    const projectileRigidBody = this.physics.world.createRigidBody(
      projectileRigidBodyDesc
    );

    // Collider configuration
    const projectileColliderDesc = RAPIER.ColliderDesc.cuboid(
      PROJECTILE_COLLIDER_SIZE,
      PROJECTILE_COLLIDER_SIZE,
      PROJECTILE_COLLIDER_SIZE
    );
    projectileColliderDesc.setFriction(1);

    const projectileCollider = this.physics.world.createCollider(
      projectileColliderDesc,
      projectileRigidBody
    );
    projectileCollider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    projectileCollider.userData = {
      type: "projectile",
      id: projectileInstanceID,
    };

    return { rigidBody: projectileRigidBody, collider: projectileCollider };
  }

  createProjectile(position, angle) {
    const projectileInstanceID = this.batchedMeshWorld.batchedMesh.addInstance(
      this.geometryBatchedMeshId
    );

    // yaw quaternion from character angle
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle
    );

    // character forward (based on same yaw)
    const directionVector = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(yawQuat)
      .normalize();

    // rotate the local offset into world space
    const offsetWorld = SHOOT_OFFSET_LOCAL.clone().applyQuaternion(yawQuat);

    const spawnPosition = position.clone().add(offsetWorld);

    const { rigidBody, collider } = this.createProjectileRigidBody(
      spawnPosition,
      angle,
      projectileInstanceID
    );

    this.list.push({
      instance: projectileInstanceID,
      rigidBody,
      collider,
      spawnPosition,
      directionVector,
    });
  }

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const projectile = this.list[i];
      const projectileTranslation = projectile.rigidBody.translation();
      const projectileRotation = projectile.rigidBody.rotation();

      projectile.rigidBody.setLinvel(
        {
          x: projectile.directionVector.x * PROJECTILE_SPEED,
          y: 0,
          z: projectile.directionVector.z * PROJECTILE_SPEED,
        },
        true
      );

      const q = new THREE.Quaternion(
        projectileRotation.x,
        projectileRotation.y,
        projectileRotation.z,
        projectileRotation.w
      );
      const p = new THREE.Vector3(
        projectileTranslation.x,
        projectileTranslation.y,
        projectileTranslation.z
      );
      const s = new THREE.Vector3(1, 1, 1);
      this.tmpMatrix.compose(p, q, s);
      this.batchedMeshWorld.batchedMesh.setMatrixAt(
        projectile.instance,
        this.tmpMatrix
      );

      if (
        projectile.spawnPosition.distanceTo(projectileTranslation) >
        PROJECTILE_MAX_DISTANCE
      ) {
        this.destroyProjectile(i);
      }
    }
  }

  destroyProjectile(index) {
    const projectile = this.list[index];
    if (!projectile) return;

    const projectileParticles = this.experience.world.projectileParticles;
    if (projectileParticles) {
      projectileParticles.createProjectileParticles(
        projectile.rigidBody.translation()
      );
    }

    // remove mesh properly
    this.batchedMeshWorld.batchedMesh.deleteInstance(projectile.instance);

    // DO NOT dispose geometry/material here if they are shared
    // (dispose once in destroy())

    // Remove rigidbody; attached colliders get removed with it in Rapier
    this.physics.world.removeRigidBody(projectile.rigidBody);

    this.list.splice(index, 1);
  }

  destroyProjectileByInstance(instanceId) {
    const index = this.list.findIndex((p) => p.instance === instanceId);
    if (index === -1) return;
    this.destroyProjectile(index);
  }

  destroy() {
    this.characterController.removeEventListener(
      "shoot",
      this.clickEventHandler
    );

    // remove all projectiles
    for (let i = this.list.length - 1; i >= 0; i--) {
      this.destroyProjectile(i);
    }

    // Note: `geometryBatchedMeshId` is a geometry id in BatchedMesh (not an instance id),
    // and the projectile geometry/material may be shared with loaded resources.
    // So we intentionally avoid disposing/removing them here.
  }
}
