import * as THREE from "three";

import Experience from "#experience/Experience.js";

import declarationsShaderChunk from "#shaders/elf/declarations.glsl?raw";
import logicShaderChunk from "#shaders/elf/logic.glsl?raw";

const CheeringElfsDatas = [
  new THREE.Vector3(-2, 1.7, -20),
  new THREE.Vector3(-10.6, 1.6, -16.7),
  new THREE.Vector3(-17.5, 1.6, -8.39),
  new THREE.Vector3(-14.1, 1.7, 13.8),
  new THREE.Vector3(4.6, 1.7, 19.6),
  new THREE.Vector3(16.4, 1.6, 11.1),
  new THREE.Vector3(19.4, 1.7, -1.4),
  new THREE.Vector3(16.4, 1.5, -10.0),
  new THREE.Vector3(8.6, 1.5, -17.1),
  new THREE.Vector3(-6.4, 1.7, 19),
];

const SittingElvesDatas = [
  {
    position: new THREE.Vector3(0.8, 2.3, -16.9),
    rotationY: -0.35,
  },
  {
    position: new THREE.Vector3(16.4, 2.3, -6.1),
    rotationY: -1.2,
  },
  {
    position: new THREE.Vector3(-13.0, 2.3, -11.9),
    rotationY: 0.45,
  },
  {
    position: new THREE.Vector3(-16.1, 2.3, 5.0),
    rotationY: 2.2,
  },
  {
    position: new THREE.Vector3(15.7, 2.4, 7.0),
    rotationY: -2.15,
  },
];

export default class Elf {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setTextures();
    this.setMaterial();
    this.setBatchedMesh();
    this.setGeometry();
    this.setInstances();
    this.setShadersConfig();

    // Reusable temp objects (avoid allocations in update loop)
    this._tmpLookDir = new THREE.Vector3();
    this._tmpEuler = new THREE.Euler();

