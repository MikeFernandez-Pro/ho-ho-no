import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "../Experience.js";

export default class Camp {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.physics = this.experience.physics;

    this.gradientTexture = this.resources.items.gradientTexture;

    this.campScene = this.resources.items.campModel.scene;
    this.campScene.position.y = 0.5;

    this.campScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true;
        child.castShadow = true;
        child.material.map = this.gradientTexture;
      }
    });

    this.scene.add(this.campScene);

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
  }
}
