import gsap from "gsap";
import Experience from "#experience/Experience.js";

// Keep keys in sync with gameplay checks:
// - CharacterController: "speed", "shoot"
// - ProjectilesFactory: "ghost" (piercing shots)
const BOOSTS = [
  {
    key: "shoot",
    src: "/ui/shootBoost.png",
    className: "shootBoost",
    label: "Rapid fire!",
  },
  {
    key: "ghost",
    src: "/ui/ghostBoost.png",
    className: "ghostBoost",
    label: "Piercing shot!",
  },
  {
    key: "speed",
    src: "/ui/speedBoost.png",
    className: "speedBoost",
    label: "Speed boost!",
  },
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  };
}

// Returns an SVG path for a filled sector ("camembert") from startAngle to endAngle (degrees).
function describeSector(cx, cy, r, startAngleDeg, endAngleDeg) {
  const delta = endAngleDeg - startAngleDeg;
  const largeArc = delta > 180 ? 1 : 0;

  const start = polarToCartesian(cx, cy, r, startAngleDeg);
  const end = polarToCartesian(cx, cy, r, endAngleDeg);

  // Sweep flag 1 => clockwise in SVG y-down coords if we use standard angles with sin/cos.
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default class BoostIndicator {
  constructor() {
    this.experience = new Experience();

    this.container = document.querySelector(".boost-container");
    if (!this.container) return;

    this.container.classList.remove("boost-roulette");
    this.container.classList.remove("is-visible", "is-spinning", "is-active");

    // Own the content so we can render only the active boost + timer.
    this.container.innerHTML = `
      <div class="boost-track" aria-live="polite"></div>
    `;
    this.track = this.container.querySelector(".boost-track");

    this.countdownTween = null;

    // Keep EXACT same duration behavior as before (the old boost timer).
    this.activeDurationMs = 10000;
  }

  hide = () => {
    if (!this.container || !this.track) return;
    if (this.countdownTween) {
      this.countdownTween.kill();
      this.countdownTween = null;
    }
    this.container.classList.remove("is-visible");
    this.container.classList.remove("is-active");
    this.track.innerHTML = "";
    gsap.set(this.track, { x: 0 });
  };

  /**
   * Show the boost icon in the middle with the same pie countdown overlay as before.
   * Also sets/clears `experience.activeBoost` for gameplay.
   * @param {"shoot"|"ghost"|"speed"} key
   */
  showActiveBoost = (key) => {
    if (!this.container || !this.track) return;
    const boost = BOOSTS.find((b) => b.key === key);
    if (!boost) return;

    // Activate gameplay boost immediately.
    this.experience.activeBoost = key;

    this.track.innerHTML = `
      <div class="boost-active" data-boost="${boost.key}">
        <p class="boost-active__label">${boost.label ?? ""}</p>
        <div class="boost-active__icon" aria-hidden="true">
          <img src="${boost.src}" alt="${boost.key} boost" class="${boost.className}" />
          <svg class="boost-active__pie" viewBox="0 0 100 100" aria-hidden="true">
            <path class="boost-active__pie-path" d=""></path>
          </svg>
        </div>
      </div>
    `;

    this.container.classList.add("is-visible", "is-active");
    gsap.set(this.track, { x: 0 });

    const activeEl = this.track.querySelector(".boost-active");
    if (activeEl) {
      gsap.set(activeEl, { scale: 1, opacity: 1, transformOrigin: "50% 50%" });
    }

    const piePath = this.track.querySelector(".boost-active__pie-path");
    if (!piePath) return;

    const startAngle = -90; // start at top
    const r = 48;
    const cx = 50;
    const cy = 50;

    const state = { p: 0 };
    const update = () => {
      // Cap < 1 turn to avoid SVG full-circle arc edge case.
      const p = Math.max(0, Math.min(0.99999, state.p));
      if (p <= 0.0001) {
        piePath.setAttribute("d", "");
        return;
      }
      const endAngle = startAngle + p * 360;
      piePath.setAttribute("d", describeSector(cx, cy, r, startAngle, endAngle));
    };

    update();

    if (this.countdownTween) {
      this.countdownTween.kill();
      this.countdownTween = null;
    }

    this.countdownTween = gsap.to(state, {
      p: 1,
      duration: this.activeDurationMs / 1000,
      ease: "none",
      onUpdate: update,
      onComplete: () => {
        const doHide = () => {
          // Clear active boost when it expires (only if it hasn't been replaced).
          if (this.experience.activeBoost === key) {
            this.experience.activeBoost = null;
          }
          this.hide();
        };

        if (!activeEl) {
          doHide();
          return;
        }

        gsap.to(activeEl, {
          duration: 0.25,
          ease: "power2.in",
          scale: 0,
          opacity: 0,
          onComplete: doHide,
        });
      },
    });
  };
}


