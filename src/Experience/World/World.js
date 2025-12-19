import Experience from "../Experience.js";
import Environment from "./Environment.js";

import ToySoldier from "./ToySoldier.js";
import Camp from "./Camp.js";
import BatchedMeshWorld from "./batchedMeshWorld/BatchedMeshWorld.js";
import Character from "./character/Character.js";
import Enemy from "./enemy/Enemy.js";
import EnemyInstanced from "./enemy/EnemyInstanced.js";
import DummyTarget from "./DummyTarget.js";
import TestEnemy from "./batchedMeshWorld/TestEnemy.js";
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
    this.camp = new Camp();
    this.toySoldier = new ToySoldier();
    this.batchedMeshWorld = new BatchedMeshWorld();
    this.character = new Character();
    //this.enemy = new Enemy();
    //this.enemyInstanced = new EnemyInstanced();
    this.dummyTarget = new DummyTarget();
    // this.santa = new Santa();
  };

  update() {
    //if (this.santa) {
    // this.santa.update();
    //}
    if (this.toySoldier) {
      this.toySoldier.update();
    }
    if (this.character) {
      this.character.update();
    }
    if (this.enemy) {
      this.enemy.update();
    }
    if (this.enemyInstanced) {
      this.enemyInstanced.update();
    }
    if (this.dummyTarget) {
      this.dummyTarget.update();
    }

    if (this.batchedMeshWorld) {
      this.batchedMeshWorld.update();
    }
  }

  destroy() {
    this.resources.removeEventListener(
      "ready",
      this.resourcesReadyEventHandler
    );
  }
}
