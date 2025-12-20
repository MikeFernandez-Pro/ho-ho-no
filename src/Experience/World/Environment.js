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
      this.debugFolder = this.debug.ui.addFolder("environment");
    }

    this.setSunLight();
    this.setAmbientLight();
    this.setEnvironmentMap();
    this.setFog(); //
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
    this.sunLight.position.set(90.5, 50, -30.5);
    this.scene.add(this.sunLight);

    // Debug
    if (this.debug.active) {
      this.debugFolder
        .add(this.sunLight, "intensity")
        .name("sunLightIntensity")
        .min(0)
        .max(10)
        .step(0.001);

      this.debugFolder
        .add(this.sunLight.position, "x")
        .name("sunLightX")
        .min(-5)
        .max(5)
        .step(0.001);

      this.debugFolder
        .add(this.sunLight.position, "y")
        .name("sunLightY")
        .min(-5)
        .max(5)
        .step(0.001);

      this.debugFolder
        .add(this.sunLight.position, "z")
        .name("sunLightZ")
        .min(-5)
        .max(5)
        .step(0.001);

      this.debugFolder
        .add(this.sunLight.shadow, "normalBias")
        .name("sunLightShadowNormalBias")
        .min(-0.2)
        .max(0.2)
        .step(0.001);
    }
  }

  setAmbientLight() {
    this.ambientLight = new THREE.AmbientLight("#ffffff", 17);
    this.scene.add(this.ambientLight);

    if (this.debug.active) {
      this.debugFolder
        .add(this.ambientLight, "intensity")
        .name("ambientLightIntensity")
        .min(0)
        .max(15)
        .step(0.001);
    }
  }

  setEnvironmentMap() {
    this.environmentMap = {};
    this.environmentMap.intensity = 0.5;
    this.environmentMap.texture = this.resources.items.environmentMapTexture;
    this.environmentMap.texture.colorSpace = THREE.SRGBColorSpace;

    this.scene.environment = this.environmentMap.texture;
    this.scene.environmentIntensity = this.environmentMap.intensity;

    this.environmentMap.updateMaterials = () => {
      this.scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial
        ) {
          child.material.envMap = this.environmentMap.texture;
          child.material.envMapIntensity = this.environmentMap.intensity;
          child.material.needsUpdate = true;
        }
      });
    };
    this.environmentMap.updateMaterials();

    // Debug
    if (this.debug.active) {
      this.debugFolder
        .add(this.environmentMap, "intensity")
        .name("envMapIntensity")
        .min(0)
        .max(4)
        .step(0.001)
        .onChange(this.environmentMap.updateMaterials);
    }
  }

  setFog() {
    this.scene.fog = new THREE.Fog("#cbe1f7", 100, 300);
  }
}
