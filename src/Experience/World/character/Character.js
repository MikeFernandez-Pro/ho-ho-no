import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
import { Howl } from "howler";

import Experience from "#experience/Experience.js";
import { CollisionGroup, makeCollisionGroups } from "#utils/collisionGroups.js";
import CharacterAnimationController from "./CharacterAnimationController.js";
import CharacterController from "./CharacterController.js";
import ProjectilesFactory from "../projectiles/ProjectilesFactory.js";

const gameOverSound = new Howl({
  src: ["/audio/soundEffects/hitCharacter.wav"],
  volume: 0.6,
  rate: 0.8,
});
export default class Character {
  constructor() {
    this.experience = new Experience();
    this.debug = this.experience.debug;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;
    this.physics = this.experience.physics;
    this.gradientTexture = this.experience.resources.items.gradientTexture;
    this.fiveToneTexture = this.experience.resources.items.fiveToneTexture;
    this.enemy = this.experience.world.enemy;

    this.isGameOver = false;

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
    this.enemy.addEventListener(
      "enemyHitCharacter",
      this.enemyHitCharacterEventHandler
    );
  }

  enemyHitCharacterEventHandler = () => {
    if (this.isGameOver) {
      return;
    }
    this.isGameOver = true;
    gameOverSound.play();
  };

  setModel() {
    this.resource = this.resources.items.characterModel;
    this.characterScene = this.resources.items.characterModel.scene;
    this.characterScene.position.y = 0.55;

    // Ensure texture is treated as color data
    this.gradientTexture.colorSpace = THREE.SRGBColorSpace;
    this.gradientTexture.flipY = false;

    this.material = new THREE.MeshToonMaterial({
      map: this.gradientTexture,
      gradientMap: this.fiveToneTexture,
    });

    this.characterScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = false;
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
    this.characterRigidBody.friction = 0;

    // Collider description
    this.characterColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.6);

    this.characterCollider = this.physics.world.createCollider(
      this.characterColliderDesc,
      this.characterRigidBody
    );
    // Character should collide with the arena/ground/enemies (projectiles are ignored).
    this.characterCollider.setCollisionGroups(
      makeCollisionGroups(
        CollisionGroup.CHARACTER,
        CollisionGroup.ARENA | CollisionGroup.GROUND | CollisionGroup.ENEMY
      )
    );

    this.characterCollider.userData = {
      type: "character",
    };
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
