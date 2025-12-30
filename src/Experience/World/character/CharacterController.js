import Experience from "#experience/Experience.js";
import { Howl } from "howler";
import * as THREE from "three";

const shootSound = new Howl({
  // Files in `static/` are served from the site root by Vite (`publicDir`).
  src: ["/audio/soundEffects/shoot.mp3"],
  volume: 0.2,
});

const keysConfigList = {
  ArrowUp: "forward",
  ArrowDown: "backward",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
};

const BASE_SPEED = 7.5;
// Keep this in sync with ProjectilesFactory's SHOOT_OFFSET_LOCAL.y (muzzle height)
const AIM_HEIGHT_OFFSET = 0.596;
// Hold-to-shoot cadence (seconds). Real rate is also limited by the shoot animation.
const BASE_SHOOT_REPEAT_DELAY = 0.39;

export default class CharacterController extends THREE.EventDispatcher {
  constructor(character) {
    super();

    this.experience = new Experience();
    this.camera = this.experience.camera;
    this.sizes = this.experience.sizes;
    this.time = this.experience.time;
    this.camp = this.experience.world.camp;

    this.character = character;
    this.characterRigidBody = character.characterRigidBody;
    this.characterAnimationController = character.characterAnimationController;

    this.linvel = { x: 0, y: 0, z: 0 };

    this.direction = new THREE.Vector3();
    this.frontVector = new THREE.Vector3();
    this.sideVector = new THREE.Vector3();
    this.rotation = new THREE.Vector3();

    // Mouse logic
    this.mouse = new THREE.Vector2();
    this.screenPosition = new THREE.Vector3();
    this.viewportPosition = new THREE.Vector2();
    this.orientation = 0;

    // Animation logic
    this.isShooting = false;
    this.isMouseDown = false;
    this.lastShootAt = -Infinity;

    // Start the smoothed rotation from the current matrix rotation

    this.eventKeys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      enter: false,
    };

