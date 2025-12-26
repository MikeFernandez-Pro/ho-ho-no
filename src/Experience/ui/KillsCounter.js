import Experience from "#experience/Experience.js";
export default class KillsCounter {
  constructor() {
    this.experience = new Experience();
    this.resources = this.experience.resources;
    this.enemy = null;

    this.killsCounterText = document.querySelector(".counter-text");
    if (this.killsCounterText) {
      this.killsCounterText.textContent = "x 0";
    }
    this.kills = 0;

    this.resources.addEventListener("ready", this.sourcesReadyEventHandler);
  }

  sourcesReadyEventHandler = () => {
    // `World` instantiates `enemy` only after resources are ready.
    this.enemy = this.experience.world?.enemy ?? null;
    if (!this.enemy) return;

    this.enemy.addEventListener("enemyHit", this.enemyHitEventHandler);
  };

  enemyHitEventHandler = () => {
    this.kills++;
    if (this.killsCounterText) {
      this.killsCounterText.textContent = `x ${this.kills}`;
    }
  };
}
