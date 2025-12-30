import * as THREE from "three";
import { Howl, Howler } from "howler";

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
import Postprocessing from "#experience/postprocessing/Postprocessing.js";
import KillsCounter from "#experience/ui/KillsCounter.js";
import GameTimer from "#experience/ui/GameTimer.js";
import GameOver from "#experience/ui/GameOver.js";
import Loader from "#experience/ui/Loader.js";
import BoostIndicator from "#experience/ui/BoostIndicator.js";
import PhysicsDebug from "#utils/physicsDebug.js";

const backgroundMusic = new Howl({
  src: ["/audio/music/christmas.mp3"],
  volume: 0.1,
  loop: true,
  autoplay: false,
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
    // this.perf = new Perf ();
    this.physics = new Physics();
    // this.physicsDebug = new PhysicsDebug();
    this.world = new World();
    this.killsCounter = new KillsCounter();
    this.loader = new Loader();
    this.gameTimer = new GameTimer();
    this.gameOver = new GameOver();
    this.boostIndicator = new BoostIndicator();

    // Current active boost key (set by `BoostIndicator`, cleared when it expires)
    this.activeBoost = null;

    // Game state: only start gameplay (timer, physics, enemies, etc.) once Start is clicked
    this.gameStarted = false;
    this.gameStartAt = null; // seconds in `Time.elapsed` when the game started

    // Resize event
    this.sizes.addEventListener("resize", this.resize);

    // Time tick event
    this.time.addEventListener("tick", this.update);
  }

  startGame = () => {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.gameStartAt = this.time.elapsed;

    // Start audio only after a use gesture (Start click) to avoid autoplay blocking.
    // Keeps any other delays (e.g.r enemy approach) relative to this moment.
    try {
      Howler.ctx?.resume?.();
    } catch (e) {
      // no-op: some environments don't expose the audio context
    }
    if (!backgroundMusic.playing()) {
      backgroundMusic.play();
    }

    // Allow world subsystems to initialize their "start-of-run" timing (spawns, sounds, etc.)
    this.world?.startGame?.();
  };

  getGameElapsedSeconds = () => {
    if (!this.gameStarted || this.gameStartAt == null) return 0;
    return Math.max(0, this.time.elapsed - this.gameStartAt);
  };

  resize = () => {
    this.camera.resize();
    this.renderer.resize();
    this.postprocessing.resize();
  };

  update = () => {
    this.camera.update();

    // Gameplay should be fully paused until the player clicks Start
    if (this.gameStarted) {
      this.world.update();
      this.physics.update();
      // if (this.debug.active) this.physicsDebug.update();
    }

    // this.physicsDebug.update();
    this.postprocessing.update();
    this.gameTimer.update();
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

    // if (this.debug.active) this.debug.pane.destroy();
  }
}
