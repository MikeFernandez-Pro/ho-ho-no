import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "#experience/Experience.js";
import { CollisionGroup, makeCollisionGroups } from "#utils/collisionGroups.js";

export default class Camp {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.physics = this.experience.physics;
    this.batchedMeshWorld = this.experience.world.batchedMeshWorld;

    this.gradientTexture = this.resources.items.gradientTexture;

    this.campScene = this.resources.items.campModel.scene;
    const campGeometry = this.campScene.children[0].geometry;

    this.campGeometryId =
      this.batchedMeshWorld.batchedMesh.addGeometry(campGeometry);

    this.campInstance = this.batchedMeshWorld.batchedMesh.addInstance(
      this.campGeometryId
    );

    const campMatrix = new THREE.Matrix4();
    campMatrix.setPosition(new THREE.Vector3(0.0, 0.5, 0.0));
    this.batchedMeshWorld.batchedMesh.setMatrixAt(
      this.campInstance,
      campMatrix
    );

    // Create a dynamic rigid-body.
    let rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      0.0,
      0.0,
      0.0
    );

    let rigidBody = this.physics.world.createRigidBody(rigidBodyDesc);

    // Create the ground
    let groundColliderDesc = RAPIER.ColliderDesc.cuboid(100, 0.5, 100);
    this.groundCollider = this.experience.physics.world.createCollider(
      groundColliderDesc,
      rigidBody
    );
    // Keep ground collisions for everyone that needs to stand / interact with it.
    this.groundCollider.setCollisionGroups(
      makeCollisionGroups(
        CollisionGroup.GROUND,
        CollisionGroup.ENEMY |
          CollisionGroup.CHARACTER |
          CollisionGroup.PROJECTILE |
          CollisionGroup.GIFT
      )
    );
    this.groundCollider.userData = { type: "ground" };

    // Create the arena collider
    this.arenaColliderMesh = this.resources.items.arenaColliderModel;
    this.arenaColliderGeometry =
      this.arenaColliderMesh.scene.children[0].geometry;

    let arenaColliderDesc = RAPIER.ColliderDesc.trimesh(
      this.arenaColliderGeometry.attributes.position.array,
      this.arenaColliderGeometry.index.array
    );
    this.arenaCollider = this.experience.physics.world.createCollider(
      arenaColliderDesc,
      rigidBody
    );
    // Make sure collision events can be generated for interactions with this collider.
    // (Projectiles enable collision events too, but this makes debugging clearer.)
    this.arenaCollider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    // Arena should block the character & stop projectiles, but enemies should pass through
    // so they don't get stuck and can reach the character reliably.
    this.arenaCollider.setCollisionGroups(
      makeCollisionGroups(
        CollisionGroup.ARENA,
        CollisionGroup.CHARACTER |
          CollisionGroup.PROJECTILE |
          CollisionGroup.GIFT
      )
    );
    this.arenaCollider.userData = {
      type: "arena",
    };
  }
}
