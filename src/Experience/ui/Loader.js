import gsap from "gsap";
import Experience from "#experience/Experience.js";

export default class Loader {
  constructor() {
    this.experience = new Experience();
    this.resources = this.experience.resources;

    this.overlayEl = document.querySelector(".loading-overlay");
    this.overlayMaskHoleEl = document.querySelector(
      ".loading-overlay-mask__hole"
    );
    this.loadingTextEl = document.querySelector(".loading-text");
    this.loadCircleContainerEl = document.querySelector(
      ".load-circle-container"
    );
    this.percentTextEl = this.loadCircleContainerEl?.querySelector("p") ?? null;
    this.circleEl = this.loadCircleContainerEl?.querySelector("circle") ?? null;

    this.circleLength = 0;
    if (this.circleEl) {
      // Use the real SVG path length (robust if you change radius/stroke)
      this.circleLength = this.circleEl.getTotalLength();
      this.circleEl.style.strokeDasharray = `${this.circleLength}`;
      this.circleEl.style.strokeDashoffset = `${this.circleLength}`;
      this.circleEl.style.transition = "stroke-dashoffset 150ms linear";
    }

    // Set initial UI state and then react to resource progress
    this.syncFromResources();
    this.resources.addEventListener("progress", this.onProgress);
    this.resources.addEventListener("ready", this.onReady);
  }

  onProgress = (e) => {
    // Prefer event payload, but fall back to current resource counters
    const loaded =
      typeof e?.loaded === "number" ? e.loaded : this.resources.loaded;
    const toLoad =
      typeof e?.toLoad === "number" ? e.toLoad : this.resources.toLoad;

    const raw = toLoad === 0 ? 1 : loaded / toLoad;
    const clamped = Math.min(1, Math.max(0, raw));
    const percent = Math.round(clamped * 100);

    if (this.percentTextEl) this.percentTextEl.textContent = `${percent}%`;

    if (this.circleEl && this.circleLength > 0) {
      this.circleEl.style.strokeDashoffset = `${
        this.circleLength * (1 - clamped)
      }`;
    }
  };

  onReady = () => {
    // Force 100% just in case of rounding
    this.onProgress({
      loaded: this.resources.toLoad,
      toLoad: this.resources.toLoad,
    });

    // Stop updating progress UI once ready
    this.resources.removeEventListener("progress", this.onProgress);
    this.resources.removeEventListener("ready", this.onReady);

    // Replace loader UI with Start button in the exact same spot
    if (this.loadingTextEl) this.loadingTextEl.style.display = "none";
    if (this.overlayEl) this.overlayEl.classList.add("is-ready");

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "loading-button loading-button--start is-visible";
    startButton.textContent = "Play";

    startButton.addEventListener(
      "click",
      () => {
        if (!this.overlayEl) return;

        // Start gameplay timing/spawns immediately on click
        this.experience.startGame?.();

        // Prevent any interaction during the transition
        this.overlayEl.style.pointerEvents = "none";

        // Fade out all overlay UI (keep the mask layer running)
        const overlayChildren = Array.from(this.overlayEl.children);
        const uiChildren = overlayChildren.filter(
          (el) => !el.classList.contains("loading-overlay-mask")
        );
        if (uiChildren.length) {
          gsap.to(uiChildren, {
            duration: 0.18,
            ease: "power1.out",
            opacity: 0,
          });
        }

        // Animate the "hole" expanding from the center to reveal the canvas
        if (this.overlayMaskHoleEl) {
          const w = window.innerWidth || 0;
          const h = window.innerHeight || 0;
          const rFinal = Math.ceil(Math.hypot(w, h) / 2) + 20;

          gsap.killTweensOf(this.overlayMaskHoleEl);
          gsap.set(this.overlayMaskHoleEl, { attr: { r: 0 } });

          gsap.to(this.overlayMaskHoleEl, {
            duration: 0.5,
            ease: "power2.in",
            attr: { r: rFinal },
            onComplete: () => {
              if (this.overlayEl) this.overlayEl.style.display = "none";
            },
          });
          return;
        }

        // Fallback (if mask element is missing for any reason)
        this.overlayEl.style.transition = "opacity 350ms ease";
        this.overlayEl.style.opacity = "0";
        window.setTimeout(() => {
          if (this.overlayEl) this.overlayEl.style.display = "none";
        }, 400);
      },
      { once: true }
    );

    if (this.loadCircleContainerEl) {
      this.loadCircleContainerEl.replaceWith(startButton);
    } else if (this.overlayEl) {
      this.overlayEl.appendChild(startButton);
    }

    // Helpful for keyboard users
    startButton.focus?.({ preventScroll: true });
  };

  syncFromResources() {
    this.onProgress({
      loaded: this.resources.loaded,
      toLoad: this.resources.toLoad,
    });
  }
}
