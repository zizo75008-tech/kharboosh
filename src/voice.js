(function (global) {
  "use strict";

  class KharbooshVoiceController {
    constructor() {
      this.SpeechRecognition =
        global.SpeechRecognition || global.webkitSpeechRecognition || null;
      this.supported = Boolean(this.SpeechRecognition);
      this.recognition = null;
      this.lang = "ar-EG";
      this.wakeMode = false;
      this.singleListening = false;
      this.awaitingCommandAfterWake = false;
      this._restartTimer = null;

      this.onStatus = () => {};
      this.onInterim = () => {};
      this.onWakeTriggered = () => {};
      this.onCommand = () => {};
      this.onError = () => {};
    }

    setLang(lang) {
      this.lang = lang || "ar-EG";
      if (this.recognition) {
        this.recognition.lang = this.lang;
      }
    }

    _stopCurrent() {
      clearTimeout(this._restartTimer);
      if (this.recognition) {
        try {
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.stop();
        } catch (_) {}
        this.recognition = null;
      }
    }

    startSingleCommand() {
      if (!this.supported) {
        this.onError("المتصفح الحالي مش بيدعم التعرف على الصوت (جرّب Chrome أو Edge، أو اكتب لخربوش هنا).");
        return false;
      }
      this.wakeMode = false;
      this.singleListening = true;
      this.onStatus("listening");
      this._launchRecognition(false);
      return true;
    }

    setWakeWordMode(enabled) {
      if (!this.supported) {
        this.onError("المتصفح الحالي مش بيدعم المايك التلقائي (جرّب Chrome أو Edge).");
        return false;
      }
      this.wakeMode = Boolean(enabled);
      this.singleListening = false;
      this.awaitingCommandAfterWake = false;
      if (this.wakeMode) {
        this.onStatus("wake_waiting");
        this._launchRecognition(true);
      } else {
        this._stopCurrent();
        this.onStatus("idle");
      }
      return true;
    }

    _launchRecognition(continuousWake) {
      this._stopCurrent();
      const rec = new this.SpeechRecognition();
      rec.lang = this.lang;
      rec.interimResults = true;
      rec.continuous = Boolean(continuousWake);
      rec.maxAlternatives = 1;
      this.recognition = rec;

      rec.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += " " + transcript;
          } else {
            interim += " " + transcript;
          }
        }

        if (interim.trim()) {
          this.onInterim(interim.trim());
        }

        const cleanFinal = finalText.trim();
        if (!cleanFinal) return;
        this.onInterim("");

        if (!this.wakeMode) {
          this.singleListening = false;
          this.onStatus("idle");
          this.onCommand(cleanFinal);
          return;
        }

        // Wake-word mode processing
        if (this.awaitingCommandAfterWake) {
          this.awaitingCommandAfterWake = false;
          this.onStatus("wake_waiting");
          this.onCommand(cleanFinal);
          return;
        }

        const wake = global.KharbooshBrain.detectWakeWord(cleanFinal);
        if (wake.matched) {
          this.onWakeTriggered();
          if (wake.commandText) {
            this.onCommand(wake.commandText);
          } else {
            this.awaitingCommandAfterWake = true;
            this.onStatus("listening");
          }
        }
      };

      rec.onerror = (ev) => {
        const err = ev && ev.error ? ev.error : "unknown";
        if (err === "not-allowed" || err === "service-not-allowed") {
          this.wakeMode = false;
          this.singleListening = false;
          this.onStatus("idle");
          this.onError("تم رفض إذن المايكروفون. اسمح بالمايك من المتصفح أو اكتب في خانة الشات.");
          return;
        }
        if (err === "no-speech" || err === "aborted") return;
        if (!this.wakeMode) {
          this.singleListening = false;
          this.onStatus("idle");
        }
      };

      rec.onend = () => {
        if (this.wakeMode) {
          clearTimeout(this._restartTimer);
          this._restartTimer = setTimeout(() => {
            if (this.wakeMode) this._launchRecognition(true);
          }, 350);
        } else if (this.singleListening) {
          this.singleListening = false;
          this.onStatus("idle");
        }
      };

      try {
        rec.start();
      } catch (_) {
        this.onStatus("idle");
      }
    }
  }

  global.KharbooshVoice = new KharbooshVoiceController();
})(window);
