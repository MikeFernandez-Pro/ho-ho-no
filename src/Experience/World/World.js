import Experience from "#experience/Experience.js";
import Environment from "#world/Environment.js";
import Camp from "#world/Camp.js";
import BatchedMeshWorld from "#world/batchedMeshWorld/BatchedMeshWorld.js";
import Character from "#world/character/Character.js";
import Snow from "#world/Snow.js";
import Floor from "#world/Floor.js";
import ProjectileParticles from "#world/projectiles/ProjectileParticles.js";
import Elf from "#world/Elf.js";
import Enemy from "#world/batchedMeshWorld/Enemy.js";
export default class World {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    // Wait for resources
    this.resources.addEventListener("ready", this.resourcesReadyEventHandler);
  }

  resourcesReadyEventHandler = () => {
    // Setup
    this.environment = new Environment();

    this.batchedMeshWorld = new BatchedMeshWorld();
    this.enemy = new Enemy();
    this.camp = new Camp();
    this.floor = new Floor();

    this.projectileParticles = new ProjectileParticles();
    this.character = new Character();
    this.snow = new Snow();
    this.elf = new Elf();
  };

  update() {
    if (this.character) {
      this.character.update();
    }

    if (this.snow) {
      this.snow.update();
    }

    if (this.environment) {
      this.environment.update();
    }
    if (this.elf) {
      this.elf.update();
    }
    if (this.enemy) {
      this.enemy.update();
    }
  }

  destroy() {
    this.resources.removeEventListener(
      "ready",
      this.resourcesReadyEventHandler
    );
  }
}
