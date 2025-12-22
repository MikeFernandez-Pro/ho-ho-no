import * as THREE from "three";
import Experience from "#experience/Experience.js";

export default class Environment {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;

    // Debug
    if (this.debug.active) {
      this.debugFolder = this.debug.pane.addFolder({
        title: "lighting",
        expanded: false,
      });
    }

    this.setSunLight();
  }

  setSunLight() {
    this.sunLight = new THREE.DirectionalLight("#ffffff", 2.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.near = 40;
    this.sunLight.shadow.camera.far = 190;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -35;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.normalBias = 0.2;
    this.sunLight.position.set(10, 10, 10);
    this.scene.add(this.sunLight);

    const cameraHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
    this.scene.add(cameraHelper);

    // Debug
    if (this.debug.active) {
      const parameters = {
        intensity: 2.5,
        position: {
          x: 10,
          y: 10,
          z: 10,
        },
        shadow: {
          normalBias: 0.2,
        },
      };

      this.debugFolder
        .addBinding(parameters, "intensity", {
          min: 0,
          max: 10,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.sunLight.intensity = ev.value;
        });

      this.debugFolder
        .addBinding(parameters.position, "x", {
          min: -5,
          max: 5,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.sunLight.position.x = ev.value;
        });

      this.debugFolder
        .addBinding(parameters.position, "y", {
          min: -5,
          max: 5,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.sunLight.position.y = ev.value;
        });

      this.debugFolder
        .addBinding(parameters.position, "z", {
          min: -5,
          max: 5,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.sunLight.position.z = ev.value;
        });

      this.debugFolder
        .addBinding(parameters.shadow, "normalBias", {
          min: -0.2,
          max: 0.2,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.sunLight.shadow.normalBias = ev.value;
        });
    }
  }
}
