import * as THREE from "three";
import { Howl } from "howler";

import Debug from "#utils/Debug.js";
import Sizes from "#utils/Sizes.js";
import Time from "#utils/Time.js";
import Camera from "#experience/Camera.js";
import Renderer from "#experience/Renderer.js";
import World from "#world/World.js";
import Resources from "#utils/Resources.js";
import Perf from "#utils/Perf.js";
import sources from "#experience/sources.js";
import Physics from "#utils/physics.js";
import Postprocessing from "#experience/postprocessing/postprocessing.js";
import KillsCounter from "#experience/ui/KillsCounter.js";
// import PhysicsDebug from "#utils/physicsDebug.js";

const backgroundMusic = new Howl({
  src: ["/audio/music/christmas.mp3"],
  volume: 0.1,
  loop: true,
  autoplay: true,
  rate: 0.6,
});

let instance = null;

export default class Experience {
  constructor(_canvas) {
    // Singleton
    if (instance) {
      return instance;
    }
    instance = this;

    // Global access
    window.experience = this;

    // Options
    this.canvas = _canvas;

    // Setup
    this.debug = new Debug();
    this.sizes = new Sizes();
    this.time = new Time();
    this.scene = new THREE.Scene();
    this.resources = new Resources(sources);
    this.camera = new Camera();
    this.renderer = new Renderer();
    this.postprocessing = new Postprocessing();
    this.perf = new Perf();
    this.physics = new Physics();
    // this.physicsDebug = new PhysicsDebug();
    this.world = new World();
    this.killsCounter = new KillsCounter();

    // Resize event
    this.sizes.addEventListener("resize", this.resize);

    // Time tick event
    this.time.addEventListener("tick", this.update);
  }

  resize = () => {
    this.camera.resize();
    this.renderer.resize();
    this.postprocessing.resize();
  };

  update = () => {
    this.camera.update();
    this.world.update();
    this.physics.update();
    // this.physicsDebug.update();
    this.postprocessing.update();
  };

  destroy() {
    this.sizes.removeEventListener("resize", this.resize);
    this.time.removeEventListener("tick", this.update);

    // Traverse the whole scene
    this.scene.traverse((child) => {
      // Test if it's a mesh
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();

        // Loop through the material properties
        for (const key in child.material) {
          const value = child.material[key];

          // Test if there is a dispose function
          if (value && typeof value.dispose === "function") {
            value.dispose();
          }
        }
      }
    });

    this.camera.controls.dispose();
    this.renderer.instance.dispose();

    if (this.debug.active) this.debug.pane.destroy();
  }
}
