import Experience from "#experience/Experience.js";
import * as THREE from "three";

export default class Elf {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.elfModel = this.resources.items.elfModel;

    this.gradientTexture = this.resources.items.gradientTexture;
    this.fiveToneTexture = this.resources.items.fiveToneTexture;
    this.elfCheeringVATTexture = this.resources.items.elfCheeringVATTexture;

    const elfMesh = this.elfModel.scene.children[0];
    this.elfMeshGeometry = elfMesh.geometry;

    this.elfMeshMaterial = new THREE.MeshToonMaterial({
      map: this.gradientTexture,
      gradientMap: this.fiveToneTexture,
    });

    this.elfBatchedMesh = new THREE.BatchedMesh(
      2,
      10000,
      1000000,
      this.elfMeshMaterial
    );
    this.elfBatchedMesh.castShadow = true;
    this.scene.add(this.elfBatchedMesh);

    this.elfGeometryID = this.elfBatchedMesh.addGeometry(this.elfMeshGeometry);

    this.elfInstanceID = this.elfBatchedMesh.addInstance(this.elfGeometryID);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3(-20, 1.7, 0.5);
    const quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, Math.PI / 2, 0)
    );
    const scale = new THREE.Vector3(1, 1, 1);
    matrix.compose(position, quaternion, scale);
    this.elfBatchedMesh.setMatrixAt(this.elfInstanceID, matrix);

    this.setShadersConfig();
  }

  setShadersConfig = () => {
    this.uniforms = {
      uTime: { value: 0 },
      uTotalFramesCheering: { value: 30 },
      fps: { value: 24 },
      uVATCheering: { value: this.elfCheeringVATTexture },
    };

    this.elfBatchedMesh.material.uniforms = this.uniforms;
    this.elfBatchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    this.configureMaterialShader(this.elfBatchedMesh.material);
    this.configureMaterialShader(this.elfBatchedMesh.customDepthMaterial);

    this.elfBatchedMesh.material.needsUpdate = true;
    this.elfBatchedMesh.customDepthMaterial.needsUpdate = true;
  };

  configureMaterialShader = (material) => {
    material.onBeforeCompile = (shader) => {
      // Hook our uniforms into the program uniforms (same pattern as Character.js)
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
        #include <common>
        attribute vec2 uv1; 
        uniform sampler2D uVATCheering; 

        uniform float uTime; 
        uniform float uTotalFramesCheering;
        uniform float fps;
        `
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `
        #include <project_vertex>
        float frame = mod(uTime * fps, uTotalFramesCheering) / uTotalFramesCheering;
        frame = 1.0 - frame;
        vec3 pos = texture(uVATCheering, vec2(uv1.x, uv1.y - frame)).xzy;
        mvPosition =batchingMatrix * vec4(pos, 1.0);


        mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
        `
      );
    };
  };

  update() {
    if (this.elfBatchedMesh.material) {
      this.elfBatchedMesh.material.uniforms.uTime.value = this.time.elapsed;
    }
  }
}
