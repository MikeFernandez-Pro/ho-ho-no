import Experience from "#experience/experience.js";
import * as RAPIER from "@dimforge/rapier3d";
import * as THREE from "three";

const GRAVITY = -9.81;
export default class Physics extends THREE.EventDispatcher {
  constructor() {
    super();

    this.experience = new Experience();
    this.time = this.experience.time;
    this.scene = this.experience.scene;

    this.world = new RAPIER.World({ x: 0, y: GRAVITY * 3, z: 0 });
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  update() {
    this.world.timestep = this.time.delta * 0.001;
    this.world.step(this.eventQueue);

    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const collider1 = this.world.getCollider(handle1);
      const collider2 = this.world.getCollider(handle2);

      if (started) {
        this.dispatchEvent({ type: "collision", collider1, collider2 });
      }
    });
  }

  destroy() {
    this.eventQueue.free();
  }
}
