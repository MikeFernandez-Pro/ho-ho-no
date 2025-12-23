import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "#experience/Experience.js";

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
    this.experience.physics.world.createCollider(groundColliderDesc, rigidBody);

    // Create the arena collider
    this.arenaCollider = this.resources.items.arenaColliderModel;
    this.arenaColliderGeometry = this.arenaCollider.scene.children[0].geometry;

    let arenaColliderDesc = RAPIER.ColliderDesc.trimesh(
      this.arenaColliderGeometry.attributes.position.array,
      this.arenaColliderGeometry.index.array
    );
    this.experience.physics.world.createCollider(arenaColliderDesc, rigidBody);
  }
}
