import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";

import Experience from "#experience/Experience.js";
import { CollisionGroup, makeCollisionGroups } from "#utils/collisionGroups.js";

// Spawn the gift already tilted so it reaches the floor with an angle (not perfectly upright).
const GIFT_SPAWN_TILT = THREE.MathUtils.degToRad(Math.random() * 360);

export default class Gift {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.physics = this.experience.physics;

    this.giftModel = this.resources.items.giftModel;

    this.setMaterial();

    this.isCollected = false;
    this.physics.addEventListener("collision", this.collisionEventHandler);

    this.createGift();
  }

  createGift() {
    // If we ever call this again, make sure the previous one is fully removed first.
    this.destroyGift();

    this.isCollected = false;
    this.setMesh();
    this.setPhysics();
  }

  destroyGift() {
    if (this.giftRigidBody) {
      this.physics.world.removeRigidBody(this.giftRigidBody);
      this.giftRigidBody = null;
      this.giftCollider = null;
    }

    if (this.giftRoot) {
      this.scene.remove(this.giftRoot);
      this.giftRoot = null;
      this.giftMesh = null;
    }
  }

  setMaterial() {
    const gradientTexture = this.resources.items.gradientTexture;
    const fiveToneTexture = this.resources.items.fiveToneTexture;

    this.giftMeshMaterial = new THREE.MeshToonMaterial({
      map: gradientTexture,
      gradientMap: fiveToneTexture,
    });
  }

  setMesh() {
    // Root transform: this is what we sync to the Rapier rigid-body.
    // The visual mesh is offset locally so it stays perfectly centered even while rotating.
    this.giftRoot = new THREE.Group();
    this.scene.add(this.giftRoot);

    // Clone so we can safely remove/recreate gifts without mutating the original loaded scene.
    this.giftMesh = this.giftModel.scene.getObjectByName("gift").clone(true);
    this.giftMesh.material = this.giftMeshMaterial;

    this.giftMesh.scale.set(2, 2, 2);

    // Re-center mesh around its bounding-box center.
    // If the model origin is bottom-center, this moves it down by ~height/2 so RB center == visual center.
    const box = new THREE.Box3().setFromObject(this.giftMesh);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.giftMesh.position.sub(center);

    this.giftRoot.add(this.giftMesh);
  }

  setPhysics() {
    const giftRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    giftRigidBodyDesc.setTranslation(3, 15, 0);
    // Damping prevents "infinite" rolling/spinning once it reaches the floor.
    giftRigidBodyDesc.setLinearDamping(0.6);
    giftRigidBodyDesc.setAngularDamping(1.0);
    giftRigidBodyDesc.setCanSleep(true);

    // Give it a deterministic tilt + random yaw so it doesn't always look identical.
    const spawnQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(GIFT_SPAWN_TILT, GIFT_SPAWN_TILT, GIFT_SPAWN_TILT)
    );
    giftRigidBodyDesc.setRotation({
      x: spawnQuat.x,
      y: spawnQuat.y,
      z: spawnQuat.z,
      w: spawnQuat.w,
    });

    this.giftRigidBody = this.physics.world.createRigidBody(giftRigidBodyDesc);

    const giftColliderDesc = RAPIER.ColliderDesc.roundCuboid(
      0.15,
      0.15,
      0.15,
      0.6
    );
    giftColliderDesc.setFriction(0);
    giftColliderDesc.setMass(0.1);
    giftColliderDesc.setRestitution(0);

    this.giftCollider = this.physics.world.createCollider(
      giftColliderDesc,
      this.giftRigidBody
    );

    // Needed so the global `Physics` collision event fires when the character touches the gift.
    this.giftCollider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    // Gift should NOT physically interact with projectiles (projectiles pass through).
    // Keep interactions with the world so the gift can rest on ground / be blocked by arena.
    this.giftCollider.setCollisionGroups(
      makeCollisionGroups(
        CollisionGroup.GIFT,
        CollisionGroup.GROUND |
          CollisionGroup.ARENA |
          CollisionGroup.CHARACTER |
          CollisionGroup.ENEMY
      )
    );
    this.giftCollider.userData = { type: "gift" };
  }

  collisionEventHandler = (event) => {
    if (this.isCollected) return;
    if (!this.giftCollider) return;

    const c1Type = event.collider1?.userData?.type;
    const c2Type = event.collider2?.userData?.type;
    const isCharacterGift =
      (c1Type === "character" && c2Type === "gift") ||
      (c1Type === "gift" && c2Type === "character");

    if (!isCharacterGift) return;

    // Only react to collisions involving THIS gift instance.
    const hitsThisGift =
      event.collider1 === this.giftCollider ||
      event.collider2 === this.giftCollider;
    if (!hitsThisGift) return;

    this.isCollected = true;

    const p = this.giftCollider.translation();
    const giftParticles = this.experience.world?.giftParticles;
    if (giftParticles?.createGiftParticles) {
      giftParticles.createGiftParticles(new THREE.Vector3(p.x, p.y, p.z));
    }

    this.destroyGift();
  };

  update() {
    if (!this.giftRigidBody || !this.giftRoot) return;
    this.giftRoot.position.set(
      this.giftRigidBody.translation().x,
      this.giftRigidBody.translation().y,
      this.giftRigidBody.translation().z
    );

    this.giftRoot.quaternion.set(
      this.giftRigidBody.rotation().x,
      this.giftRigidBody.rotation().y,
      this.giftRigidBody.rotation().z,
      this.giftRigidBody.rotation().w
    );
  }

  destroy() {
    this.physics.removeEventListener("collision", this.collisionEventHandler);
    this.destroyGift();
  }
}
