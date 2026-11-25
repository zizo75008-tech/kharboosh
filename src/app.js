(function (global) {
  "use strict";

  const STORAGE_KEY = "kharboosh_prefs_v1";

  const STATE_LABELS = {
    idle: { emoji: "😎", text: "صاحي ورايق" },
    walk: { emoji: "🚶", text: "بيتمشى ع الدوك" },
    talk: { emoji: "💬", text: "بيرغي معاك" },
    laugh: { emoji: "😂", text: "بيضحك من قلبه" },
    focus: { emoji: "🔒", text: "مركز (Locked In)" },
    sleep: { emoji: "😴", text: "نايم في السرير الأزرق" },
    game: { emoji: "☕", text: "بيلعب Catch Coffee" },
    sip: { emoji: "🥤", text: "بيشرب قهوة" }
  };

  class KharbooshApp {
    constructor() {
      this.prefs = this._loadPrefs();

      // DOM refs
      this.petStage = document.getElementById("pet-stage");
      this.kharbooshWrap = document.getElementById("kharboosh-wrap");
      this.kharbooshCanvas = document.getElementById("kharboosh-canvas");
      this.kCtx = this.kharbooshCanvas.getContext("2d");

      this.companionWrap = document.getElementById("companion-wrap");
      this.companionCanvas = document.getElementById("companion-canvas");
      this.cCtx = this.companionCanvas.getContext("2d");
      this.companionBubble = document.getElementById("companion-bubble");
      this.companionBubbleText = document.getElementById("companion-bubble-text");

      this.bedCanvas = document.getElementById("bed-canvas");
      this.bCtx = this.bedCanvas.getContext("2d");
      this.zzzLayer = document.getElementById("zzz-layer");

      this.speechBubble = document.getElementById("speech-bubble");
      this.bubbleText = document.getElementById("bubble-text");
      this.bubbleChoices = document.getElementById("bubble-choices");

      this.focusPill = document.getElementById("focus-pill");
      this.focusTimerText = document.getElementById("focus-timer-text");
      this.focusModalClock = document.getElementById("focus-modal-clock");
      this.focusDimOverlay = document.getElementById("focus-dim-overlay");
      this.terminalLog = document.getElementById("terminal-log");

      this.petStateBadge = document.getElementById("pet-state-badge");
      this.petStateLabel = document.getElementById("pet-state-label");
      this.petHeadTag = document.getElementById("pet-head-tag");
      this.commandHud = document.querySelector(".command-hud");

      // Pet simulation state
      this.pet = {
        x: Math.max(120, Math.floor(global.innerWidth * 0.46)),
        targetX: null,
        yOffset: 0,
        flipX: false,
        state: "idle",
        frameTick: 0,
        dragging: false,
        dragStartX: 0,
        dragMoved: false,
        sleepPokes: 0
      };

      this.companion = {
        visible: Boolean(this.prefs.companionVisible),
        x: Math.max(220, Math.floor(global.innerWidth * 0.56)),
        flipX: true,
        state: "idle",
        bubbleTimer: null
      };

      this.focus = {
        durationSec: (this.prefs.focusMins || 25) * 60,
        remainingSec: (this.prefs.focusMins || 25) * 60,
        running: false,
        intervalId: null
      };

      this.bubbleTimer = null;
      this.typeTimer = null;
      this.idleSeconds = 0;
      this.zIndexCounter = 24;

      this._applySavedPrefs();
      this._bindUI();
      this._bindWindowDragging();
      this._bindPetDragging();
      this._setupVoiceCallbacks();
      this._startClockAndTimers();
      this._startAnimationLoop();
      this._bootGreeting();
    }

    _loadPrefs() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
      } catch (_) {
        return {};
      }
    }

    _savePrefs() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
      } catch (_) {}
    }

    _applySavedPrefs() {
      const theme = this.prefs.theme || "theme-cairo-night";
      document.body.className = theme;
      document.querySelectorAll("#theme-options .opt-card").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.theme === theme);
      });

      const acc = this.prefs.accessory || "shades";
      document.querySelectorAll("#accessory-options .opt-card").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.accessory === acc);
      });

      const skin = this.prefs.gameSkin || "coffee";
      document.querySelectorAll("#game-skin-options .opt-card").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.gameSkin === skin);
      });

      const audio = global.KharbooshAudio;
      audio.muted = Boolean(this.prefs.muted);
      audio.autoTTS = this.prefs.autoTTS !== false;
      audio.rate = Number(this.prefs.ttsRate || 1.05);
      audio.pitch = Number(this.prefs.ttsPitch || 1.0);
      audio.voiceURI = this.prefs.ttsVoice || "";
      audio.ttsEngine = this.prefs.ttsEngine || "browser";
      audio.ttsApiKey = this.prefs.ttsApiKey || "";

      document.getElementById("btn-sound-toggle").textContent = audio.muted ? "🔇" : "🔊";
      document.getElementById("chk-auto-tts").checked = audio.autoTTS;
      document.getElementById("chk-auto-sleep").checked = this.prefs.autoSleep !== false;
      document.getElementById("rng-tts-rate").value = String(audio.rate);
      document.getElementById("val-tts-rate").textContent = String(audio.rate);
      document.getElementById("rng-tts-pitch").value = String(audio.pitch);
      document.getElementById("val-tts-pitch").textContent = String(audio.pitch);
      document.getElementById("sel-tts-engine").value = audio.ttsEngine;
      document.getElementById("tts-key-box").classList.toggle("hidden", audio.ttsEngine === "browser");
      document.getElementById("inp-tts-key").value = audio.ttsApiKey;

      const sttLang = this.prefs.sttLang || "ar-EG";
      document.getElementById("sel-stt-lang").value = sttLang;
      global.KharbooshVoice.setLang(sttLang);

      const provider = this.prefs.llmProvider || "local";
      document.getElementById("sel-llm-provider").value = provider;
      document.getElementById("llm-key-box").classList.toggle("hidden", provider === "local");
      document.getElementById("inp-llm-key").value = this.prefs.llmKey || "";

      document.getElementById("notes-area").value = this.prefs.notes || "";

      // Populate TTS voices dropdown (prioritizing Egyptian Arabic)
      const voiceSel = document.getElementById("sel-tts-voice");
      const voiceStatusEl = document.getElementById("tts-voice-status");
      audio.onVoicesChanged((voices) => {
        voiceSel.innerHTML = "";
        const autoOpt = document.createElement("option");
        autoOpt.value = "";
        autoOpt.textContent = "تلقائي (صوت عربي مصري / عربي)";
        voiceSel.appendChild(autoOpt);

        const sorted = [...voices].sort((a, b) => {
          const aAr = /^ar/i.test(a.lang) ? 0 : 1;
          const bAr = /^ar/i.test(b.lang) ? 0 : 1;
          return aAr - bAr;
        });
        sorted.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v.voiceURI;
          opt.textContent = `${v.name} (${v.lang})`;
          voiceSel.appendChild(opt);
        });
        voiceSel.value = audio.voiceURI || "";

        const bestAr = audio.getPreferredVoice();
        if (bestAr) {
          voiceStatusEl.textContent = `✅ الصوت العربي جاهز: ${bestAr.name} (${bestAr.lang})`;
          voiceStatusEl.classList.add("ok");
        } else {
          voiceStatusEl.textContent =
            "⚠️ المتصفح الحالي لا يحتوي صوت عربي مثبت. على ويندوز افتح بـ Microsoft Edge لصوت مصري طبيعي فوراً، وعلى الآيفون فعّل الصوت العربي من الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات ← العربية.";
          voiceStatusEl.classList.remove("ok");
        }
      });

      this.setCompanionVisible(this.companion.visible, true);
      this._renderFocusClock();
    }

    _bindUI() {
      // Activity resets idle sleep counter & unlocks WebAudio + iOS speechSynthesis on first tap
      ["pointerdown", "keydown", "touchstart"].forEach((ev) => {
        document.addEventListener(
          ev,
          () => {
            this.idleSeconds = 0;
            global.KharbooshAudio.unlockForMobile();
          },
          { passive: true }
        );
      });

      // Collapsible HUD button for mobile screens
      const collapseBtn = document.getElementById("btn-hud-collapse");
      collapseBtn.addEventListener("click", () => {
        const collapsed = this.commandHud.classList.toggle("collapsed");
        collapseBtn.textContent = collapsed ? "▾" : "▴";
      });

      // Open/close mac windows
      document.querySelectorAll("[data-open-window]").forEach((el) => {
        el.addEventListener("click", () => {
          global.KharbooshAudio.playClick();
          this.openWindow(el.dataset.openWindow);
        });
      });
      document.querySelectorAll("[data-close-window]").forEach((el) => {
        el.addEventListener("click", () => {
          document.getElementById(el.dataset.closeWindow).classList.add("hidden");
        });
      });

      // Top menu & dock actions
      document.getElementById("btn-menu-checkin").addEventListener("click", () => this.triggerCheckIn());
      document.getElementById("btn-menu-companion").addEventListener("click", () =>
        this.setCompanionVisible(!this.companion.visible)
      );
      document.getElementById("dock-companion").addEventListener("click", () =>
        this.setCompanionVisible(!this.companion.visible)
      );
      document.getElementById("btn-menu-wardrobe").addEventListener("click", () =>
        this.openWindow("win-wardrobe")
      );

      document.getElementById("focus-pill").addEventListener("click", () => this.openWindow("win-focus"));
      document.getElementById("dock-focus").addEventListener("click", () => this.openWindow("win-focus"));
      document.getElementById("dock-game").addEventListener("click", () => this.startCoffeeGame());
      document.getElementById("desk-play-coffee").addEventListener("click", () => this.startCoffeeGame());
      document.getElementById("dock-sleep").addEventListener("click", () => {
        if (this.pet.state === "sleep") {
          this.wakeUp();
        } else {
          this.enterSleepMode();
        }
      });

      document.getElementById("btn-sound-toggle").addEventListener("click", (e) => {
        const audio = global.KharbooshAudio;
        audio.muted = !audio.muted;
        this.prefs.muted = audio.muted;
        this._savePrefs();
        e.currentTarget.textContent = audio.muted ? "🔇" : "🔊";
        if (audio.muted) audio.toggleAmbientFocus(false);
      });

      // Chat form & quick chips
      document.getElementById("chat-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const inp = document.getElementById("chat-input");
        const val = inp.value.trim();
        if (!val) return;
        inp.value = "";
        this.handleUserText(val);
      });

      document.querySelectorAll(".chip-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          global.KharbooshAudio.playClick();
          this.handleUserText(btn.dataset.phrase);
        });
      });

      // Bubble close
      document.getElementById("btn-bubble-close").addEventListener("click", (e) => {
        e.stopPropagation();
        this.hideBubble();
      });

      // Focus controls
      document.querySelectorAll("[data-focus-mins]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mins = Number(btn.dataset.focusMins);
          this.prefs.focusMins = mins;
          this._savePrefs();
          this.focus.durationSec = mins * 60;
          this.focus.remainingSec = mins * 60;
          this._renderFocusClock();
        });
      });
      document.getElementById("btn-focus-start").addEventListener("click", () => this.startFocus());
      document.getElementById("btn-focus-pause").addEventListener("click", () => this.pauseFocus());
      document.getElementById("btn-focus-reset").addEventListener("click", () => this.resetFocus());
      document.getElementById("chk-focus-ambient").addEventListener("change", (e) => {
        if (this.focus.running) {
          global.KharbooshAudio.toggleAmbientFocus(e.target.checked);
        }
      });

      // Wardrobe options
      document.querySelectorAll("#accessory-options .opt-card").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.prefs.accessory = btn.dataset.accessory;
          this._savePrefs();
          document.querySelectorAll("#accessory-options .opt-card").forEach((b) =>
            b.classList.toggle("active", b === btn)
          );
          this._renderSpritesNow();
          this.say("إيه رأيك في اللوك الجديد يا زوز؟ 😎✨", "talk");
        });
      });

      document.querySelectorAll("#theme-options .opt-card").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.prefs.theme = btn.dataset.theme;
          this._savePrefs();
          document.body.className = this.prefs.theme;
          document.querySelectorAll("#theme-options .opt-card").forEach((b) =>
            b.classList.toggle("active", b === btn)
          );
        });
      });

      document.querySelectorAll("#game-skin-options .opt-card").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.prefs.gameSkin = btn.dataset.gameSkin;
          this._savePrefs();
          document.querySelectorAll("#game-skin-options .opt-card").forEach((b) =>
            b.classList.toggle("active", b === btn)
          );
        });
      });

      // Voice & AI settings
      document.getElementById("sel-tts-voice").addEventListener("change", (e) => {
        global.KharbooshAudio.voiceURI = e.target.value;
        this.prefs.ttsVoice = e.target.value;
        this._savePrefs();
      });
      document.getElementById("sel-tts-engine").addEventListener("change", (e) => {
        global.KharbooshAudio.ttsEngine = e.target.value;
        this.prefs.ttsEngine = e.target.value;
        document.getElementById("tts-key-box").classList.toggle("hidden", e.target.value === "browser");
        this._savePrefs();
      });
      document.getElementById("inp-tts-key").addEventListener("input", (e) => {
        global.KharbooshAudio.ttsApiKey = e.target.value.trim();
        this.prefs.ttsApiKey = e.target.value.trim();
        this._savePrefs();
      });
      document.getElementById("rng-tts-rate").addEventListener("input", (e) => {
        global.KharbooshAudio.rate = Number(e.target.value);
        document.getElementById("val-tts-rate").textContent = e.target.value;
        this.prefs.ttsRate = Number(e.target.value);
        this._savePrefs();
      });
      document.getElementById("rng-tts-pitch").addEventListener("input", (e) => {
        global.KharbooshAudio.pitch = Number(e.target.value);
        document.getElementById("val-tts-pitch").textContent = e.target.value;
        this.prefs.ttsPitch = Number(e.target.value);
        this._savePrefs();
      });
      document.getElementById("sel-stt-lang").addEventListener("change", (e) => {
        global.KharbooshVoice.setLang(e.target.value);
        this.prefs.sttLang = e.target.value;
        this._savePrefs();
      });
      document.getElementById("chk-auto-tts").addEventListener("change", (e) => {
        global.KharbooshAudio.autoTTS = e.target.checked;
        this.prefs.autoTTS = e.target.checked;
        this._savePrefs();
      });
      document.getElementById("chk-auto-sleep").addEventListener("change", (e) => {
        this.prefs.autoSleep = e.target.checked;
        this._savePrefs();
      });
      document.getElementById("sel-llm-provider").addEventListener("change", (e) => {
        this.prefs.llmProvider = e.target.value;
        document.getElementById("llm-key-box").classList.toggle("hidden", e.target.value === "local");
        this._savePrefs();
      });
      document.getElementById("inp-llm-key").addEventListener("input", (e) => {
        this.prefs.llmKey = e.target.value.trim();
        this._savePrefs();
      });
      document.getElementById("btn-test-voice").addEventListener("click", () => {
        this.say("مساؤه يا زوز! صوتي طالع واضح ولا نضبط المقامات؟ 🎙️😎", "talk");
      });

      // Notes persistence
      document.getElementById("notes-area").addEventListener("input", (e) => {
        this.prefs.notes = e.target.value;
        this._savePrefs();
      });

      // Terminal quick buttons
      document.getElementById("btn-term-checkin").addEventListener("click", () => this.triggerCheckIn());
      document.getElementById("btn-term-laugh").addEventListener("click", () => {
        global.KharbooshAudio.playLaugh();
        this.say("ههههههه! كفاية هزار يا زوز هموت من الضحك 😂", "laugh");
      });
      document.getElementById("btn-term-banter").addEventListener("click", () => this.runCompanionBanter());

      // Voice buttons
      document.getElementById("btn-talk-mic").addEventListener("click", () => {
        global.KharbooshVoice.startSingleCommand();
      });
      document.getElementById("btn-wake-word").addEventListener("click", (e) => {
        const next = !global.KharbooshVoice.wakeMode;
        const ok = global.KharbooshVoice.setWakeWordMode(next);
        if (ok) {
          e.currentTarget.classList.toggle("active", next);
          if (next) {
            this.log("VOICE", "Wake-word active: say 'يا خربوش' or 'إيه يا خربش؟'", "log-accent");
          }
        }
      });

      global.addEventListener("resize", () => {
        this._clampPetPositions();
        if (global.KharbooshGame.running) {
          global.KharbooshGame.resize();
        }
      });
    }

    _setupVoiceCallbacks() {
      const voice = global.KharbooshVoice;
      const micBtn = document.getElementById("btn-talk-mic");
      const wakeBtn = document.getElementById("btn-wake-word");
      const chipText = document.getElementById("mic-chip-text");
      const transcriptBar = document.getElementById("voice-transcript-bar");
      const transcriptText = document.getElementById("voice-transcript-text");

      voice.onStatus = (status) => {
        micBtn.classList.toggle("listening", status === "listening");
        wakeBtn.classList.toggle("active", voice.wakeMode);
        if (status === "listening") {
          chipText.textContent = "بسمعك...";
          transcriptBar.classList.remove("hidden");
        } else if (status === "wake_waiting") {
          chipText.textContent = 'في انتظار "يا خربوش"';
          transcriptBar.classList.add("hidden");
        } else {
          chipText.textContent = "جاهز";
          transcriptBar.classList.add("hidden");
        }
      };

      voice.onInterim = (txt) => {
        if (txt) {
          transcriptBar.classList.remove("hidden");
          transcriptText.textContent = txt;
        }
      };

      voice.onWakeTriggered = () => {
        global.KharbooshAudio.playWakePing();
        this.log("WAKE", "Detected wake word: يا خربوش!", "log-accent");
        if (this.pet.state === "sleep") {
          this.wakeUp(true);
        }
        this.say("أيوة يا زوز! سامعك 👀", "talk");
      };

      voice.onCommand = (txt) => {
        this.log("STT", `User said: "${txt}"`, "log-accent");
        this.handleUserText(txt);
      };

      voice.onError = (msg) => {
        this.log("VOICE-ERR", msg, "log-warn");
        this.say(msg, "talk");
      };
    }

    _bindWindowDragging() {
      document.querySelectorAll("[data-drag-window]").forEach((bar) => {
        bar.addEventListener("pointerdown", (e) => {
          if (e.target.closest(".traffic-lights")) return;
          const win = document.getElementById(bar.dataset.dragWindow);
          this.zIndexCounter++;
          win.style.zIndex = String(this.zIndexCounter);
          win.style.transform = "none";

          const rect = win.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;

          const onMove = (ev) => {
            const x = Math.max(8, Math.min(global.innerWidth - 120, ev.clientX - offsetX));
            const y = Math.max(40, Math.min(global.innerHeight - 130, ev.clientY - offsetY));
            win.style.left = `${x}px`;
            win.style.top = `${y}px`;
          };

          const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
          };

          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
        });
      });
    }

    _bindPetDragging() {
      this.kharbooshWrap.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".speech-bubble")) return;
        this.pet.dragging = true;
        this.pet.dragMoved = false;
        this.pet.dragStartX = e.clientX;
        const startLeft = this.pet.x;
        const startYOffset = this.pet.yOffset;
        const downY = e.clientY;

        const onMove = (ev) => {
          const dx = ev.clientX - this.pet.dragStartX;
          const dy = ev.clientY - downY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            this.pet.dragMoved = true;
          }
          if (!this.pet.dragMoved) return;
          this.pet.x = Math.max(48, Math.min(global.innerWidth - 48, startLeft + dx));
          this.pet.yOffset = Math.max(0, Math.min(global.innerHeight - 240, startYOffset - dy));
          this._positionPets();
        };

        const onUp = () => {
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          this.pet.dragging = false;
          if (this.pet.dragMoved) {
            // Drop back smoothly onto the Dock
            global.KharbooshAudio.playJump();
            this._animateDropBack();
          } else {
            this._onPetClicked();
          }
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      });

      this.bedCanvas.addEventListener("click", () => this._onPetClicked());

      this.companionWrap.addEventListener("click", () => {
        global.KharbooshAudio.playClick();
        if (this.focus.running) {
          this.showCompanionBubble("اشش! خربوش بيقولنا نركز دلوقتي 🔒");
          return;
        }
        this.runCompanionBanter();
      });
    }

    _animateDropBack() {
      const step = () => {
        if (this.pet.yOffset <= 1) {
          this.pet.yOffset = 0;
          this._positionPets();
          return;
        }
        this.pet.yOffset *= 0.78;
        this._positionPets();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    _onPetClicked() {
      global.KharbooshAudio.playClick();
      if (this.focus.running) {
        this.say("اشش! إحنا مركزين دلوقتي — Shh. We're locked in 🔒", "focus");
        return;
      }
      if (this.pet.state === "sleep") {
        this.pet.sleepPokes++;
        if (this.pet.sleepPokes === 1) {
          this.say("هممم... سيبني أنام يا عم، انا في الحلم السابع 😴", "sleep");
        } else if (this.pet.sleepPokes === 2) {
          this.say("يا اسطى بقولك نايم! كمان لمسة وهصحى غصب عني... Zzz 🛏️", "sleep");
        } else {
          this.wakeUp();
        }
        return;
      }

      if (Math.random() < 0.55) {
        this.triggerCheckIn();
      } else {
        this.say("إيه يا زوز؟ قول أي حاجة أو اضغط ع المايك واتكلم بالمصري! 🎙️😎", "talk");
      }
    }

    openWindow(id) {
      const win = document.getElementById(id);
      if (!win) return;
      win.classList.remove("hidden");
      this.zIndexCounter++;
      win.style.zIndex = String(this.zIndexCounter);
    }

    log(tag, msg, cls) {
      const line = document.createElement("div");
      line.className = `log-line ${cls || ""}`;
      const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
      line.textContent = `[${ts}] [${tag}] ${msg}`;
      this.terminalLog.appendChild(line);
      this.terminalLog.scrollTop = this.terminalLog.scrollHeight;
    }

    setState(state) {
      this.pet.state = state;
      const meta = STATE_LABELS[state] || STATE_LABELS.idle;
      this.petStateBadge.querySelector(".status-emoji").textContent = meta.emoji;
      this.petStateLabel.textContent = meta.text;

      const isSleep = state === "sleep";
      this.kharbooshCanvas.classList.toggle("hidden", isSleep);
      this.bedCanvas.classList.toggle("hidden", !isSleep);
      this.zzzLayer.classList.toggle("hidden", !isSleep);
      document.getElementById("dot-sleep").classList.toggle("active", isSleep);

      if (isSleep) {
        this.pet.sleepPokes = 0;
        this.pet.targetX = null;
      }
      this._updateHeadTag();
      this._renderSpritesNow();
    }

    _updateHeadTag() {
      if (!this.petHeadTag) return;
      this.petHeadTag.classList.remove("focus-mode", "sleep-mode");
      if (this.focus.running) {
        this.petHeadTag.textContent = `FOCUS ${this.focusTimerText.textContent}`;
        this.petHeadTag.classList.add("focus-mode");
      } else if (this.pet.state === "sleep") {
        this.petHeadTag.textContent = "Zzz... 😴";
        this.petHeadTag.classList.add("sleep-mode");
      } else {
        this.petHeadTag.textContent = "KHARBOOSH 8-BIT";
      }
    }

    say(text, stateAfter, choices, durationMs) {
      clearTimeout(this.bubbleTimer);
      clearInterval(this.typeTimer);

      const targetState = stateAfter || (this.focus.running ? "focus" : "talk");
      if (this.pet.state !== "sleep" || targetState === "sleep") {
        this.setState(targetState);
      }

      this.speechBubble.classList.remove("hidden");
      this.bubbleText.textContent = "";
      this.bubbleChoices.innerHTML = "";
      this.bubbleChoices.classList.add("hidden");

      // Typewriter + 8-bit voice blips
      let idx = 0;
      const chars = Array.from(text);
      this.typeTimer = setInterval(() => {
        idx += 2;
        this.bubbleText.textContent = chars.slice(0, idx).join("");
        this._clampBubblePosition();
        if (idx % 6 === 0 && !global.KharbooshAudio.autoTTS) {
          global.KharbooshAudio.playBlip(idx);
        }
        if (idx >= chars.length) {
          clearInterval(this.typeTimer);
          if (choices && choices.length) {
            this._renderChoices(choices);
          }
          this._clampBubblePosition();
        }
      }, 24);

      this._clampBubblePosition();

      // Speak aloud with Egyptian TTS
      global.KharbooshAudio.speak(text, {
        onStart: () => {
          if (this.pet.state !== "sleep" && this.pet.state !== "focus" && targetState !== "laugh") {
            this.setState("talk");
          }
        },
        onEnd: () => {
          if (!this.focus.running && this.pet.state !== "sleep" && this.pet.state !== "game") {
            this.setState("idle");
          }
        }
      });

      const keepTime = choices && choices.length ? 18000 : durationMs || 7000;
      this.bubbleTimer = setTimeout(() => {
        this.hideBubble();
      }, keepTime);
    }

    _renderChoices(choices) {
      this.bubbleChoices.innerHTML = "";
      this.bubbleChoices.classList.remove("hidden");
      choices.forEach((ch) => {
        const btn = document.createElement("button");
        btn.className = `bubble-choice-btn ${ch.style || "yes"}`;
        btn.textContent = ch.label;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          global.KharbooshAudio.playClick();
          if (ch.action === "game_start") {
            this.hideBubble();
            this.startCoffeeGame();
            return;
          }
          if (ch.action === "focus_start") {
            this.startFocus();
            return;
          }
          if (ch.action === "offer_game") {
            this.say(ch.reply, "talk", [
              { label: "يلا نلعب!", style: "yes", action: "game_start" },
              { label: "بعدين", style: "no", reply: "تمام، أنا قاعد فوق الـ Dock لو غيرت رأيك ☕" }
            ]);
            return;
          }
          if (ch.action === "offer_focus") {
            this.say(ch.reply, "talk", [
              { label: "ابدأ التركيز 🔒", style: "yes", action: "focus_start" },
              { label: "خلينا نهزر", style: "no", reply: "أشطا يا ريس! تحت أمرك 😎" }
            ]);
            return;
          }
          if (ch.state === "laugh") {
            global.KharbooshAudio.playLaugh();
          }
          this.say(ch.reply, ch.state || "talk");
        });
        this.bubbleChoices.appendChild(btn);
      });
      this._clampBubblePosition();
    }

    hideBubble() {
      clearTimeout(this.bubbleTimer);
      this.speechBubble.classList.add("hidden");
    }

    _clampBubblePosition() {
      if (this.speechBubble.classList.contains("hidden")) return;
      const bubbleWidth = this.speechBubble.offsetWidth || 240;
      const baseLeft = this.pet.x - bubbleWidth / 2;
      const baseRight = this.pet.x + bubbleWidth / 2;
      const pad = 12;
      let shift = 0;
      if (baseLeft < pad) {
        shift = pad - baseLeft;
      } else if (baseRight > global.innerWidth - pad) {
        shift = global.innerWidth - pad - baseRight;
      }
      this.speechBubble.style.setProperty("--bubble-shift", `${Math.round(shift)}px`);
    }

    triggerCheckIn() {
      if (this.focus.running) {
        this.say("اشش! إحنا مركزين دلوقتي — Shh. We're locked in 🔒", "focus");
        return;
      }
      if (this.pet.state === "sleep") this.wakeUp(true);
      const card = global.KharbooshBrain.getCheckInCard();
      this.say(card.text, "talk", card.choices);
    }

    handleUserText(rawText) {
      this.idleSeconds = 0;
      this.log("USER", rawText);

      const ctxState = {
        focusRunning: this.focus.running,
        sleeping: this.pet.state === "sleep"
      };
      const llmConfig = {
        provider: this.prefs.llmProvider || "local",
        apiKey: this.prefs.llmKey || ""
      };

      const localRes = global.KharbooshBrain.processInputSync(rawText, ctxState);
      if (
        global.KharbooshBrain.isSyncCommand(localRes.action) ||
        llmConfig.provider === "local" ||
        !llmConfig.apiKey
      ) {
        // Synchronous execution preserves iOS Safari user-gesture token so voice speaks immediately!
        this._applyBrainResult(localRes);
        return;
      }

      global.KharbooshBrain.processInput(rawText, ctxState, llmConfig).then((res) => {
        this._applyBrainResult(res);
      });
    }

    _applyBrainResult(res) {
      this.log("KHARBOOSH", `[${res.action}] ${res.reply || "(check-in)"}`, "log-accent");

      switch (res.action) {
        case "focus_start":
          this.startFocus(res.reply);
          break;
        case "focus_stop":
          this.pauseFocus();
          this.say(res.reply, "talk");
          break;
        case "game_start":
          this.say(res.reply, "game", null, 2500);
          setTimeout(() => this.startCoffeeGame(), 450);
          break;
        case "sleep":
          this.enterSleepMode(res.reply);
          break;
        case "wake":
          this.wakeUp(false, res.reply);
          break;
        case "companion_on":
          this.setCompanionVisible(true);
          this.say(res.reply, "talk");
          break;
        case "companion_off":
          this.setCompanionVisible(false);
          this.say(res.reply, "talk");
          break;
        case "open_terminal":
          this.openWindow("win-terminal");
          this.say(res.reply, "talk");
          break;
        case "open_notes":
          this.openWindow("win-notes");
          this.say(res.reply, "talk");
          break;
        case "open_settings":
          this.openWindow("win-settings");
          this.say(res.reply, "talk");
          break;
        case "open_wardrobe":
          this.openWindow("win-wardrobe");
          this.say(res.reply, "talk");
          break;
        case "checkin":
          this.triggerCheckIn();
          break;
        case "laugh":
          global.KharbooshAudio.playLaugh();
          this.say(res.reply, "laugh");
          break;
        case "sip_coffee":
          global.KharbooshAudio.playCatch(2);
          this.say(res.reply, "sip");
          break;
        default:
          this.say(res.reply, res.state || "talk");
      }
    }

    startFocus(customMsg) {
      if (this.pet.state === "sleep") this.wakeUp(true);
      if (global.KharbooshGame.running) global.KharbooshGame.stop(true);
      if (this.focus.remainingSec <= 0) {
        this.focus.remainingSec = this.focus.durationSec;
      }

      this.focus.running = true;
      this.focusPill.classList.add("running");
      this.focusDimOverlay.classList.remove("hidden");
      document.getElementById("dot-focus").classList.add("active");
      this.setState("focus");

      const ambientOn = document.getElementById("chk-focus-ambient").checked;
      global.KharbooshAudio.toggleAmbientFocus(ambientOn);

      clearInterval(this.focus.intervalId);
      this.focus.intervalId = setInterval(() => {
        if (!this.focus.running) return;
        this.focus.remainingSec--;
        this._renderFocusClock();
        if (this.focus.remainingSec <= 0) {
          this._completeFocus();
        }
      }, 1000);

      this._renderFocusClock();
      this.say(
        customMsg || "قفلنا كل حاجة! وضع التركيز شغال — Shh. We're locked in 🔒",
        "focus"
      );
      this.log("FOCUS", "Started Pomodoro timer", "log-accent");
    }

    pauseFocus() {
      this.focus.running = false;
      clearInterval(this.focus.intervalId);
      this.focusPill.classList.remove("running");
      this.focusDimOverlay.classList.add("hidden");
      document.getElementById("dot-focus").classList.remove("active");
      global.KharbooshAudio.toggleAmbientFocus(false);
      if (this.pet.state === "focus") this.setState("idle");
    }

    resetFocus() {
      this.pauseFocus();
      this.focus.remainingSec = this.focus.durationSec;
      this._renderFocusClock();
    }

    _completeFocus() {
      this.pauseFocus();
      this.focus.remainingSec = this.focus.durationSec;
      this._renderFocusClock();
      global.KharbooshAudio.playAlarm();
      this.say("عاش يا بطل! خلصنا جلسة التركيز! خد بريك واشربلك كوباية قهوة 🎉☕", "laugh");
      this.log("FOCUS", "Completed focus session!", "log-accent");
    }

    _renderFocusClock() {
      const m = Math.floor(this.focus.remainingSec / 60);
      const s = this.focus.remainingSec % 60;
      const str = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      this.focusTimerText.textContent = str;
      this.focusModalClock.textContent = str;
      this._updateHeadTag();
    }

    enterSleepMode(customMsg) {
      if (this.focus.running) {
        this.say("اشش! إحنا مركزين دلوقتي، مفيش نوم قبل التايمر 🔒", "focus");
        return;
      }
      this.setState("sleep");
      global.KharbooshAudio.playSnore();
      this.say(
        customMsg || "تصبح على خير يا زوز... رايح سريري الأزرق أنام شوية 🛏️💙 Zzz",
        "sleep",
        null,
        4200
      );
      this.log("SLEEP", "Kharboosh entered blue bed sleep mode", "log-warn");
    }

    wakeUp(silent, customMsg) {
      this.setState("idle");
      this.pet.sleepPokes = 0;
      if (!silent) {
        global.KharbooshAudio.playJump();
        this.say(customMsg || "صحيت خلاص! عايز إيه يا زوز؟ ☕👀", "talk");
      }
      this.log("WAKE", "Kharboosh woke up");
    }

    startCoffeeGame() {
      if (this.focus.running) {
        this.say("اشش! إحنا مركزين دلوقتي — مفيش ألعاب وقت التركيز! 🔒", "focus");
        return;
      }
      if (this.pet.state === "sleep") this.wakeUp(true);
      this.hideBubble();
      this.setState("game");
      this.kharbooshWrap.classList.add("hidden");
      this.log("GAME", "Started Catch the Coffee mini-game", "log-accent");

      global.KharbooshGame.start(
        this.prefs.gameSkin || "coffee",
        this.prefs.accessory || "shades",
        (score, msg, cancelled) => {
          this.kharbooshWrap.classList.remove("hidden");
          this.setState("idle");
          if (!cancelled && msg) {
            this.log("GAME", `Finished with score: ${score}`, "log-accent");
            this.say(msg, score >= 9 ? "laugh" : "talk");
          }
        }
      );
    }

    setCompanionVisible(visible, skipLog) {
      this.companion.visible = Boolean(visible);
      this.prefs.companionVisible = this.companion.visible;
      this._savePrefs();

      this.companionWrap.classList.toggle("hidden", !this.companion.visible);
      document.getElementById("dot-companion").classList.toggle("active", this.companion.visible);
      document.getElementById("btn-menu-companion").classList.toggle("active", this.companion.visible);

      if (this.companion.visible && !skipLog) {
        this.companion.x = Math.min(global.innerWidth - 70, this.pet.x + 95);
        this._positionPets();
        this.showCompanionBubble("أهلاً يا زوز! أنا فلفلة صاحبة خربوش 🩷✨");
        this.log("COMPANION", "Pink Hoodie companion joined the Dock!", "log-pink");
      }
    }

    showCompanionBubble(text, ms) {
      clearTimeout(this.companion.bubbleTimer);
      this.companion.state = "talk";
      this.companionBubbleText.textContent = text;
      this.companionBubble.classList.remove("hidden");
      this.companion.bubbleTimer = setTimeout(() => {
        this.companionBubble.classList.add("hidden");
        this.companion.state = "idle";
      }, ms || 4800);
    }

    runCompanionBanter() {
      if (!this.companion.visible) {
        this.setCompanionVisible(true);
      }
      const pair = global.KharbooshBrain.getBanterPair();
      const first = pair[0];
      const second = pair[1];

      if (first.who === "companion") {
        this.showCompanionBubble(first.text, 4000);
        setTimeout(() => this.say(second.text, "laugh"), 2100);
      } else {
        this.say(first.text, "talk", null, 3800);
        setTimeout(() => this.showCompanionBubble(second.text, 4200), 2100);
      }
    }

    _clampPetPositions() {
      const max = Math.max(120, global.innerWidth - 64);
      this.pet.x = Math.max(54, Math.min(max, this.pet.x));
      this.companion.x = Math.max(54, Math.min(max, this.companion.x));
      this._positionPets();
    }

    _positionPets() {
      this.kharbooshWrap.style.left = `${Math.round(this.pet.x - 48)}px`;
      this.kharbooshWrap.style.bottom = `${Math.round(this.pet.yOffset)}px`;

      this.bedCanvas.style.left = `${Math.round(this.pet.x - 64)}px`;
      this.zzzLayer.style.left = `${Math.round(this.pet.x + 12)}px`;

      this.companionWrap.style.left = `${Math.round(this.companion.x - 48)}px`;
      this._clampBubblePosition();
    }

    _startClockAndTimers() {
      const updateClock = () => {
        const now = new Date();
        document.getElementById("menubar-clock").textContent = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit"
        });
      };
      updateClock();
      setInterval(updateClock, 10000);

      // Autonomous patrol + idle sleep check every 1 second
      setInterval(() => {
        // Idle sleep trigger after 75s inactivity
        if (
          this.prefs.autoSleep !== false &&
          !this.focus.running &&
          this.pet.state !== "sleep" &&
          this.pet.state !== "game"
        ) {
          this.idleSeconds++;
          if (this.idleSeconds >= 75) {
            this.idleSeconds = 0;
            this.enterSleepMode("زهقت من القعدة... هنام شوية على السرير الأزرق 😴💙");
            return;
          }
        }

        // Autonomous walk along Dock when idle and no speech bubble is open
        if (
          this.pet.state === "idle" &&
          !this.pet.dragging &&
          this.speechBubble.classList.contains("hidden") &&
          Math.random() < 0.25
        ) {
          const minX = 80;
          const maxX = Math.max(180, global.innerWidth - 90);
          this.pet.targetX = minX + Math.random() * (maxX - minX);
          this.setState("walk");
        }

        // Occasional proactive check-in (rare so not annoying)
        if (
          this.pet.state === "idle" &&
          this.speechBubble.classList.contains("hidden") &&
          Math.random() < 0.03
        ) {
          this.triggerCheckIn();
        }
      }, 1500);
    }

    _renderSpritesNow() {
      const even = this.pet.frameTick % 2 === 0;
      const acc = this.prefs.accessory || "shades";

      let kFrame = even ? "idle1" : "idle2";
      if (this.pet.state === "walk") kFrame = even ? "walk1" : "walk2";
      else if (this.pet.state === "talk") kFrame = even ? "talk1" : "talk2";
      else if (this.pet.state === "laugh") kFrame = even ? "laugh1" : "laugh2";
      else if (this.pet.state === "focus") kFrame = even ? "focus1" : "focus2";
      else if (this.pet.state === "sip") kFrame = "sip1";
      else if (this.pet.state === "game") kFrame = "game1";

      global.KharbooshSprites.drawKharboosh(this.kCtx, kFrame, acc, this.pet.flipX);

      if (this.pet.state === "sleep") {
        global.KharbooshSprites.drawBed(this.bCtx, this.pet.frameTick);
      }

      if (this.companion.visible) {
        let cFrame = even ? "idle1" : "idle2";
        if (this.companion.state === "walk") cFrame = even ? "walk1" : "idle2";
        else if (this.companion.state === "talk") cFrame = even ? "talk1" : "idle1";
        global.KharbooshSprites.drawCompanion(this.cCtx, cFrame, this.companion.flipX);
      }
    }

    _startAnimationLoop() {
      let lastTs = performance.now();
      let animAccum = 0;
      this._renderSpritesNow();

      const tick = (ts) => {
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        animAccum += dt;

        // Smooth walking along Dock
        if (this.pet.state === "walk" && this.pet.targetX !== null && !this.pet.dragging) {
          const dx = this.pet.targetX - this.pet.x;
          if (Math.abs(dx) < 4) {
            this.pet.targetX = null;
            this.setState("idle");
          } else {
            this.pet.flipX = dx < 0;
            this.pet.x += Math.sign(dx) * 72 * dt;
          }
        }

        // Companion gently follows Kharboosh
        if (this.companion.visible) {
          const desiredX =
            this.pet.x > global.innerWidth * 0.55 ? this.pet.x - 95 : this.pet.x + 95;
          const cdx = desiredX - this.companion.x;
          if (Math.abs(cdx) > 8) {
            this.companion.flipX = cdx < 0;
            this.companion.x += Math.sign(cdx) * 58 * dt;
            if (this.companion.state !== "talk") this.companion.state = "walk";
          } else {
            this.companion.flipX = this.pet.x < this.companion.x;
            if (this.companion.state === "walk") this.companion.state = "idle";
          }
        }

        this._positionPets();

        // Pixel animation frames (~4.5 fps for authentic 8-bit feel)
        if (animAccum >= 0.22) {
          animAccum = 0;
          this.pet.frameTick++;
          this._renderSpritesNow();
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }

    _bootGreeting() {
      this._positionPets();
      this.log("SYSTEM", "Kharboosh 8-Bit Egyptian Pet initialized.", "log-accent");
      this.log("VOICE", 'Say "يا خربوش" (Wake Word) or click Mic / Quick Chips.', "");

      setTimeout(() => {
        const greeting = global.KharbooshBrain.getTimeGreeting();
        this.say(greeting, "talk", [
          { label: "☕ العب قهوة", style: "yes", action: "game_start" },
          { label: "🔒 ابدأ تركيز", style: "no", action: "focus_start" }
        ]);
      }, 650);
    }
  }

  global.addEventListener("DOMContentLoaded", () => {
    global.KharbooshAppInstance = new KharbooshApp();
  });
})(window);
