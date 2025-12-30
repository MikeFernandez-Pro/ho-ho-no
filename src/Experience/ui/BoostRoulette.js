import gsap from "gsap";
import Experience from "#experience/Experience.js";

const BOOSTS = [
  { key: "shoot", src: "/ui/shootBoost.png", className: "shootBoost" },
  { key: "ghost", src: "/ui/ghostBoost.png", className: "ghostBoost" },
  { key: "speed", src: "/ui/speedBoost.png", className: "speedBoost" },
];

function pickRandomBoostKey() {
  return BOOSTS[(Math.random() * BOOSTS.length) | 0].key;
}

function pickRandomBoostKeyAvoid(avoidKey) {
  if (!avoidKey) return pickRandomBoostKey();
  let k = pickRandomBoostKey();
  // BOOSTS is tiny, so a simple retry loop is fine.
  while (k === avoidKey) k = pickRandomBoostKey();
  return k;
}

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

export default class BoostRoulette {
  constructor() {
    this.experience = new Experience();

    this.container = document.querySelector(".boost-container");
    if (!this.container) return;

    this.container.classList.add("boost-roulette");
    this.container.classList.remove("is-visible");

    // We take ownership of the content so we can build a "slot strip" dynamically.
    this.container.innerHTML = `
      <div class="boost-track" aria-live="polite"></div>
    `;
    this.track = this.container.querySelector(".boost-track");

    this.isSpinning = false;
    this.currentTween = null;
    this.countdownTween = null;
    this.currentResolve = null;
    this.currentPromise = null;

    this.activeDurationMs = 10000;
  }

  hide = () => {
    if (!this.container || !this.track) return;
    if (this.currentTween) {
      this.currentTween.kill();
      this.currentTween = null;
    }
    if (this.countdownTween) {
      this.countdownTween.kill();
      this.countdownTween = null;
    }
    this.container.classList.remove("is-visible", "is-spinning");
    this.container.classList.remove("is-active");
    this.track.innerHTML = "";
    gsap.set(this.track, { x: 0 });
  };

  showActiveBoost = (key) => {
    if (!this.container || !this.track) return;
    const boost = BOOSTS.find((b) => b.key === key);
    if (!boost) return;

    // Activate gameplay boost immediately when the roulette stops on it.
    this.experience.activeBoost = key;

    // Replace strip with the selected boost only.
    this.track.innerHTML = `
      <div class="boost-active" data-boost="${boost.key}">
        <img src="${boost.src}" alt="${boost.key} boost" class="${boost.className}" />
        <svg class="boost-active__pie" viewBox="0 0 100 100" aria-hidden="true">
          <path class="boost-active__pie-path" d=""></path>
        </svg>
      </div>
    `;

    this.container.classList.add("is-visible", "is-active");
    this.container.classList.remove("is-spinning");
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
      piePath.setAttribute(
        "d",
        describeSector(cx, cy, r, startAngle, endAngle)
      );
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
        // Scale down + fade out at the end, then hide.
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

  /**
   * Spin the roulette: show UI, spin fast, slow down, and stop on a boost.
   * @param {{ forcedKey?: "shoot"|"ghost"|"speed" }} options
   * @returns {Promise<"shoot"|"ghost"|"speed"|null>}
   */
  spin = (options = {}) => {
    if (!this.container || !this.track) return Promise.resolve(null);
    if (this.isSpinning) return this.currentPromise ?? Promise.resolve(null);

    // Reset any "active boost" state (top display) before starting a new spin.
    this.container.classList.remove("is-active");

    const forcedKey = options.forcedKey;
    const selectedKey =
      forcedKey && BOOSTS.some((b) => b.key === forcedKey)
        ? forcedKey
        : pickRandomBoostKey();

    // Build a long strip so it *looks* infinite while spinning.
    // Constraint: never repeat the same boost twice in a row.
    const N = 36;
    const targetIndex = N - 6;
    const sequence = new Array(N);

    let prev = null;
    for (let i = 0; i < targetIndex; i++) {
      sequence[i] = pickRandomBoostKeyAvoid(prev);
      prev = sequence[i];
    }

    // Ensure the item right before the selected stop isn't identical to the selected one.
    if (targetIndex - 1 >= 0 && sequence[targetIndex - 1] === selectedKey) {
      const beforePrev =
        targetIndex - 2 >= 0 ? sequence[targetIndex - 2] : null;
      let candidate = pickRandomBoostKeyAvoid(beforePrev);
      while (candidate === selectedKey)
        candidate = pickRandomBoostKeyAvoid(beforePrev);
      sequence[targetIndex - 1] = candidate;
    }

    sequence[targetIndex] = selectedKey;
    prev = selectedKey;

    for (let i = targetIndex + 1; i < N; i++) {
      sequence[i] = pickRandomBoostKeyAvoid(prev);
      prev = sequence[i];
    }

    this.track.innerHTML = sequence
      .map((key) => {
        const boost = BOOSTS.find((b) => b.key === key);
        return `
          <div class="boost-item" data-boost="${boost.key}">
            <img src="${boost.src}" alt="${boost.key} boost" class="${boost.className}" />
          </div>
        `;
      })
      .join("");

    // Force layout before measuring.
    this.container.classList.add("is-visible", "is-spinning");
    gsap.set(this.track, { x: 0 });

    const trackRect = this.track.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const targetEl = this.track.children[targetIndex];
    if (!targetEl) return Promise.resolve(null);

    const targetRect = targetEl.getBoundingClientRect();
    const targetCenterRelativeToTrack =
      targetRect.left - trackRect.left + targetRect.width / 2;

    const endX = containerRect.width / 2 - targetCenterRelativeToTrack;
    const phase1X = endX * 0.7;

    this.isSpinning = true;

    this.currentPromise = new Promise((resolve) => {
      this.currentResolve = resolve;

      if (this.currentTween) {
        this.currentTween.kill();
        this.currentTween = null;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          this.isSpinning = false;
          this.container.classList.remove("is-spinning");

          // Show only the selected boost in the HUD for 15s with a pie countdown overlay.
          this.showActiveBoost(selectedKey);

          const r = this.currentResolve;
          this.currentResolve = null;
          this.currentPromise = null;
          if (r) r(selectedKey);
        },
      });

      tl.to(this.track, {
        duration: 0.45,
        x: phase1X,
        ease: "none",
      }).to(this.track, {
        duration: 1.25,
        x: endX,
        ease: "power3.out",
      });

      this.currentTween = tl;
    });

    return this.currentPromise;
  };
}
