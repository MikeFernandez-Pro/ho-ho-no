import Experience from "#experience/Experience.js";
import * as THREE from "three";

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

const SPEED = 7.5;
// Keep this in sync with ProjectilesFactory's SHOOT_OFFSET_LOCAL.y (muzzle height)
const AIM_HEIGHT_OFFSET = 0.596;

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

    // Start the smoothed rotation from the current matrix rotation

    this.eventKeys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      enter: false,
    };

    window.addEventListener("click", this.clickEventHandler);
    window.addEventListener("keydown", this.keyEventHandler);
    window.addEventListener("keyup", this.keyEventHandler);
    window.addEventListener("mousemove", this.mouseMoveEventHandler);
    this.characterAnimationController.addEventListener(
      "shootFinished",
      this.animationFinishedEventHandler
    );
  }

  clickEventHandler = () => {
    if (this.isShooting) {
      return;
    }

    this.isShooting = true;

    // Compute the aim point at muzzle height so projectiles can be fired
    // from an offset muzzle while still passing through the cursor.
    const aimPlaneHeight =
      this.character.characterScene.position.y + AIM_HEIGHT_OFFSET;
    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -aimPlaneHeight);
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

  animationFinishedEventHandler = (event) => {
    this.isShooting = false;
  };

  mouseMoveEventHandler = (e) => {
    this.mouse.x = (e.clientX / this.sizes.width) * 2 - 1;
    this.mouse.y = -(e.clientY / this.sizes.height) * 2 + 1;
  };

  keyEventHandler = (event) => {
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
    const velocity = this.characterRigidBody.linvel();

    this.character.characterScene.position.x =
      this.characterRigidBody.translation().x;
    this.character.characterScene.position.z =
      this.characterRigidBody.translation().z;

    this.setCharacterOrientation();

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
      this.direction.normalize().multiplyScalar(SPEED);

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
    window.removeEventListener("click", this.clickEventHandler);
    this.characterAnimationController.removeEventListener(
      "shootFinished",
      this.animationFinishedEventHandler
    );
  }
}
