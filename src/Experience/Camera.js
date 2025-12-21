import * as THREE from "three";
import Experience from "#experience/Experience.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const FOLLOW_LERP = 0.03; // 0..1 (higher = snappier)

export default class Camera {
  constructor() {
    this.experience = new Experience();
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.canvas = this.experience.canvas;

    // temp objects (avoid allocations each frame)
    this._tmpTarget = new THREE.Vector3();
    this._tmpDesiredPos = new THREE.Vector3();
    this._tmpOffset = new THREE.Vector3();

    this.setInstance();
    this.setControls();
  }

  setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );
    this.instance.position.set(0, 15, 20);
    this.scene.add(this.instance);
  }

  setControls() {
    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    // Smooth follow the character (if present)
    const character = this.experience.world?.character;
    const characterScene = character?.characterScene;

    if (characterScene) {
      this._tmpTarget.copy(characterScene.position);

      // Keep current camera offset relative to controls target (so orbit still works)
      this._tmpOffset.copy(this.instance.position).sub(this.controls.target);
      this._tmpDesiredPos.copy(this._tmpTarget).add(this._tmpOffset);

      this.controls.target.lerp(this._tmpTarget, FOLLOW_LERP);
      this.instance.position.lerp(this._tmpDesiredPos, FOLLOW_LERP);
    }

    this.controls.update();
  }
}
