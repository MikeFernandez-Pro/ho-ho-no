import * as THREE from "three";

import Experience from "#experience/Experience.js";

export default class CharacterAnimationController extends THREE.EventDispatcher {
  constructor(character) {
    super();

    this.character = character;
    this.experience = new Experience();
    this.resources = this.experience.resources;

    this.characterResource = this.resources.items.characterModel;
    this.characterScene = this.characterResource.scene;
    this.characterAnimations = this.characterResource.animations;
    this.characterController = null;

    // Animation state
    this.isShooting = false;
    this.isMoving = false;
    this.currentName = "idle";

    this.setMixer();
    this.setActions();

    this.mixer.addEventListener("finished", this.animationFinishedEventHandler);

    // CharacterController may be created after this controller; bind when available.
    // this.bindCharacterController(character.characterController);
  }

  shootEventHandler = () => {
    this.isShooting = true;
    this.play("shoot");
  };

  animationFinishedEventHandler = (event) => {
    const actionName = event.action.getClip().name;
    if (actionName === "shoot") {
      this.isShooting = false;
      this.dispatchEvent({
        type: "shootFinished",
      });
      // After a one-shot animation ends, resume locomotion automatically.
      this.applyMovementAnimation();
    }
  };

  setMixer() {
    this.mixer = new THREE.AnimationMixer(this.characterScene);
  }

  setActions() {
    this.actions = {
      idle: this.mixer.clipAction(this.characterAnimations[0]),
      run: this.mixer.clipAction(this.characterAnimations[1]),
      shoot: this.mixer.clipAction(this.characterAnimations[2]),
    };

    this.actions.shoot.loop = THREE.LoopOnce;
    this.actions.shoot.clampWhenFinished = true;
    this.actions.shoot.timeScale = 1.5;

    this.actions.current = this.actions.idle;

    this.play("idle");
  }

  play(name) {
    const safeName = this.actions[name] ? name : "idle";
    if (this.currentName === safeName) {
      return;
    }

    const newAction = this.actions[safeName];
    const oldAction = this.actions.current;

    newAction.reset();
    newAction.play();
    newAction.crossFadeFrom(oldAction, 0.1);

    this.actions.current = newAction;
    this.currentName = safeName;
  }

  /**
   * Report locomotion intent from gameplay code (e.g. controller input).
   * The controller decides which looped animation (idle/run) should be active,
   * unless a one-shot animation (shoot) is currently playing.
   */
  setMovementAnimation(isMoving) {
    this.isMoving = !!isMoving;

    this.applyMovementAnimation();
  }

  applyMovementAnimation() {
    if (this.isShooting) {
      return;
    }

    const target = this.isMoving ? "run" : "idle";
    this.play(target);
  }

  bindCharacterController(characterController) {
    this.characterController = characterController;

    this.characterController.addEventListener("shoot", this.shootEventHandler);
  }

  update() {
    this.mixer.update(this.character.time.delta * 0.001);
  }

  destroy() {
    this.mixer.removeEventListener(
      "finished",
      this.animationFinishedEventHandler
    );

    if (this.characterController) {
      this.characterController.removeEventListener(
        "shoot",
        this.shootEventHandler
      );
    }
  }
}
