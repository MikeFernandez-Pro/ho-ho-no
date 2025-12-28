import Experience from "#experience/Experience.js";

export default class GameTimer {
  constructor() {
    this.experience = new Experience();
    this.timerText = document.querySelector(".timer-text");
    this.timeSurvived = "0 : 00";
    if (this.timerText) this.timerText.textContent = this.timeSurvived;
  }

  update() {
    // Count only time spent in an active run (after Start click)
    const elapsed = this.experience.getGameElapsedSeconds(); // seconds (float)
    const totalSeconds = Math.floor(elapsed);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    this.timeSurvived = `${minutes} : ${seconds.toString().padStart(2, "0")}`;

    if (this.timerText) this.timerText.textContent = this.timeSurvived;
  }
}
