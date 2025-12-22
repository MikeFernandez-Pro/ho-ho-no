import * as THREE from "three";

export default class Sizes extends THREE.EventDispatcher {
  constructor() {
    super();

    // Setup
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.resolution = new THREE.Vector2(
      this.width * this.pixelRatio,
      this.height * this.pixelRatio
    );

    // Resize event
    window.addEventListener("resize", () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.pixelRatio = Math.min(window.devicePixelRatio, 2);

      this.resolution.set(
        this.width * this.pixelRatio,
        this.height * this.pixelRatio
      );

      this.dispatchEvent({ type: "resize" });
    });
  }
}
