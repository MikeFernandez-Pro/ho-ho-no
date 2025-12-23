import * as THREE from "three";

import Experience from "#experience/Experience.js";

import vertexShader from "#shaders/snow/vertex.glsl?raw";
import fragmentShader from "#shaders/snow/fragment.glsl?raw";

export default class Snow {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.camera = this.experience.camera;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.sizes = this.experience.sizes;
    this.character = this.experience.world.character;
    this.debug = this.experience.debug;

    this.count = 10000;
    this.speed = 0.9;
    this.size = 0.2;

    this.smoothedVelocity = new THREE.Vector3();
    this.targetVelocity = new THREE.Vector3();

    // tweak: bigger = snappier, smaller = smoother
    this.velocitySmoothing = 0.0005 * 0.001;

    // optional: if your linvel is e.g. 0 or ±5, set that here so shader scaling stays sane
    this.maxLinvel = 5.0 * 0.001;

    // Geometry
    const positionsArray = new Float32Array(this.count * 3);
    const scaleArray = new Float32Array(this.count * 1);
    const movementArray = new Float32Array(this.count * 1);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      positionsArray[i3] = (Math.random() - 0.5) * 90;
      positionsArray[i3 + 1] = Math.random() * 20;
      positionsArray[i3 + 2] = (Math.random() - 0.5) * 90;

      scaleArray[i] = Math.random() * 0.5 + 0.5;
      movementArray[i] = Math.random();
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positionsArray, 3)
    );

    this.geometry.setAttribute(
      "aScale",
      new THREE.BufferAttribute(scaleArray, 1)
    );

    this.geometry.setAttribute(
      "aMovement",
      new THREE.BufferAttribute(movementArray, 1)
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uSize: { value: this.size },
        uSpeed: { value: this.speed },
        uResolution: { value: this.sizes.resolution },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#ffffff") },
        uFadeNear: { value: -21.0 },
        uFadeFar: { value: 126.0 },
      },
      transparent: true,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);

    if (this.debug.active) {
      const parameters = {
        color: "#ffffff",
        uFadeNear: 2.0,
        uFadeFar: 20.0,
      };

      this.debugFolder = this.debug.pane.addFolder({
        title: "Snow",
        expanded: false,
      });

      this.debugFolder.addBinding(parameters, "color").on("change", (ev) => {
        this.material.uniforms.uColor.value = new THREE.Color(ev.value);
      });

      this.debugFolder
        .addBinding(parameters, "uFadeNear")
        .on("change", (ev) => {
          this.material.uniforms.uFadeNear.value = ev.value;
        });

      this.debugFolder.addBinding(parameters, "uFadeFar").on("change", (ev) => {
        this.material.uniforms.uFadeFar.value = ev.value;
      });
    }
  }

  update() {
    this.material.uniforms.uTime.value = this.time.elapsed;
  }
}