    window.addEventListener("mousedown", this.mouseDownEventHandler);
    window.addEventListener("mouseup", this.mouseUpEventHandler);
    window.addEventListener("blur", this.windowBlurEventHandler);
    window.addEventListener("keydown", this.keyEventHandler);
    window.addEventListener("keyup", this.keyEventHandler);
    window.addEventListener("mousemove", this.mouseMoveEventHandler);
    this.characterAnimationController.addEventListener(
      "shootFinished",
      this.animationFinishedEventHandler
    );
  }

  isGameplayActive() {
    return !!this.experience.gameStarted && !this.character?.isGameOver;
  }

  getMoveSpeed() {
    // Speed boost: faster movement while active
    if (this.experience.activeBoost === "speed") return BASE_SPEED * 1.5;
    return BASE_SPEED;
  }

  getShootRepeatDelay() {
    // Shoot boost: faster cadence while active (smaller delay)
    if (this.experience.activeBoost === "shoot")
      return BASE_SHOOT_REPEAT_DELAY * 0.5;
    return BASE_SHOOT_REPEAT_DELAY;
  }

  updateMouseFromEvent(e) {
    if (!e) return;
    // Keep aiming stable even if the user shoots without moving the mouse first.
    this.mouse.x = (e.clientX / this.sizes.width) * 2 - 1;
    this.mouse.y = -(e.clientY / this.sizes.height) * 2 + 1;
  }

  tryShoot = () => {
    if (!this.isGameplayActive()) return;
    if (this.isShooting) {
      return;
    }

    const now = this.time.elapsed;
    if (now - this.lastShootAt < this.getShootRepeatDelay()) return;
    this.lastShootAt = now;

    shootSound.play();

    this.isShooting = true;

    // Compute the aim point at muzzle height so projectiles can be fired
    // from an offset muzzle while still passing through the cursor.
    const aimPlaneHeight =
      this.character.characterScene.position.y + AIM_HEIGHT_OFFSET;
    const aimPlane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -aimPlaneHeight
    );
    const intersectionPoint = new THREE.Vector3();

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.camera.instance);
    const hit = raycaster.ray.intersectPlane(aimPlane, intersectionPoint);

    this.dispatchEvent({
      type: "shoot",
      position: this.character.characterScene.position.clone(),
      angle: this.character.characterScene.rotation.y,
      aimPoint: hit ? intersectionPoint.clone() : null,
    });
  };

  mouseDownEventHandler = (e) => {
    // Left mouse button only
    if (e?.button !== 0) return;
    if (!this.isGameplayActive()) return;

    this.isMouseDown = true;
    this.updateMouseFromEvent(e);
    this.tryShoot();
  };

  mouseUpEventHandler = (e) => {
    if (e?.button !== 0) return;
    this.isMouseDown = false;
  };

  windowBlurEventHandler = () => {
    this.isMouseDown = false;
  };

  animationFinishedEventHandler = (event) => {
    this.isShooting = false;
  };

  mouseMoveEventHandler = (e) => {
    if (!this.isGameplayActive()) return;
    this.updateMouseFromEvent(e);
  };

  keyEventHandler = (event) => {
    if (!this.isGameplayActive()) return;
    if (keysConfigList[event.code]) {
      this.eventKeys[keysConfigList[event.code]] = event.type === "keydown";
    }
  };

  setCharacterOrientation() {
    // Aim using a plane at muzzle height, not ground level, to avoid parallax issues
    // with angled cameras (projectiles travel horizontally at ~muzzle height).
    const aimPlaneHeight =
      this.character.characterScene.position.y + AIM_HEIGHT_OFFSET;
    const aimPlane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -aimPlaneHeight
    );
    const intersectionPoint = new THREE.Vector3();

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.camera.instance);

    const hit = raycaster.ray.intersectPlane(aimPlane, intersectionPoint);
    if (!hit) return;

    const direction = new THREE.Vector3()
      .subVectors(intersectionPoint, this.character.characterScene.position)
      .normalize();

    this.orientation = Math.atan2(direction.x, direction.z);

    this.character.characterScene.rotation.y = this.orientation;
  }

  update() {
    if (!this.isGameplayActive()) return;
    const velocity = this.characterRigidBody.linvel();

    this.character.characterScene.position.x =
      this.characterRigidBody.translation().x;
    this.character.characterScene.position.z =
      this.characterRigidBody.translation().z;

    this.setCharacterOrientation();

    // Hold-to-shoot
    if (this.isMouseDown) {
      this.tryShoot();
    }

    // Retrieve keys input
    const { forward, backward, left, right } = this.eventKeys;
    const hasMovementInput = forward || backward || left || right;

    // Tell the animation controller what the player *wants* to do.
    // It will pick idle/run automatically, and will ignore locomotion while shooting.
    this.characterAnimationController.setMovementAnimation(hasMovementInput);

    if (!hasMovementInput) {
      this.linvel.x = 0;
      this.linvel.y = velocity.y;
      this.linvel.z = 0;
      this.characterRigidBody.setLinvel(this.linvel, true);
      return;
    }

    this.frontVector.set(0, 0, (backward ? 1 : 0) - (forward ? 1 : 0));
    this.sideVector.set((right ? 1 : 0) - (left ? 1 : 0), 0, 0);

    this.direction.copy(this.frontVector).add(this.sideVector);

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize().multiplyScalar(this.getMoveSpeed());

      this.linvel.x = this.direction.x;
      this.linvel.y = velocity.y;
      this.linvel.z = this.direction.z;
      this.characterRigidBody.setLinvel(this.linvel, true);
    }
  }

  destroy() {
    window.removeEventListener("keydown", this.keyEventHandler);
    window.removeEventListener("keyup", this.keyEventHandler);
    window.removeEventListener("mousemove", this.mouseMoveEventHandler);
    window.removeEventListener("mousedown", this.mouseDownEventHandler);
    window.removeEventListener("mouseup", this.mouseUpEventHandler);
    window.removeEventListener("blur", this.windowBlurEventHandler);
    this.characterAnimationController.removeEventListener(
      "shootFinished",
      this.animationFinishedEventHandler
    );
  }
}
