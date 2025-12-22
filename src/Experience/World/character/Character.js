import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "#experience/Experience.js";
import CharacterAnimationController from "./CharacterAnimationController.js";
import CharacterController from "./CharacterController.js";
import ProjectilesFactory from "./ProjectilesFactory.js";

import declarationsVertexShaderChunk from "#shaders/character/vertexShader/declarations.glsl?raw";
import logicVertexShaderChunk from "#shaders/character/vertexShader/logic.glsl?raw";
import declarationsFragmentShaderChunk from "#shaders/character/fragmentShader/declarations.glsl?raw";
import logicFragmentShaderChunk from "#shaders/character/fragmentShader/logic.glsl?raw";

export default class Character {
  constructor() {
    this.experience = new Experience();
    this.debug = this.experience.debug;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.physics = this.experience.physics;
    this.gradientTexture = this.experience.resources.items.gradientTexture;

    if (this.debug.active) {
      this.debugFolder = this.debug.pane.addFolder({
        title: "Character",
        expanded: false,
      });
    }

    this.setModel();
    this.setAnimationController();
    this.setPhysics();
    this.setCharacterController();
    this.setProjectilesFactory();
  }

  setModel() {
    this.resource = this.resources.items.characterModel;
    this.characterScene = this.resources.items.characterModel.scene;
    this.characterScene.position.y = 0.55;

    // Ensure texture is treated as color data
    this.gradientTexture.colorSpace = THREE.SRGBColorSpace;
    this.gradientTexture.flipY = false;

    // Single shared parameters/material for the whole character (otherwise debug updates only affect the last mesh)
    const parameters = {
      ambiantIntensity: 0.8,
      skyColor: { r: 0.0, g: 0.3, b: 0.6 },
      groundColor: { r: 0.6, g: 0.3, b: 0.1 },
      lightDirection: { x: 1.0, y: 0.0, z: 1.0 },
      lightColor: { r: 1.0, g: 1.0, b: 0.9 },
      fresnelPower: 5.0,
      fresnelImpact: 0.2,
      fakeAOIntensity: 1,
      fakeAOPower: 0.5,
    };

    const uniforms = {
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
      uFakeAOIntensity: { value: parameters.fakeAOIntensity },
      uFakeAOPower: { value: parameters.fakeAOPower },
    };

    this.material = new THREE.MeshBasicMaterial({
      map: this.gradientTexture,
    });

    // Keep the same external API you were using with CustomShaderMaterial
    // (your debug UI reads/writes `this.material.uniforms.*`).
    this.material.uniforms = uniforms;

    this.material.onBeforeCompile = (shader) => {
      // Hook our uniforms into the program uniforms
      shader.uniforms.uAmbiantIntensity = uniforms.uAmbiantIntensity;
      shader.uniforms.uSkyColor = uniforms.uSkyColor;
      shader.uniforms.uGroundColor = uniforms.uGroundColor;
      shader.uniforms.uLightDirection = uniforms.uLightDirection;
      shader.uniforms.uLightColor = uniforms.uLightColor;
      shader.uniforms.uFresnelPower = uniforms.uFresnelPower;
      shader.uniforms.uFresnelImpact = uniforms.uFresnelImpact;
      shader.uniforms.uFakeAOIntensity = uniforms.uFakeAOIntensity;
      shader.uniforms.uFakeAOPower = uniforms.uFakeAOPower;

      // Vertex: add varyings and compute world normal/position (works with skinning/morphs).
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        declarationsVertexShaderChunk
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        logicVertexShaderChunk
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

      // Keep a handle if you ever want to inspect shader code/uniforms at runtime
      this.material.userData.shader = shader;
    };

    // Ensure onBeforeCompile runs at least once on next render
    this.material.needsUpdate = true;

    if (this.debug.active) {
      const applyLightDirection = () => {
        this.material.uniforms.uLightDirection.value.set(
          parameters.lightDirection.x,
          parameters.lightDirection.y,
          parameters.lightDirection.z
        );
      };

      this.debugFolder
        .addBinding(parameters, "ambiantIntensity", {
          min: 0,
          max: 1,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.material.uniforms.uAmbiantIntensity.value = ev.value;
        });

      // Use float colors (0..1) so they match shader vec3 expectations
      this.debugFolder
        .addBinding(parameters, "skyColor", {
          color: { type: "float" },
        })
        .on("change", (ev) => {
          this.material.uniforms.uSkyColor.value.setRGB(
            ev.value.r,
            ev.value.g,
            ev.value.b
          );
        });

      this.debugFolder
        .addBinding(parameters, "groundColor", {
          color: { type: "float" },
        })
        .on("change", (ev) => {
          this.material.uniforms.uGroundColor.value.setRGB(
            ev.value.r,
            ev.value.g,
            ev.value.b
          );
        });

      const dirFolder = this.debugFolder.addFolder({
        title: "lightDirection",
        expanded: false,
      });

      dirFolder
        .addBinding(parameters.lightDirection, "x", {
          min: -1,
          max: 1,
          step: 0.001,
        })
        .on("change", applyLightDirection);

      dirFolder
        .addBinding(parameters.lightDirection, "y", {
          min: -1,
          max: 1,
          step: 0.001,
        })
        .on("change", applyLightDirection);

      dirFolder
        .addBinding(parameters.lightDirection, "z", {
          min: -1,
          max: 1,
          step: 0.001,
        })
        .on("change", applyLightDirection);

      this.debugFolder
        .addBinding(parameters, "lightColor", {
          color: { type: "float" },
        })
        .on("change", (ev) => {
          this.material.uniforms.uLightColor.value.setRGB(
            ev.value.r,
            ev.value.g,
            ev.value.b
          );
        });

      this.debugFolder
        .addBinding(parameters, "fresnelPower")
        .on("change", (ev) => {
          this.material.uniforms.uFresnelPower.value = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "fresnelImpact")
        .on("change", (ev) => {
          this.material.uniforms.uFresnelImpact.value = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "fakeAOIntensity", {
          min: 0,
          max: 1,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.material.uniforms.uFakeAOIntensity.value = ev.value;
        });

      this.debugFolder
        .addBinding(parameters, "fakeAOPower", {
          min: 0.1,
          max: 4,
          step: 0.001,
        })
        .on("change", (ev) => {
          this.material.uniforms.uFakeAOPower.value = ev.value;
        });
    }

    this.characterScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = false;
        child.castShadow = false;
        child.material = this.material;
      }
    });

    this.scene.add(this.characterScene);
  }

  setAnimationController() {
    this.characterAnimationController = new CharacterAnimationController(this);
  }

  setPhysics() {
    // Rigid body description
    this.characterRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    this.characterRigidBodyDesc.setTranslation(0.0, 1.6, 0.0);
    this.characterRigidBodyDesc.lockRotations();

    this.characterRigidBody = this.physics.world.createRigidBody(
      this.characterRigidBodyDesc
    );
    this.characterRigidBody.sleep();

    // Collider description
    this.characterColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.6);

    this.characterCollider = this.physics.world.createCollider(
      this.characterColliderDesc,
      this.characterRigidBody
    );
  }

  setCharacterController() {
    this.characterController = new CharacterController(this);
    this.characterAnimationController.bindCharacterController(
      this.characterController
    );
  }

  setProjectilesFactory() {
    this.projectilesFactory = new ProjectilesFactory(this);
  }

  update() {
    this.characterAnimationController.update();
    // Update character movement based on input
    this.characterController.update();
    this.projectilesFactory.update();
  }
}
