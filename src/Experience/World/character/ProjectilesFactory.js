import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
import Experience from "#experience/experience.js";

const PROJECTILE_SIZE = 0.4;
const PROJECTILE_COLLIDER_SIZE = PROJECTILE_SIZE * 0.5;
const PROJECTILE_SPEED = 20;
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

    this.snowBallModel = this.resources.items.snowBallModel;
    this.gradientTexture = this.experience.resources.items.gradientTexture;

    this.list = [];
    this.tmpMatrix = new THREE.Matrix4();

    this.setGeometry();

    this.characterController.addEventListener("shoot", this.clickEventHandler);
  }

  clickEventHandler = (event) => {
    this.createProjectile(event.position, event.angle);
  };

  setGeometry() {
    this.geometry = this.snowBallModel.scene.children[0].geometry;
    this.geometryBatchedMeshId = this.batchedMeshWorld.batchedMesh.addGeometry(
      this.geometry
    );
  }

  createProjectileRigidBody(position, angle) {
    // Rigid body configuration
    const projectileRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    projectileRigidBodyDesc.setTranslation(position.x, position.y, position.z);
    projectileRigidBodyDesc.setRotation({
      x: 0,
      y: Math.sin(angle * 0.5),
      z: 0,
      w: Math.cos(angle * 0.5),
    });

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
    projectileCollider.userData = "projectile";

    return { rigidBody: projectileRigidBody, collider: projectileCollider };
  }

  createProjectile(position, angle) {
    const projectileInstance = this.batchedMeshWorld.batchedMesh.addInstance(
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
      angle
    );

    this.list.push({
      instance: projectileInstance,
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

    // remove mesh properly
    this.batchedMeshWorld.batchedMesh.deleteInstance(projectile.instance);

    // DO NOT dispose geometry/material here if they are shared
    // (dispose once in destroy())

    // Remove rigidbody; attached colliders get removed with it in Rapier
    this.physics.world.removeRigidBody(projectile.rigidBody);

    this.list.splice(index, 1);
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

    // remove + dispose the shared resources once
    this.batchedMeshWorld.batchedMesh.deleteInstance(
      this.geometryBatchedMeshId
    );
    this.geometry.dispose();
    this.material.dispose();
  }
}
