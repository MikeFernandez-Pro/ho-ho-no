import * as THREE from "three";
import Experience from "../Experience.js";
import * as RAPIER from "@dimforge/rapier3d";

export default class DummyTarget {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.physics = this.experience.physics;

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    this.scene.add(this.mesh);

    // Physics
    this.rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    this.rigidBodyDesc.setTranslation(10, 3, -10);
    this.rigidBody = this.physics.world.createRigidBody(this.rigidBodyDesc);
    this.colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
    this.collider = this.physics.world.createCollider(
      this.colliderDesc,
      this.rigidBody
    );
    this.collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    this.collider.userData = "dummyTarget";

    // this.physics.addEventListener("collision", this.collisionEventHandler);
  }

  collisionEventHandler = (event) => {
    if (
      (event.collider1.handle === this.collider.handle ||
        event.collider2.handle === this.collider.handle) &&
      (event.collider1.userData === "projectile" ||
        event.collider2.userData === "projectile")
    ) {
      console.log("collision", event.collider1, event.collider2);
      this.mesh.visible = false;
    }
  };

  update() {
    this.mesh.position.x = this.rigidBody.translation().x;
    this.mesh.position.y = this.rigidBody.translation().y;
    this.mesh.position.z = this.rigidBody.translation().z;
  }
}
