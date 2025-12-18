import * as THREE from "three";

export default class Time extends THREE.EventDispatcher {
  constructor() {
    super();

    // Setup
    this.start = Date.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 16;

    window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  tick() {
    const currentTime = Date.now();
    this.delta = currentTime - this.current;
    this.current = currentTime;
    this.elapsed = (this.current - this.start) * 0.001;

    this.dispatchEvent({ type: "tick" });

    window.requestAnimationFrame(() => {
      this.tick();
    });
  }
}
