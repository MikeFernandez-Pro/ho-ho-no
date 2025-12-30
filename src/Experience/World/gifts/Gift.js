import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
import { Howl } from "howler";

import Experience from "#experience/Experience.js";
import { CollisionGroup, makeCollisionGroups } from "#utils/collisionGroups.js";

// Spawn the gift already tilted so it reaches the floor with an angle (not perfectly upright).
const GIFT_SPAWN_TILT = THREE.MathUtils.degToRad(Math.random() * 360);
const GIFT_SPAWN_RADIUS = 10; // radius around center (XZ plane)
const GIFT_SPAWN_HEIGHT = 15; // starting Y so it falls into view

const giftSpawnSound = new Howl({
  src: ["/audio/soundEffects/giftSpawn.mp3"],
  volume: 0.5,
  autoplay: false,
});

const giftExplosionSound = new Howl({
  src: ["/audio/soundEffects/giftExplosion.mp3"],
  volume: 0.7,
  autoplay: false,
});

const grabGiftSound = new Howl({
  src: ["/audio/soundEffects/grabGift.mp3"],
  volume: 0.2,
  autoplay: false,
});

export default class Gift {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.physics = this.experience.physics;
    this.time = this.experience.time;

    this.giftsModel = this.resources.items.giftsModel;

    this._tmpTranslation = new THREE.Vector3();
    this._tmpQuaternion = new THREE.Quaternion();

    this.setGiftsMaterial();

    this.isCollected = false;
    this.physics.addEventListener("collision", this.collisionEventHandler);

    // Timed spawning:
    // - first spawn at 15s after game start
    // - then every 20s
    // - despawn after 7s if not collected
    this.nextSpawnAtSec = 15;
    this.despawnAtSec = null;

