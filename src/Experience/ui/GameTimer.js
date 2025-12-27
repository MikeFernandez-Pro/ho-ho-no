import Experience from "#experience/Experience.js";

export default class GameTimer {
  constructor() {
    this.experience = new Experience();
    this.timerText = document.querySelector(".timer-text");
  }

  update() {
    const elapsed = this.experience.time.elapsed; // seconds (float)
    const totalSeconds = Math.floor(elapsed);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    this.timerText.textContent = `${minutes} : ${seconds
      .toString()
      .padStart(2, "0")}`;
  }
}
