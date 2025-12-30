import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import * as THREE from "three";
import gsap from "gsap";

import Experience from "#experience/Experience.js";
import Vignette from "./Vignette.js";

const OUTLINE_MAX_STRENGTH = 6.5;
export default class Postprocessing {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.camera = this.experience.camera;
    this.renderer = this.experience.renderer;
    this.sizes = this.experience.sizes;
    this.debug = this.experience.debug;

    this.boostsListenersActivated = false;

    this.createEffectComposer();
    this.createRenderPass();
    this.createOutlinePass();
    this.createVignettePass();
    this.createAntiAliasingPass();
    this.createOutputPass();
    this.createOutlineAnimation();
  }

  createEffectComposer() {
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
  }

  createRenderPass() {
    this.renderPass = new RenderPass(this.scene, this.camera.instance);
    this.effectComposer.addPass(this.renderPass);
  }

  createOutlinePass() {
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(this.sizes.width, this.sizes.height),
      this.scene,
      this.camera.instance
    );
    this.outlinePass.visibleEdgeColor = new THREE.Color(0xffffff);
    this.outlinePass.edgeStrength = 0;
    this.outlinePass.edgeGlow = 1;
    this.outlinePass.edgeThickness = 3;

    this.effectComposer.addPass(this.outlinePass);
  }

  createVignettePass() {
    this.vignettePass = new Vignette();
    this.effectComposer.addPass(this.vignettePass);
  }

  createAntiAliasingPass() {
    // Anti-aliasing (operate in linear space before tone mapping / output conversion)
    if (
      this.renderer.instance.getPixelRatio() === 1 &&
      !this.renderer.instance.capabilities.isWebGL2
    ) {
      this.smaaPass = new SMAAPass();
      this.effectComposer.addPass(this.smaaPass);
    }
  }

  createOutputPass() {
    this.outputPass = new OutputPass();
    this.effectComposer.addPass(this.outputPass);
  }

  createOutlineAnimation() {
    this.outlineAnimation = gsap.to(this.outlinePass, {
      edgeStrength: OUTLINE_MAX_STRENGTH,
      duration: 0.25,
      ease: "power2.out",
      paused: true,
    });
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

  activateOutlinePass = () => {
    this.outlineAnimation.play();
  };

  deactivateOutlinePass = () => {
    this.outlineAnimation.reverse();
  };

  update() {
    // const perf = this.experience.perf;

    const world = this.experience.world;

    if (world.character) {
      this.outlinePass.selectedObjects = [world.character.characterScene];
    }

    if (!this.boostsListenersActivated && this.experience.boostIndicator) {
      this.boostsListenersActivated = true;
      this.experience.boostIndicator.addEventListener(
        "boost-activated",
        this.activateOutlinePass
      );
      this.experience.boostIndicator.addEventListener(
        "boost-expired",
        this.deactivateOutlinePass
      );
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

  destroy() {
    this.outlineAnimation.kill();
    this.outlineAnimation = null;
    this.boostsListenersActivated = false;
    this.experience.boostIndicator.removeEventListener(
      "boost-activated",
      this.activateOutlinePass
    );
    this.experience.boostIndicator.removeEventListener(
      "boost-expired",
      this.deactivateOutlinePass
    );
  }
}
