import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "#experience/Experience.js";
import CharacterAnimationController from "./CharacterAnimationController.js";
import CharacterController from "./CharacterController.js";
import ProjectilesFactory from "./ProjectilesFactory.js";

import CustomShaderMaterial from "three-custom-shader-material/vanilla";
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
    };

    this.material = new CustomShaderMaterial({
      baseMaterial: new THREE.MeshBasicMaterial({
        map: this.gradientTexture,
      }),
      uniforms: {
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
      },
      vertexShader: /* glsl */ ` 
      varying vec3 vCustomNormal;
      varying vec3 vCustomPosition;

    varying vec2 vUv;
    void main() {
      vUv = uv;
        
vCustomNormal = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
vCustomPosition = (modelMatrix * vec4(position, 1.0)).xyz; 
   
    } 
     `,
      fragmentShader: /* glsl */ `

    uniform float uAmbiantIntensity;
    uniform vec3 uSkyColor;
    uniform vec3 uGroundColor;
    uniform vec3 uLightDirection;
    uniform vec3 uLightColor;
    uniform float uFresnelPower;
    uniform float uFresnelImpact;
    
    varying vec2 vUv;
    varying vec3 vCustomNormal;
    varying vec3 vCustomPosition;
   

    float remap(float value, float from1, float to1, float from2, float to2) {
        return from2 + (value - from1) * (to2 - from2) / (to1 - from1);
    }

    void main() {

        vec3 normal = normalize(vCustomNormal);
        vec3 viewDirection = normalize(  cameraPosition - vCustomPosition);

    // Ambient
    vec3 ambient = vec3(uAmbiantIntensity);
            
    // Hemi
    vec3 skyColor = vec3(uSkyColor);
    vec3 groundColor = vec3(uGroundColor);

    vec3 hemi = mix(groundColor, skyColor, remap(normal.y, -1.0, 1.0, 0.0, 1.0));

    // Diffuse Lighting
    vec3 lightDir = normalize(vec3(uLightDirection));
          vec3 lightColor = vec3(uLightColor);
          float dp = max(0.0, dot(lightDir, normal));
       
    // Toon
    dp*= smoothstep(0.5 , 0.505 , dp );


    vec3 diffuse = dp * lightColor;

    // Fresnel
    float VoN = max(dot(viewDirection, normal), 0.0);
  float fresnel = pow(1.0 - VoN, uFresnelPower); 
          

    vec3 lighting = ambient +  hemi * (fresnel + uFresnelImpact)  + diffuse  * 0.8;

    vec3 modelColor = csm_DiffuseColor.rgb;

    vec3 color = modelColor * lighting  ;

    csm_DiffuseColor = vec4((color), 1.0);
  }
     `,
    });

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
    }

    this.characterScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true;
        child.castShadow = true;
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
