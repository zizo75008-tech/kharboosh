(function (global) {
  "use strict";

  const BEST_KEY = "kharboosh_best_score";

  class CatchCoffeeGame {
    constructor() {
      this.overlay = document.getElementById("minigame-overlay");
      this.canvas = document.getElementById("minigame-canvas");
      this.ctx = this.canvas.getContext("2d");

      this.elScore = document.getElementById("mg-score");
      this.elCombo = document.getElementById("mg-combo");
      this.elTime = document.getElementById("mg-time");
      this.elBest = document.getElementById("mg-best");
      this.resultBox = document.getElementById("minigame-result");
      this.resTitle = document.getElementById("mg-result-title");
      this.resMsg = document.getElementById("mg-result-msg");

      this.running = false;
      this.skin = "coffee";
      this.accessory = "shades";
      this.score = 0;
      this.combo = 1;
      this.timeLeft = 25;
      this.best = Number(localStorage.getItem(BEST_KEY) || "0");
      this.elBest.textContent = String(this.best);

      this.playerX = 300;
      this.targetX = 300;
      this.flipX = false;
      this.keys = { left: false, right: false };
      this.items = [];
      this.popups = [];
      this.spawnTimer = 0;
      this.lastTs = 0;
      this.secondAccum = 0;
      this.rafId = 0;
      this.onFinish = () => {};

      // Reusable offscreen player sprite canvas (96x96)
      this.playerCanvas = document.createElement("canvas");
      this.playerCanvas.width = 96;
      this.playerCanvas.height = 96;
      this.playerCtx = this.playerCanvas.getContext("2d");

      this._bindEvents();
    }

    _bindEvents() {
      this.canvas.addEventListener("pointermove", (e) => {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        this.targetX = e.clientX - rect.left;
      });

      this.canvas.addEventListener("pointerdown", (e) => {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        this.targetX = e.clientX - rect.left;
      });

      global.addEventListener("keydown", (e) => {
        if (!this.running) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = true;
      });

      global.addEventListener("keyup", (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = false;
      });

      document.getElementById("btn-mg-exit").addEventListener("click", () => {
        this.stop(true);
      });
      document.getElementById("btn-mg-replay").addEventListener("click", () => {
        this.start(this.skin, this.accessory, this.onFinish);
      });
      document.getElementById("btn-mg-close").addEventListener("click", () => {
        this.stop(true);
      });
    }

    resize() {
      const rect = this.overlay.getBoundingClientRect();
      this.canvas.width = Math.max(320, Math.floor(rect.width));
      this.canvas.height = Math.max(240, Math.floor(rect.height));
      if (this.playerX > this.canvas.width - 48) {
        this.playerX = this.canvas.width / 2;
        this.targetX = this.playerX;
      }
    }

    start(skin, accessory, onFinish) {
      this.skin = skin || "coffee";
      this.accessory = accessory || "shades";
      this.onFinish = onFinish || (() => {});
      this.overlay.classList.remove("hidden");
      this.resultBox.classList.add("hidden");
      this.resize();

      this.score = 0;
      this.combo = 1;
      this.timeLeft = 25;
      this.items = [];
      this.popups = [];
      this.spawnTimer = 0;
      this.secondAccum = 0;
      this.playerX = this.canvas.width / 2;
      this.targetX = this.playerX;
      this.running = true;

      this._updateHud();
      this.lastTs = performance.now();
      cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame((ts) => this._loop(ts));
    }

    stop(hideOverlay) {
      this.running = false;
      cancelAnimationFrame(this.rafId);
      if (hideOverlay) {
        this.overlay.classList.add("hidden");
        this.resultBox.classList.add("hidden");
      }
      if (hideOverlay && this.onFinish) {
        this.onFinish(null, null, true);
      }
    }

    _updateHud() {
      this.elScore.textContent = String(this.score);
      this.elCombo.textContent = String(this.combo);
      this.elTime.textContent = String(this.timeLeft);
      this.elBest.textContent = String(this.best);
    }

    _spawnItem() {
      const roll = Math.random();
      let kind = this.skin === "egypt" ? "tea" : "coffee";
      let points = 1;
      let speed = 175 + Math.random() * 145;

      if (roll > 0.84) {
        kind = "bug";
        points = -1;
        speed += 50;
      } else if (roll > 0.66) {
        kind = this.skin === "egypt" ? "taameya" : "golden";
        points = 3;
        speed += 35;
      }

      const margin = 42;
      const x = margin + Math.random() * Math.max(40, this.canvas.width - margin * 2);
      this.items.push({ x, y: -36, kind, points, speed });
    }

    _loop(ts) {
      if (!this.running) return;
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;

      // Countdown timer
      this.secondAccum += dt;
      if (this.secondAccum >= 1) {
        this.secondAccum -= 1;
        this.timeLeft -= 1;
        this._updateHud();
        if (this.timeLeft <= 0) {
          this._finishRound();
          return;
        }
      }

      // Keyboard movement
      const keySpeed = 520;
      if (this.keys.left) this.targetX -= keySpeed * dt;
      if (this.keys.right) this.targetX += keySpeed * dt;
      this.targetX = Math.max(48, Math.min(this.canvas.width - 48, this.targetX));

      const dx = this.targetX - this.playerX;
      if (Math.abs(dx) > 2) {
        this.flipX = dx < 0;
        this.playerX += dx * Math.min(1, dt * 14);
      }

      // Spawn falling cups
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawnItem();
        this.spawnTimer = 0.42 + Math.random() * 0.34;
      }

      // Update items & collisions
      const catchY = this.canvas.height - 86;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.y += it.speed * dt;

        const hitX = Math.abs(it.x - this.playerX) < 48;
        const hitY = it.y >= catchY - 26 && it.y <= catchY + 40;
        if (hitX && hitY) {
          if (it.kind === "bug") {
            this.score = Math.max(0, this.score - 1);
            this.combo = 1;
            this.popups.push({ x: it.x, y: catchY - 24, text: "BUG! -1", color: "#fb7185", life: 0.9 });
            global.KharbooshAudio.playBadCatch();
          } else {
            this.score += it.points;
            this.combo = Math.min(9, this.combo + 1);
            const label = it.points > 1 ? `+${it.points} 🔥` : "+1 ☕";
            this.popups.push({ x: it.x, y: catchY - 24, text: label, color: "#fbbf24", life: 0.85 });
            global.KharbooshAudio.playCatch(this.combo);
          }
          if (this.score > this.best) {
            this.best = this.score;
            localStorage.setItem(BEST_KEY, String(this.best));
          }
          this._updateHud();
          this.items.splice(i, 1);
          continue;
        }

        if (it.y > this.canvas.height + 40) {
          if (it.kind !== "bug") this.combo = 1;
          this._updateHud();
          this.items.splice(i, 1);
        }
      }

      // Update popups
      for (let i = this.popups.length - 1; i >= 0; i--) {
        this.popups[i].y -= 42 * dt;
        this.popups[i].life -= dt;
        if (this.popups[i].life <= 0) this.popups.splice(i, 1);
      }

      this._draw();
      this.rafId = requestAnimationFrame((nextTs) => this._loop(nextTs));
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.imageSmoothingEnabled = false;

      // Draw falling items
      for (const it of this.items) {
        global.KharbooshSprites.drawItem(ctx, it.kind, Math.round(it.x - 24), Math.round(it.y - 24), 3);
      }

      // Draw Kharboosh catcher
      global.KharbooshSprites.drawKharboosh(this.playerCtx, "game1", this.accessory, this.flipX);
      ctx.drawImage(this.playerCanvas, Math.round(this.playerX - 48), this.canvas.height - 96);

      // Draw score popups
      ctx.font = 'bold 16px "Cairo", sans-serif';
      ctx.textAlign = "center";
      for (const p of this.popups) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;
    }

    _finishRound() {
      this.running = false;
      cancelAnimationFrame(this.rafId);
      global.KharbooshAudio.playAlarm();

      const unit = this.skin === "egypt" ? "أكلة وكوباية" : "كوبايات";
      let title = `${this.score} كوبايات — مش وحش يا عم!`;
      let msg = `${this.score} ${unit}! شغل عالي يا زوز، مزاجك رايق ☕`;

      if (this.score === 9) {
        title = "9 كوبايات! مش وحش يا عم 😎";
        msg = "تسع كوبايات! مش وحش خالص يا عم، إنت فايق ومركز أوي ☕😎";
      } else if (this.score < 5) {
        title = `${this.score} بس؟ الكافيين قليل!`;
        msg = "إيه ده يا زميلي؟ القهوة وقعت على الكيبورد! شكلك محتاج تفوق 😂";
      } else if (this.score >= 16) {
        title = `${this.score}! أستاذ باريستا ⚡`;
        msg = `يا اسطى إنت وحش! ${this.score} ${unit} في خمسة وعشرين ثانية، القهوة في دمك 🔥`;
      }

      this.resTitle.textContent = title;
      this.resMsg.textContent = msg;
      this.resultBox.classList.remove("hidden");

      if (this.onFinish) {
        this.onFinish(this.score, msg, false);
      }
    }
  }

  global.KharbooshGame = new CatchCoffeeGame();
})(window);
