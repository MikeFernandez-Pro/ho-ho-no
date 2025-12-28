import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
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
