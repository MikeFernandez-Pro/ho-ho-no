import * as THREE from "three";
import Experience from "../../Experience.js";

// import SantaClous from "./SantaClous.js";

import declarationsShaderChunk from "../../../shaders/batchedMeshWorld/declarations.glsl?raw";
import logicShaderChunk from "../../../shaders/batchedMeshWorld/logic.glsl?raw";
import TestEnemy from "./TestEnemy.js";

export default class BatchedMeshWorld {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setBaseColorTexture();
    this.setMaterial();
    this.setBatchedMesh();
    this.setInstances();
    this.setShadersConfig();
  }

  setBaseColorTexture = () => {
    this.gradientTexture = this.resources.items.gradientTexture;
  };

  setMaterial = () => {
    this.material = new THREE.MeshStandardMaterial({
      map: this.gradientTexture,
      // color: 0x00ff00,
      metalness: 1.0,
      normalScale: new THREE.Vector2(1, -1),
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

    this.scene.add(this.batchedMesh);
  };

  setInstances = () => {
    //   this.santaClous = new SantaClous(this.batchedMesh);
    this.testEnemy = new TestEnemy(this.batchedMesh);

    console.log(this.testEnemy.declarationsShaderChunk);
  };

  setShadersConfig = () => {
    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 40 },
      totalFrames: { value: 48 },
    };

    this.batchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    this.configureMaterialShader(this.material);
    // this.configureMaterialShader(this.batchedMesh.customDepthMaterial);
  };

  configureMaterialShader = (material) => {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      Object.assign(shader.uniforms, this.testEnemy.uniforms);
      // Object.assign(shader.uniforms, this.santaClous.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
          #include <common>
          ${declarationsShaderChunk}
          ${this.testEnemy.declarationsShaderChunk}

mat4 removeScale(mat4 m) {
  m[0].xyz = normalize(m[0].xyz);
  m[1].xyz = normalize(m[1].xyz);
  m[2].xyz = normalize(m[2].xyz);
  return m;
}
          
          `
        //${this.testEnemy.declarationsShaderChunk}
        // ${this.santaClous.declarationsShaderChunk}
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
          #include <begin_vertex>
          ${logicShaderChunk}
          ${this.testEnemy.logicShaderChunk}  
    
   
          `
        // ${this.santaClous.logicShaderChunk}
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `
vec4 mvPosition;

#ifdef USE_BATCHING
  float sx = length(batchingMatrix[0].xyz);

  if (abs(sx - 2.0) < 0.001) {

    float frame = mod(uTime * fps, uTotalFramesWalk) / uTotalFramesWalk;
    vec3 pos = texture(uVATWalk, vec2(uv1.x, uv1.y - frame)).xzy;
    mvPosition = removeScale(batchingMatrix) * vec4(pos, 1.0);

  } else if (abs(sx - 3.0) < 0.001) {

    float frame = mod(uTime * fps, uTotalFramesDeath) / uTotalFramesDeath;
    vec3 pos = texture(uVATDeath, vec2(uv1.x, uv1.y - frame)).xzy;
    mvPosition = removeScale(batchingMatrix) * vec4(pos, 1.0);

  } else {
 
    mvPosition = batchingMatrix * vec4(transformed, 1.0);

  }
#else
  mvPosition = vec4(transformed, 1.0);
#endif

#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif

mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;

  `
      );
    };
  };

  update = () => {
    const t = -this.time.elapsed;
    this.uniforms.uTime.value = t;

    // this.santaClous.update();
  };
}