    this._tmpMatrix = new THREE.Matrix4();
    this._tmpPosition = new THREE.Vector3();
    this._tmpQuaternion = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
  }

  setTextures() {
    this.gradientTexture = this.resources.items.gradientTexture;
    this.fiveToneTexture = this.resources.items.fiveToneTexture;
    this.elfCheeringVATTexture = this.resources.items.elfCheeringVATTexture;
    this.sittingVATTexture = this.resources.items.sittingVATTexture;
  }

  setMaterial() {
    this.elfMeshMaterial = new THREE.MeshToonMaterial({
      map: this.gradientTexture,
      gradientMap: this.fiveToneTexture,
    });
  }

  setBatchedMesh() {
    this.elfBatchedMesh = new THREE.BatchedMesh(
      15,
      3767,
      15522,
      this.elfMeshMaterial
    );

    this.elfBatchedMesh.castShadow = true;
    this.scene.add(this.elfBatchedMesh);
  }

  setGeometry() {
    const elfModel = this.resources.items.elfModel;
    const elfMesh = elfModel.scene.children[0];
    const elfMeshGeometry = elfMesh.geometry;

    this.elfGeometryID = this.elfBatchedMesh.addGeometry(elfMeshGeometry);
  }

  setInstances() {
    this.cherringElvesInstances = Array(CheeringElfsDatas.length).fill(
      undefined
    );
    for (const [index, position] of CheeringElfsDatas.entries()) {
      const instanceID = this.elfBatchedMesh.addInstance(this.elfGeometryID);
      const matrix = new THREE.Matrix4();
      matrix.setPosition(position);
      this.elfBatchedMesh.setMatrixAt(instanceID, matrix);
      this.cherringElvesInstances[index] = instanceID;
    }

    this.sittingElvesInstances = Array(SittingElvesDatas.length).fill(
      undefined
    );
    for (const [index, elfData] of SittingElvesDatas.entries()) {
      const instanceID = this.elfBatchedMesh.addInstance(this.elfGeometryID);
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(
        elfData.position.x,
        elfData.position.y,
        elfData.position.z
      );
      const quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, elfData.rotationY, 0)
      );
      const scale = new THREE.Vector3(2, 1, 1);
      matrix.compose(position, quaternion, scale);
      this.elfBatchedMesh.setMatrixAt(instanceID, matrix);
      this.sittingElvesInstances[index] = instanceID;
    }
  }

  setShadersConfig() {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 24 },
      uVATCheering: { value: this.elfCheeringVATTexture },
      uVATSitting: { value: this.sittingVATTexture },
      uTotalFramesCheering: { value: 30 },
      uTotalFramesSitting: { value: 108 },
    };

    this.elfBatchedMesh.material.uniforms = this.uniforms;
    this.elfBatchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    this.elfBatchedMesh.material.customProgramCacheKey = () => "elf_vat";
    this.elfBatchedMesh.customDepthMaterial.customProgramCacheKey = () =>
      "elf_vat_depth";

    this.configureMaterialShader(this.elfBatchedMesh.material);
    this.configureMaterialShader(this.elfBatchedMesh.customDepthMaterial);

    this.elfBatchedMesh.material.needsUpdate = true;
    this.elfBatchedMesh.customDepthMaterial.needsUpdate = true;
  }

  configureMaterialShader(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        declarationsShaderChunk
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        logicShaderChunk
      );
    };
  }

  update() {
    if (this.elfBatchedMesh.material) {
      this.elfBatchedMesh.material.uniforms.uTime.value = this.time.elapsed;

      const characterPosition =
        this.experience.world?.character?.characterScene?.position;

      if (!this.cherringElvesInstances?.length || !characterPosition) return;
      if (!this.sittingElvesInstances?.length || !characterPosition) return;

      for (const instanceID of this.cherringElvesInstances) {
        this.elfBatchedMesh.getMatrixAt(instanceID, this._tmpMatrix);
        this._tmpMatrix.decompose(
          this._tmpPosition,
          this._tmpQuaternion,
          this._tmpScale
        );

        // Yaw-only "look at" the character:
        // compute direction in XZ plane then convert to Y rotation (same convention as CharacterController)
        this._tmpLookDir.subVectors(characterPosition, this._tmpPosition);
        this._tmpLookDir.y = 0;
        if (this._tmpLookDir.lengthSq() > 1e-8) {
          const yaw = Math.atan2(this._tmpLookDir.x, this._tmpLookDir.z);
          this._tmpQuaternion.setFromEuler(this._tmpEuler.set(0, yaw, 0));
        }

        this._tmpMatrix.compose(
          this._tmpPosition,
          this._tmpQuaternion,
          this._tmpScale
        );
        this.elfBatchedMesh.setMatrixAt(instanceID, this._tmpMatrix);
      }

      if (!this.sittingElvesInstances?.length || !characterPosition) return;

      for (const instanceID of this.sittingElvesInstances) {
        this.elfBatchedMesh.getMatrixAt(instanceID, this._tmpMatrix);
        this._tmpMatrix.decompose(
          this._tmpPosition,
          this._tmpQuaternion,
          this._tmpScale
        );

        this._tmpLookDir.subVectors(characterPosition, this._tmpPosition);
        this._tmpLookDir.y = 0;
        if (this._tmpLookDir.lengthSq() > 1e-8) {
          // IMPORTANT: don't store yaw directly into scale.y (0..6.28) because it makes the
          // instance matrix scale jump and can break culling/shadows. Instead, store a tiny,
          // normalized value near 1.0 and decode it in the shader.
          const yaw = THREE.MathUtils.euclideanModulo(
            Math.atan2(this._tmpLookDir.x, this._tmpLookDir.z),
            Math.PI * 2
          ); // [0, 2PI)
          const ANGLE_ENCODE_SCALE = 0.01; // keep scale.y in ~[1.0, 1.01)
          const rotationAngle = (yaw / (Math.PI * 2)) * ANGLE_ENCODE_SCALE;
          this._tmpScale.y = 1 + rotationAngle;
        }
        this._tmpMatrix.compose(
          this._tmpPosition,
          this._tmpQuaternion,
          this._tmpScale
        );
        this.elfBatchedMesh.setMatrixAt(instanceID, this._tmpMatrix);
      }
    }
    arguments;
  }
}
