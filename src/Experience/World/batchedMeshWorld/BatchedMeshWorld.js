import * as THREE from "three";
import Experience from "#experience/Experience.js";

// import SantaClous from "./SantaClous.js";

import declarationsVertexShaderChunk from "#shaders/batchedMeshWorld/vertexShader/declarations.glsl?raw";
import logicVertexShaderChunk from "#shaders/batchedMeshWorld/vertexShader/logic.glsl?raw";
import declarationsFragmentShaderChunk from "#shaders/batchedMeshWorld/fragmentShader/declarations.glsl?raw";
import logicFragmentShaderChunk from "#shaders/batchedMeshWorld/fragmentShader/logic.glsl?raw";
import TestEnemy from "#world/batchedMeshWorld/TestEnemy.js";

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
    this.gradientTexture.colorSpace = THREE.SRGBColorSpace;
    this.gradientTexture.flipY = false;
  };

  setMaterial = () => {
    // Match Character.js material "style": MeshBasicMaterial + shader chunk overrides
    this.material = new THREE.MeshBasicMaterial({
      map: this.gradientTexture,
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
  };

  setShadersConfig = () => {
    const parameters = {
      ambiantIntensity: 0.8,
      skyColor: { r: 0.0, g: 0.3, b: 0.6 },
      groundColor: { r: 0.6, g: 0.3, b: 0.1 },
      lightDirection: { x: 1.0, y: 0.0, z: 1.0 },
      lightColor: { r: 1.0, g: 1.0, b: 0.9 },
      fresnelPower: 5.0,
      fresnelImpact: 0.2,
    };

    this.uniforms = {
      uTime: { value: 0 },
      fps: { value: 60 },
      totalFrames: { value: 48 },
      uAmbiantIntensity: { value: parameters.ambiantIntensity },
      uSkyColor: {
        value: new THREE.Color(
          parameters.skyColor.r,
          parameters.skyColor.g,
          parameters.skyColor.b
        ),
      },
      uGroundColor: {
        value: new THREE.Color(
          parameters.groundColor.r,
          parameters.groundColor.g,
          parameters.groundColor.b
        ),
      },
      uLightDirection: {
        value: new THREE.Vector3(
          parameters.lightDirection.x,
          parameters.lightDirection.y,
          parameters.lightDirection.z
        ),
      },
      uLightColor: {
        value: new THREE.Color(
          parameters.lightColor.r,
          parameters.lightColor.g,
          parameters.lightColor.b
        ),
      },
      uFresnelPower: { value: parameters.fresnelPower },
      uFresnelImpact: { value: parameters.fresnelImpact },
    };

    // Keep the same external API pattern as Character.js
    // (useful if you later hook debug UI to `this.material.uniforms.*`).
    this.material.uniforms = this.uniforms;

    this.batchedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    this.configureMaterialShader(this.material);
    this.configureMaterialShader(this.batchedMesh.customDepthMaterial);

    // Ensure onBeforeCompile runs at least once on next render
    this.material.needsUpdate = true;
    this.batchedMesh.customDepthMaterial.needsUpdate = true;
  };

  configureMaterialShader = (material) => {
    material.onBeforeCompile = (shader) => {
      // Hook our uniforms into the program uniforms (same pattern as Character.js)
      Object.assign(shader.uniforms, this.uniforms);
      Object.assign(shader.uniforms, this.testEnemy.uniforms);
      shader.uniforms.uAmbiantIntensity = this.uniforms.uAmbiantIntensity;
      shader.uniforms.uSkyColor = this.uniforms.uSkyColor;
      shader.uniforms.uGroundColor = this.uniforms.uGroundColor;
      shader.uniforms.uLightDirection = this.uniforms.uLightDirection;
      shader.uniforms.uLightColor = this.uniforms.uLightColor;
      shader.uniforms.uFresnelPower = this.uniforms.uFresnelPower;
      shader.uniforms.uFresnelImpact = this.uniforms.uFresnelImpact;
      // Object.assign(shader.uniforms, this.santaClous.uniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `${declarationsVertexShaderChunk}\n${this.testEnemy.declarationsShaderChunk}\n`
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `${this.testEnemy.logicShaderChunk}\n`
      );

      // Fragment: declare uniforms/varyings and multiply final diffuseColor.rgb (after the map is applied).
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        declarationsFragmentShaderChunk
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        logicFragmentShaderChunk
      );

      material.userData.shader = shader;
    };
  };

  update = () => {
    const t = this.time.elapsed;
    this.uniforms.uTime.value = t;

    this.testEnemy.update();

    // this.santaClous.update();
  };
}
