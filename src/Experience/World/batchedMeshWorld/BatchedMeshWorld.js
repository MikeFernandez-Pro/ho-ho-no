import * as THREE from "three";
import Experience from "#experience/Experience.js";

export default class BatchedMeshWorld {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setTextures();
    this.setMaterial();
    this.setBatchedMesh();
  }

  setTextures = () => {
    this.gradientTexture = this.resources.items.gradientTexture;
    this.gradientTexture.colorSpace = THREE.SRGBColorSpace;
    this.gradientTexture.flipY = false;

    this.fiveToneTexture = this.resources.items.fiveToneTexture;
    this.fiveToneTexture.colorSpace = THREE.SRGBColorSpace;
    this.fiveToneTexture.flipY = false;
    this.fiveToneTexture.minFilter = THREE.NearestFilter;
    this.fiveToneTexture.magFilter = THREE.NearestFilter;
    this.fiveToneTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.fiveToneTexture.wrapT = THREE.ClampToEdgeWrapping;
  };

  setMaterial = () => {
    // Match Character Toon Material.js material "style": MeshBasicMaterial + shader chunk overrides
    this.material = new THREE.MeshToonMaterial({
      map: this.gradientTexture,
      gradientMap: this.fiveToneTexture,
    });
  };

  setBatchedMesh = () => {
    this.batchedMesh = new THREE.BatchedMesh(
      10000,
      1000000,
      1000000,
      this.material
    );
    this.batchedMesh.castShadow = true;
    this.batchedMesh.receiveShadow = true;

    this.scene.add(this.batchedMesh);
  };
}
