import gsap from "gsap";
import Experience from "#experience/Experience.js";

export default class GameOver {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.enemy = this.experience.world.enemy;

    this.gameOverOverlay = document.querySelector(".game-over-overlay");
    this.isGameOver = false;

    this.resources.addEventListener("ready", this.sourcesReadyEventHandler);
  }

  sourcesReadyEventHandler = () => {
    this.enemy = this.experience.world.enemy;
    this.enemy.addEventListener(
      "enemyHitCharacter",
      this.enemyHitCharacterEventHandler
    );
  };

  enemyHitCharacterEventHandler = () => {
    if (this.isGameOver) return;
    this.isGameOver = true;

    if (!this.gameOverOverlay) return;

    this.enemiesDefeatedText = document.querySelector(".enemies-defeated-text");
    this.timeSurvivedText = document.querySelector(".time-survived-text");

    this.enemiesDefeated = this.experience.killsCounter.kills;
    this.timeSurvived = this.experience.gameTimer.timeSurvived;

    if (this.enemiesDefeatedText) {
      this.enemiesDefeatedText.textContent = `Enemies defeated: ${this.enemiesDefeated}`;
    }
    if (this.timeSurvivedText) {
      this.timeSurvivedText.textContent = `Time survived: ${this.timeSurvived}`;
    }

    // show overlay and reset radius
    this.gameOverOverlay.classList.add("is-active");
    gsap.killTweensOf(this.gameOverOverlay);
    gsap.set(this.gameOverOverlay, { "--r": "0vmax" });

    // animate the circle to cover the whole screen
    requestAnimationFrame(() => {
      gsap.to(this.gameOverOverlay, {
        duration: 0.5,
        ease: "power2.in",
        "--r": "150vmax",
      });
    });
  };
}