    // Blink warning before despawn (helps player notice the gift will disappear soon)
    this.blinkStartOffsetSec = 5; // start blinking 5s after spawn
    this.blinkIntervalSec = 0.18;
  }

  getRandomSpawnPosition() {
    // Sample uniformly inside a disk (XZ plane) of radius GIFT_SPAWN_RADIUS
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * GIFT_SPAWN_RADIUS;
    return new THREE.Vector3(
      Math.cos(a) * r,
      GIFT_SPAWN_HEIGHT,
      Math.sin(a) * r
    );
  }

  createGift() {
    // If we ever call this again, make sure the previous one is fully removed first.
    this.destroyGift({ playExplosionSound: false });

    this.isCollected = false;
    this.setMesh();
    this.setPhysics();
    giftSpawnSound.play();

    // Reset blink state for the new gift
    if (this.giftRoot) this.giftRoot.visible = true;
  }

  destroyGift() {
    if (this.giftRigidBody) {
      giftExplosionSound.play();
      this.physics.world.removeRigidBody(this.giftRigidBody);
      this.giftRigidBody = null;
      this.giftCollider = null;
    }

    if (this.giftRoot) {
      // Ensure we don't keep the next gift hidden if we were blinking
      this.giftRoot.visible = true;
      this.scene.remove(this.giftRoot);
      this.giftRoot = null;
      this.giftMesh = null;
    }
  }

  setGiftsMaterial() {
    const gradientTexture = this.resources.items.gradientTexture;
    const fiveToneTexture = this.resources.items.fiveToneTexture;

    this.giftMeshMaterial = new THREE.MeshToonMaterial({
      map: gradientTexture,
      gradientMap: fiveToneTexture,
    });

    this.giftsModel.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshToonMaterial({
          map: child.material.map,
          gradientMap: fiveToneTexture,
        });
      }
    });
  }

  setMesh() {
    // Root transform: this is what we sync to the Rapier rigid-body.
    // The visual mesh is offset locally so it stays perfectly centered even while rotating.
    this.giftRoot = new THREE.Group();
    this.scene.add(this.giftRoot);

    // Clone so we can safely remove/recreate gifts without mutating the original loaded scene.
    const randomChild = Math.floor(Math.random() * 3);
    this.giftMesh = this.giftsModel.scene.children[randomChild].clone(true);

    // Map the picked gift mesh variant to the boost key.
    // children:
    // 0 => piercing shot (gameplay key: "ghost")
    // 1 => speed (gameplay key: "speed")
    // 2 => shoot cadence (gameplay key: "shoot")
    this.selectedBoostKey =
      randomChild === 0 ? "ghost" : randomChild === 1 ? "speed" : "shoot";

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

    const spawn = this.getRandomSpawnPosition();
    giftRigidBodyDesc.setTranslation(spawn.x, spawn.y, spawn.z);
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
    grabGiftSound.play();

    const p = this.giftCollider.translation();
    const giftParticles = this.experience.world?.giftParticles;
    if (giftParticles?.createGiftParticles) {
      giftParticles.createGiftParticles(new THREE.Vector3(p.x, p.y, p.z));
    }

    this.despawnAtSec = null;

    // Show the corresponding icon in the middle with the same countdown timer as before.
    if (this.selectedBoostKey) {
      this.experience.boostIndicator?.showActiveBoost?.(this.selectedBoostKey);
    }

    // Picked up by player: no "explosion" sound.
    this.destroyGift();
  };

  update() {
    // Only spawn/despawn while gameplay is running
    if (!this.experience.gameStarted) return;

    const elapsed = this.experience.getGameElapsedSeconds();

    // Blink warning: start after 5s (2s before despawn, given despawn=7s).
    // Uses despawnAtSec so it stays correct if the despawn duration changes.
    if (
      !this.isCollected &&
      this.giftRigidBody &&
      this.giftRoot &&
      this.despawnAtSec != null
    ) {
      const blinkStartAtSec =
        this.despawnAtSec - (7 - this.blinkStartOffsetSec);
      if (elapsed >= blinkStartAtSec && elapsed < this.despawnAtSec) {
        const t = elapsed - blinkStartAtSec;
        const phase = Math.floor(t / this.blinkIntervalSec);
        this.giftRoot.visible = phase % 2 === 0;
      } else {
        // Not in the blink window: keep visible.
        this.giftRoot.visible = true;
      }
    }

    // Despawn after 7s if not collected
    if (
      !this.isCollected &&
      this.giftRigidBody &&
      this.despawnAtSec != null &&
      elapsed >= this.despawnAtSec
    ) {
      // Missed gift: play particles (black) at last known position
      this._tmpTranslation.copy(this.giftRigidBody.translation());
      const giftParticles = this.experience.world?.giftParticles;
      if (giftParticles?.createGiftParticles) {
        giftParticles.createGiftParticles(this._tmpTranslation, true);
      }

      // Gift expires on its own: play explosion sound.
      this.destroyGift({ playExplosionSound: true });
      this.despawnAtSec = null;
    }

    // Spawn schedule: 15s, 45s, 75s, ...
    if (!this.giftRigidBody && elapsed >= this.nextSpawnAtSec) {
      this.createGift();
      this.despawnAtSec = elapsed + 7;
      this.nextSpawnAtSec += 20;
    }

    if (!this.giftRigidBody || !this.giftRoot) return;

    this._tmpTranslation.copy(this.giftRigidBody.translation());
    this._tmpQuaternion.copy(this.giftRigidBody.rotation());

    this.giftRoot.position.set(
      this._tmpTranslation.x,
      this._tmpTranslation.y,
      this._tmpTranslation.z
    );

    this.giftRoot.quaternion.set(
      this._tmpQuaternion.x,
      this._tmpQuaternion.y,
      this._tmpQuaternion.z,
      this._tmpQuaternion.w
    );
  }

  destroy() {
    this.physics.removeEventListener("collision", this.collisionEventHandler);
    // Cleanup: don't force an explosion sound.
    this.destroyGift({ playExplosionSound: false });
  }
}
