(function (global) {
  "use strict";

  class KharbooshAudioEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.autoTTS = true;
      this.rate = 1.05;
      this.pitch = 1.0;
      this.voiceURI = "";
      this.ttsEngine = "browser"; // browser | elevenlabs | openai
      this.ttsApiKey = "";
      this.ambientNodes = null;
      this.voices = [];
      this._voiceCallbacks = [];
      this._iosSpeechUnlocked = false;
      this._activeAudioEl = null;

      if ("speechSynthesis" in global) {
        this._refreshVoices();
        global.speechSynthesis.addEventListener("voiceschanged", () => {
          this._refreshVoices();
        });
        // Safari/iOS sometimes populates voices asynchronously without firing voiceschanged right away
        setTimeout(() => this._refreshVoices(), 400);
        setTimeout(() => this._refreshVoices(), 1200);
      }
    }

    _ensureCtx() {
      if (!this.ctx) {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    unlockForMobile() {
      this._ensureCtx();
      if (!this._iosSpeechUnlocked && "speechSynthesis" in global) {
        this._iosSpeechUnlocked = true;
        try {
          const silent = new SpeechSynthesisUtterance(" ");
          silent.volume = 0;
          silent.lang = "ar-EG";
          global.speechSynthesis.speak(silent);
        } catch (_) {}
      }
    }

    _refreshVoices() {
      if (!("speechSynthesis" in global)) return;
      const list = global.speechSynthesis.getVoices() || [];
      if (list.length) {
        this.voices = list;
      }
      this._voiceCallbacks.forEach((cb) => cb(this.voices));
    }

    onVoicesChanged(cb) {
      this._voiceCallbacks.push(cb);
      cb(this.voices);
    }

    getArabicVoices() {
      return this.voices.filter((v) => /^ar\b/i.test(v.lang));
    }

    getPreferredVoice() {
      if (!this.voices.length) return null;
      if (this.voiceURI) {
        const exact = this.voices.find((v) => v.voiceURI === this.voiceURI);
        if (exact) return exact;
      }
      const arabic = this.getArabicVoices();
      if (!arabic.length) return null; // Never fall back to English voice for Arabic speech!

      // Priority: Egyptian Arabic (Shakir, Salma, Hoda, ar-EG) -> Saudi/Gulf/Levant -> any Arabic
      const eg =
        arabic.find((v) => /^ar-EG/i.test(v.lang) && /shakir|salma|natural/i.test(v.name)) ||
        arabic.find((v) => /^ar-EG/i.test(v.lang)) ||
        arabic.find((v) => /egypt|مصر|hoda|shakir|salma/i.test(v.name));
      if (eg) return eg;

      const preferredAr =
        arabic.find((v) => /tarik|maged|laila|hamed|zariyah/i.test(v.name)) ||
        arabic.find((v) => /^ar-SA/i.test(v.lang)) ||
        arabic[0];
      return preferredAr;
    }

    _tone(freq, duration, type, gainVal, delay) {
      if (this.muted) return;
      const ctx = this._ensureCtx();
      if (!ctx) return;

      const t = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(gainVal || 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + duration + 0.01);
    }

    playClick() {
      this._tone(520, 0.04, "square", 0.04, 0);
    }

    playBlip(index) {
      const notes = [330, 380, 420, 360, 460];
      const f = notes[(index || 0) % notes.length];
      this._tone(f, 0.038, "triangle", 0.035, 0);
    }

    playTalkBurst(charLen) {
      if (this.muted) return;
      const count = Math.min(8, Math.max(3, Math.floor((charLen || 12) / 7)));
      for (let i = 0; i < count; i++) {
        const pitch = 300 + ((i * 73) % 170);
        this._tone(pitch, 0.045, "triangle", 0.038, i * 0.075);
      }
    }

    playWakePing() {
      this._tone(587.33, 0.09, "triangle", 0.08, 0);
      this._tone(880, 0.14, "triangle", 0.09, 0.08);
    }

    playJump() {
      if (this.muted) return;
      const ctx = this._ensureCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(580, t + 0.12);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }

    playLaugh() {
      [420, 520, 460, 580, 500].forEach((freq, i) => {
        this._tone(freq, 0.075, "square", 0.055, i * 0.085);
      });
    }

    playCatch(combo) {
      const base = 520 + Math.min(combo || 1, 10) * 45;
      this._tone(base, 0.07, "square", 0.05, 0);
      this._tone(base * 1.35, 0.1, "square", 0.055, 0.055);
    }

    playBadCatch() {
      this._tone(180, 0.12, "sawtooth", 0.06, 0);
      this._tone(130, 0.16, "sawtooth", 0.06, 0.1);
    }

    playSnore() {
      this._tone(130, 0.22, "sine", 0.035, 0);
      this._tone(110, 0.26, "sine", 0.025, 0.24);
    }

    playAlarm() {
      const melody = [523.25, 659.25, 783.99, 1046.5];
      melody.forEach((f, idx) => {
        this._tone(f, 0.15, "triangle", 0.09, idx * 0.14);
      });
    }

    toggleAmbientFocus(enable) {
      if (!enable) {
        if (this.ambientNodes) {
          try {
            this.ambientNodes.source.stop();
            this.ambientNodes.gain.disconnect();
          } catch (_) {}
          this.ambientNodes = null;
        }
        return;
      }
      if (this.ambientNodes || this.muted) return;
      const ctx = this._ensureCtx();
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 620;

      const gain = ctx.createGain();
      gain.gain.value = 0.055;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      this.ambientNodes = { source, gain };
    }

    egyptianizeForTTS(str) {
      return String(str || "")
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
        .replace(/Catch the Coffee/gi, "التقاط القهوة")
        .replace(/Claude Code/gi, "كلود كود")
        .replace(/Kharboosh OS/gi, "نظام خربوش")
        .replace(/Locked In/gi, "التركيز الكامل")
        .replace(/Pomodoro/gi, "بومودورو")
        .replace(/8-Bit/gi, "إيت بيت")
        .replace(/FOCUS/gi, "تركيز")
        .replace(/Zzz+/gi, " ")
        .replace(/[—•|]/g, "، ")
        .replace(/\s+/g, " ")
        .trim();
    }

    async _speakViaNeuralAPI(clean, onStart, onEnd) {
      try {
        if (this._activeAudioEl) {
          this._activeAudioEl.pause();
          this._activeAudioEl = null;
        }
        let audioBlob = null;

        if (this.ttsEngine === "elevenlabs" && this.ttsApiKey) {
          // Multilingual v2 / Flash v2.5 handles Egyptian Arabic naturally
          const voiceId = "pNInz6obpgDQGcFmaJgB";
          const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "xi-api-key": this.ttsApiKey
              },
              body: JSON.stringify({
                text: clean,
                model_id: "eleven_flash_v2_5",
                language_code: "ar"
              })
            }
          );
          if (res.ok) audioBlob = await res.blob();
        } else if (this.ttsEngine === "openai" && this.ttsApiKey) {
          const res = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.ttsApiKey}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini-tts",
              voice: "ash",
              input: clean,
              instructions: "Speak in natural friendly Egyptian Arabic (العامية المصرية)."
            })
          });
          if (res.ok) audioBlob = await res.blob();
        }

        if (!audioBlob) return false;
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        this._activeAudioEl = audio;
        audio.onplay = () => {
          if (onStart) onStart();
        };
        const finish = () => {
          URL.revokeObjectURL(url);
          if (onEnd) onEnd();
        };
        audio.onended = finish;
        audio.onerror = finish;
        await audio.play();
        return true;
      } catch (_) {
        return false;
      }
    }

    speak(text, callbacks) {
      const onStart = callbacks && callbacks.onStart;
      const onEnd = callbacks && callbacks.onEnd;
      const clean = this.egyptianizeForTTS(text);

      if (!clean || this.muted || !this.autoTTS) {
        if (onStart) onStart();
        setTimeout(() => {
          if (onEnd) onEnd();
        }, Math.min(1800, Math.max(600, clean.length * 38)));
        return;
      }

      if (this.ttsEngine !== "browser" && this.ttsApiKey) {
        this._speakViaNeuralAPI(clean, onStart, onEnd).then((ok) => {
          if (!ok) this._speakBrowserTTS(clean, onStart, onEnd);
        });
        return;
      }

      this._speakBrowserTTS(clean, onStart, onEnd);
    }

    _speakBrowserTTS(clean, onStart, onEnd) {
      if (!("speechSynthesis" in global)) {
        this.playTalkBurst(clean.length);
        if (onStart) onStart();
        setTimeout(() => {
          if (onEnd) onEnd();
        }, Math.min(1800, Math.max(600, clean.length * 38)));
        return;
      }

      try {
        global.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        const voice = this.getPreferredVoice();

        if (voice) {
          utter.voice = voice;
          utter.lang = voice.lang;
        } else {
          // Request Egyptian Arabic from OS/Browser without binding an English voice
          utter.lang = "ar-EG";
        }
        utter.rate = this.rate;
        utter.pitch = this.pitch;

        let started = false;
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          if (onEnd) onEnd();
        };

        utter.onstart = () => {
          started = true;
          if (onStart) onStart();
        };
        utter.onend = done;
        utter.onerror = () => {
          if (!started) this.playTalkBurst(clean.length);
          done();
        };

        global.speechSynthesis.speak(utter);

        // If browser has no Arabic voice and ignores speak silently, play subtle 8-bit voice blips
        setTimeout(() => {
          if (!started && !finished && !this.getArabicVoices().length) {
            this.playTalkBurst(clean.length);
          }
        }, 250);

        setTimeout(done, Math.max(3500, clean.length * 125));
      } catch (_) {
        this.playTalkBurst(clean.length);
        if (onStart) onStart();
        setTimeout(() => {
          if (onEnd) onEnd();
        }, 900);
      }
    }
  }

  global.KharbooshAudio = new KharbooshAudioEngine();
})(window);
