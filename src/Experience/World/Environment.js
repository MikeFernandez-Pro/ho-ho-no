import * as THREE from "three";
import Experience from "#experience/Experience.js";

export default class Environment {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;
    this.camera = this.experience.camera;

    // temp objects (avoid allocations each frame)
    this._tmpTarget = new THREE.Vector3();
    this._tmpLightPos = new THREE.Vector3();

    // By default, keep the directional light "stuck" to the camera (requested behavior)
    this.followCamera = true;
    // Keep the default offset the light originally had
    this.followCameraOffset = new THREE.Vector3(15, 30, 20);

    // Debug
    if (this.debug.active) {
      this.debugFolder = this.debug.pane.addFolder({
        title: "lighting",
        expanded: false,
      });
    }

    this.setSunLight();
    // Debug shadow camera frustum
    if (this.debug.active) {
      this.cameraHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
      this.scene.add(this.cameraHelper);
    }

    this.scene.add(new THREE.AmbientLight("#ffffff", 1));
  }

  setSunLight() {
    this.sunLight = new THREE.DirectionalLight("#ffffff", 2.5);
    this.sunLight.castShadow = true;
    // Shadow quality depends mostly on (a) mapSize and (b) how tightly the shadow camera
    // bounds the area where you actually need shadows.
    this.sunLight.shadow.mapSize.set(1024, 1024);

    // Avoid near=0 (can cause precision issues / weird artifacts)
    this.sunLight.shadow.camera.near = 40;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 22;
    this.sunLight.shadow.camera.bottom = -10;
    // Default was extremely high; keep it small and tune if you see acne/peter-panning.
    this.sunLight.shadow.normalBias = 0.02;
    // Softer edges for PCF-based shadow maps
    this.sunLight.shadow.radius = 2;
    this.sunLight.position.set(15, 30, 20);
    this.scene.add(this.sunLight);
    // Important: the target must be in the scene graph so it can be positioned/updated
    this.scene.add(this.sunLight.target);

    // Ensure changes take effect immediately
    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.sunLight.shadow.needsUpdate = true;

    // Debug
    if (this.debug.active) {
      const parameters = {
        followCamera: this.followCamera,
        intensity: 2.5,
        position: {
          x: 10,
          y: 10,
          z: 10,
        },
        shadow: {
          normalBias: 0.02,
        },
      };

      this.debugFolder
        .addBinding(parameters, "followCamera")
        .on("change", (ev) => {
          this.followCamera = ev.value;
        });

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
          if (!this.followCamera) this.sunLight.position.x = ev.value;
        });

      this.debugFolder
        .addBinding(parameters.position, "y", {
          min: -5,
          max: 5,
          step: 0.001,
        })
        .on("change", (ev) => {
          if (!this.followCamera) this.sunLight.position.y = ev.value;
        });

      this.debugFolder
        .addBinding(parameters.position, "z", {
          min: -5,
          max: 5,
          step: 0.001,
        })
        .on("change", (ev) => {
          if (!this.followCamera) this.sunLight.position.z = ev.value;
        });

      this.debugFolder
        .addBinding(parameters.shadow, "normalBias", {
          min: -0.1,
          max: 0.1,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.sunLight.shadow.normalBias = ev.value;
        });
    }
  }

  update() {
    if (!this.sunLight || !this.followCamera || !this.camera?.instance) return;

    // Light position follows camera with a fixed offset (default: 15,30,20)
    this._tmpLightPos
      .copy(this.camera.instance.position)
      .add(this.followCameraOffset);
    this.sunLight.position.copy(this._tmpLightPos);

    // Light target follows what the camera/controls are looking at (best "accordingly" default)
    if (this.camera.controls) {
      this.sunLight.target.position.copy(this.camera.controls.target);
    } else {
      // Fallback: point straight ahead from the camera
      this.camera.instance.getWorldDirection(this._tmpTarget);
      this._tmpTarget.add(this.camera.instance.position);
      this.sunLight.target.position.copy(this._tmpTarget);
    }

    if (this.cameraHelper) this.cameraHelper.update();
  }
}
