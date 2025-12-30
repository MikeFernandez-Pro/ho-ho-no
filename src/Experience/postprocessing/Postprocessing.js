import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import * as THREE from "three";

import Experience from "#experience/Experience.js";
import Vignette from "./Vignette.js";

export default class Postprocessing {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.camera = this.experience.camera;
    this.renderer = this.experience.renderer;
    this.sizes = this.experience.sizes;
    this.debug = this.experience.debug;

    const size = new THREE.Vector2();
    this.renderer.instance.getSize(size);

    const dpr = this.renderer.instance.getPixelRatio();
    const isWebGL2 = this.renderer.instance.capabilities.isWebGL2;

    this.renderTarget = new THREE.WebGLRenderTarget(
      Math.floor(size.x * dpr),
      Math.floor(size.y * dpr),
      { samples: isWebGL2 ? (dpr <= 1 ? 4 : 0) : 0 }
    );

    this.effectComposer = new EffectComposer(
      this.renderer.instance,
      this.renderTarget
    );
    this.effectComposer.setSize(this.sizes.width, this.sizes.height);
    this.effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderPass = new RenderPass(this.scene, this.camera.instance);
    this.effectComposer.addPass(this.renderPass);

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(this.sizes.width, this.sizes.height),
      this.scene,
      this.camera.instance
    );
    this.outlinePass.visibleEdgeColor = new THREE.Color(0xffffff);
    this.outlinePass.edgeStrength = 6.86;
    this.outlinePass.edgeGlow = 1;
    this.outlinePass.edgeThickness = 3.12;

    this.effectComposer.addPass(this.outlinePass);

    this.vignettePass = new Vignette();
    this.effectComposer.addPass(this.vignettePass);

    // Anti-aliasing (operate in linear space before tone mapping / output conversion)
    if (
      this.renderer.instance.getPixelRatio() === 1 &&
      !this.renderer.instance.capabilities.isWebGL2
    ) {
      const smaaPass = new SMAAPass();
      this.effectComposer.addPass(smaaPass);

      console.log("Using SMAA");
    }

    // Final output: tone mapping + output color space conversion
    this.outputPass = new OutputPass();
    this.effectComposer.addPass(this.outputPass);

    this.setDebug();
  }

  setDebug() {
    if (this.debug.active) {
      this.debugFolder = this.debug.pane.addFolder({
        title: "Outline",
        expanded: false,
      });

      const parameters = {
        edgeStrength: 3.0,
        edgeGlow: 0.0,
        edgeThickness: 1.0,
        visibleEdgeColor: "#ff0000",
      };

      this.debugFolder
        .addBinding(parameters, "edgeStrength", {
          min: 0.01,
          max: 30,
          step: 0.01,
        })
        .on("change", (ev) => {
          this.outlinePass.edgeStrength = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "edgeGlow", { min: 0.0, max: 1, step: 0.01 })
        .on("change", (ev) => {
          this.outlinePass.edgeGlow = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "edgeThickness", {
          min: 1,
          max: 14,
          step: 0.01,
        })
        .on("change", (ev) => {
          this.outlinePass.edgeThickness = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "visibleEdgeColor")
        .on("change", (ev) => {
          this.outlinePass.visibleEdgeColor = new THREE.Color(ev.value);
        });
    }
  }

  resize() {
    this.effectComposer.setSize(this.sizes.width, this.sizes.height);
    this.effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const size = new THREE.Vector2();
    this.renderer.instance.getSize(size);
    const dpr = this.renderer.instance.getPixelRatio();

    this.renderTarget.setSize(
      Math.floor(size.x * dpr),
      Math.floor(size.y * dpr)
    );
  }

  update() {
    // const perf = this.experience.perf;

    const world = this.experience.world;

    if (world.character) {
      this.outlinePass.selectedObjects = [world.character.characterScene];
    }

    // if (perf) {
    //   perf.panel.begin();
    // }

    //this.instance.render(this.scene, this.camera.instance);
    this.effectComposer.render();

    // if (perf) {
    //   perf.panel.end();
    // }
  }
}
