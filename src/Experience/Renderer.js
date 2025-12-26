import * as THREE from "three";
import Experience from "#experience/Experience.js";

export default class Renderer {
  constructor() {
    this.experience = new Experience();
    this.canvas = this.experience.canvas;
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.camera = this.experience.camera;
    this.postprocessing = this.experience.postprocessing;
    this.debug = this.experience.debug;

    this.setInstance();
    this.setDebug();
  }

  setInstance() {
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    // this.instance.toneMappingExposure = 1.75;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.VSMShadowMap;
    this.instance.setClearColor("#cbe1f7");
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
  }

  setDebug() {
    if (this.debug.active) {
      this.debugFolder = this.debug.pane.addFolder({
        title: "Renderer",
        expanded: false,
      });

      const parameters = {
        toneMapping: THREE.ACESFilmicToneMapping,
      };

      this.debugFolder
        .addBinding(parameters, "toneMapping", {
          // Tweakpane expects either an object map {label: value} or
          // an array of {text, value} items — not a raw array of values.
          options: {
            None: THREE.NoToneMapping,
            Linear: THREE.LinearToneMapping,
            Reinhard: THREE.ReinhardToneMapping,
            ACESFilmic: THREE.ACESFilmicToneMapping,
          },
        })
        .on("change", (ev) => {
          this.instance.toneMapping = ev.value;
        });
    }
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
  }

  update() {
    this.instance.render(this.scene, this.camera.instance);
  }
}
