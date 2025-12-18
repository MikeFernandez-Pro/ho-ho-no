import { ThreePerf } from "three-perf";
import Experience from "../Experience.js";

export default class Perf {
  constructor() {
    this.experience = new Experience();
    this.renderer = this.experience.renderer;

    this.panel = new ThreePerf({
      anchorX: "left",
      anchorY: "top",
      domElement: document.body,
      renderer: this.renderer.instance,
      backgroundOpacity: 0.2,
    });
  }
}
