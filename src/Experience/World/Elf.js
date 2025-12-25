import * as THREE from "three";

import Experience from "#experience/Experience.js";

import declarationsShaderChunk from "#shaders/elf/declarations.glsl?raw";
import logicShaderChunk from "#shaders/elf/logic.glsl?raw";

const CheeringElfsDatas = [
  new THREE.Vector3(-2, 1.7, -20),
  new THREE.Vector3(-10.6, 1.6, -16.7),
  new THREE.Vector3(-17.5, 1.6, -8.399999618530273),
  new THREE.Vector3(-18.4, 1.7, 5.9),
  new THREE.Vector3(-14.1, 1.7, 13.8),
  new THREE.Vector3(4.6, 1.7, 19.6),
  new THREE.Vector3(16.4, 1.6, 11.1),
  new THREE.Vector3(19.4, 1.7, -1.4),
  new THREE.Vector3(16.4, 1.5, -10.0),
  new THREE.Vector3(8.6, 1.5, -17.1),
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
];

export default class Elf {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.debug = this.experience.debug;

    this.setTextures();
    this.setMaterial();
    this.setBatchedMesh();
    this.setGeometry();
    this.setInstances();
    this.setShadersConfig();

    // Reusable temp objects (avoid allocations in update loop)
    this._tmpLookDir = new THREE.Vector3();
    this._tmpEuler = new THREE.Euler();

    this.parameters = {
      position: {
        x: 0,
        y: 1.7,
        z: 0,
      },
      rotationY: 0,
    };

    if (this.debug.active) {
      this.debugFolder = this.debug.pane.addFolder({
        title: "Elf",
        expanded: false,
      });

      this.debugFolder.addBinding(this.parameters.position, "x", {
        label: "posX",
        step: 0.1,
      });

      this.debugFolder.addBinding(this.parameters.position, "y", {
        label: "posY",
        step: 0.1,
      });

      this.debugFolder.addBinding(this.parameters.position, "z", {
        label: "posZ",
        step: 0.1,
      });

      this.debugFolder.addBinding(this.parameters, "rotationY", {
        label: "rotY",
        step: 0.05,
      });
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "e") {
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3(0, 1.7, 0);
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, 0)
        );
        const scale = new THREE.Vector3(1, 1, 1);
        this.elfBatchedMesh.getMatrixAt(this.elfInstanceID2, matrix);
        matrix.decompose(position, quaternion, scale);
        console.log(
          `position: ${position.x.toFixed(3)}, ${position.y.toFixed(
            3
          )}, ${position.z.toFixed(3)}, \n quaternion: ${quaternion.x.toFixed(
            3
          )}, ${quaternion.y.toFixed(3)}, ${quaternion.z.toFixed(
            3
          )}, ${quaternion.w.toFixed(3)}`
        );
      }
    });
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
      20,
      100000,
      100000000,
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
    // this.elfInstanceID = this.elfBatchedMesh.addInstance(this.elfGeometryID);

    // const matrix = new THREE.Matrix4();
    // const position = new THREE.Vector3(-20, 1.7, 0.5);
    // const quaternion = new THREE.Quaternion().setFromEuler(
    //   new THREE.Euler(0, Math.PI / 2, 0)
    // );
    // const scale = new THREE.Vector3(1, 1, 1);
    // matrix.compose(position, quaternion, scale);
    // this.elfBatchedMesh.setMatrixAt(this.elfInstanceID, matrix);

    // this.elfInstanceID2 = this.elfBatchedMesh.addInstance(this.elfGeometryID);

    // const matrix2 = new THREE.Matrix4();
    // const position2 = new THREE.Vector3(3, 1.7, 3);
    // const quaternion2 = new THREE.Quaternion().setFromEuler(
    //   new THREE.Euler(0, Math.PI / 2, 0)
    // );
    // const scale2 = new THREE.Vector3(2, 1, 1);
    // matrix2.compose(position2, quaternion2, scale2);
    // this.elfBatchedMesh.setMatrixAt(this.elfInstanceID2, matrix2);

    this.cherringElvesInstances = [];
    for (const position of CheeringElfsDatas) {
      const instanceID = this.elfBatchedMesh.addInstance(this.elfGeometryID);
      const matrix = new THREE.Matrix4();
      matrix.setPosition(position);
      this.elfBatchedMesh.setMatrixAt(instanceID, matrix);
      this.cherringElvesInstances.push(instanceID);
    }

    this.sittingElvesInstances = [];
    for (const elfData of SittingElvesDatas) {
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
      this.sittingElvesInstances.push(instanceID);
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

      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const characterPosition =
        this.experience.world?.character?.characterScene?.position;

      // this.elfBatchedMesh.getMatrixAt(this.elfInstanceID2, matrix);
      // matrix.decompose(position, quaternion, scale);
      // position.x = this.parameters.position.x;
      // position.y = this.parameters.position.y;
      // position.z = this.parameters.position.z;
      // quaternion.setFromEuler(new THREE.Euler(0, this.parameters.rotationY, 0));
      // matrix.compose(position, quaternion, scale);
      // this.elfBatchedMesh.setMatrixAt(this.elfInstanceID2, matrix);

      if (!this.cherringElvesInstances?.length || !characterPosition) return;

      for (const instanceID of this.cherringElvesInstances) {
        this.elfBatchedMesh.getMatrixAt(instanceID, matrix);
        matrix.decompose(position, quaternion, scale);

        // Yaw-only "look at" the character:
        // compute direction in XZ plane then convert to Y rotation (same convention as CharacterController)
        this._tmpLookDir.subVectors(characterPosition, position);
        this._tmpLookDir.y = 0;
        if (this._tmpLookDir.lengthSq() > 1e-8) {
          const yaw = Math.atan2(this._tmpLookDir.x, this._tmpLookDir.z);
          quaternion.setFromEuler(this._tmpEuler.set(0, yaw, 0));
        }

        matrix.compose(position, quaternion, scale);
        this.elfBatchedMesh.setMatrixAt(instanceID, matrix);
      }

      if (!this.sittingElvesInstances?.length || !characterPosition) return;

      for (const instanceID of this.sittingElvesInstances) {
        const sitMatrix = new THREE.Matrix4();
        const sitPosition = new THREE.Vector3();
        const sitQuaternion = new THREE.Quaternion();
        const sitScale = new THREE.Vector3();
        this.elfBatchedMesh.getMatrixAt(instanceID, sitMatrix);
        sitMatrix.decompose(sitPosition, sitQuaternion, sitScale);

        this._tmpLookDir.subVectors(characterPosition, sitPosition);
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
          sitScale.y = 1 + rotationAngle;
        }
        sitMatrix.compose(sitPosition, sitQuaternion, sitScale);
        this.elfBatchedMesh.setMatrixAt(instanceID, sitMatrix);
      }
    }
    arguments;
  }
}
