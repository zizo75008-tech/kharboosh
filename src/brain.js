(function (global) {
  "use strict";

  function normalizeArabic(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectWakeWord(rawText) {
    const norm = normalizeArabic(rawText);
    const patterns = [
      /^(?:ايه )?يا خربوش\b\s*(.*)$/,
      /^(?:ايه )?يا خربش\b\s*(.*)$/,
      /^خربوش\b\s*(.*)$/,
      /^خربش\b\s*(.*)$/,
      /^(?:hey |hi |yo )?kharb(?:oo|ou|u)sh\b\s*(.*)$/
    ];
    for (const rx of patterns) {
      const m = norm.match(rx);
      if (m) {
        return { matched: true, commandText: (m[1] || "").trim() };
      }
    }
    if (
      norm.includes("يا خربوش") ||
      norm.includes("يا خربش") ||
      norm.includes("kharboosh") ||
      norm.includes("kharboush")
    ) {
      const stripped = norm
        .replace(/ايه يا خربوش|يا خربوش|ايه يا خربش|يا خربش|خربوش|خربش|kharboosh|kharboush/g, "")
        .trim();
      return { matched: true, commandText: stripped };
    }
    return { matched: false, commandText: norm };
  }

  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "صباح الفل والقهوة السادة يا زوز! ناوي تنجز إيه النهاردة؟ ☀️☕";
    }
    if (hour >= 12 && hour < 17) {
      return "أحلى مسا عليك في عز الضهر! شربت مية ولا لسه عايش على القهوة؟ 😎";
    }
    if (hour >= 17 && hour < 23) {
      return "مساؤه يا زوز! الدنيا رايقة ولا الشغل مطلع عينك؟ 🌆";
    }
    return "مساؤه يا زوز! لسه صاحي بعد نص الليل ليه يا وحش؟ قهوة ولا نوم؟ 🌙☕";
  }

  const CHECK_IN_CARDS = [
    {
      text: "قولي بصراحة، أكلت حاجة النهاردة غير القهوة؟ ☕",
      choices: [
        {
          label: "لأ، قهوة بس",
          style: "no",
          reply: "القهوة معمولة من حبوب، والحبوب أكل برضه! بس بالله عليك روح كل سندوتش فول يا عم 😂",
          state: "laugh"
        },
        {
          label: "أيوة أكلت",
          style: "yes",
          reply: "عاش يا بطل! طب قولي، فول وطعمية ولا كشري؟ أنا نفسي في كشري الصراحة 😋",
          state: "talk"
        }
      ]
    },
    {
      text: "إيه الأخبار يا زميلي؟ الدنيا ماشية تمام ولا فيه مشاكل بتجري وراك؟ 👾",
      choices: [
        {
          label: "تمام وزي الفل",
          style: "yes",
          reply: "يا سلام على الروقان! طب ما تيجي نلعب جولة التقاط القهوة؟ ☕",
          action: "offer_game"
        },
        {
          label: "مضغوط شوية",
          style: "no",
          reply: "ولا يهمك يا زميلي! شغّل تايمر التركيز خمسة وعشرين دقيقة وهنخلص الشغل سوا 💪🔒",
          action: "offer_focus"
        }
      ]
    },
    {
      text: "تحب تفصل دقيقتين وتلعب التقاط القهوة؟ ☕🎮",
      choices: [
        {
          label: "يلا بينا!",
          style: "yes",
          reply: "أيوة كده! حرّك إيدك وامسك الكوبايات ووريني الشطارة! 🔥",
          action: "game_start"
        },
        {
          label: "خليني مركز",
          style: "no",
          reply: "يا جامد! تحب أشغلك وضع التركيز الكامل دلوقتي؟",
          action: "focus_start"
        }
      ]
    },
    {
      text: "بقالك كتير قدام الشاشة، قومت شربت مية يا زوز؟ 💧",
      choices: [
        {
          label: "شربت حالاً",
          style: "yes",
          reply: "برنس! صحتك بالدنيا يا عم، عاش عليك 💙",
          state: "laugh"
        },
        {
          label: "نسيت خالص",
          style: "no",
          reply: "قوم اشرب كوباية مية دلوقتي يا عم، الشغل مش هيطير!",
          state: "talk"
        }
      ]
    }
  ];

  const JOKES = [
    "مرة مبرمج اتجوز، جاب توأم، سمّى الأولاني كود والتاني ديباج 😂",
    "واحد بيقول لصاحبه: البرنامج شغال ومش عارف ليه! قاله: إوعى تلمسه، سيبه زي ما هو 🤣",
    "شربت أربع كوبايات قهوة النهاردة، دلوقتي بسمع الألوان وبشوف الواي فاي ⚡☕",
    "أنا مش كسلان يا زوز، أنا بس مشغّل وضع توفير الطاقة 🔋😴",
    "اللي يقولك الذكاء الاصطناعي هياخد مكانك، قوله طب خليه يشرب شاي بالنعناع مكاننا الأول 😎"
  ];

  const BANTER_SCRIPTS = [
    [
      { who: "companion", text: "إيه يا خربوش، هو إنت بتعمل إيه غير إنك تشرب قهوة؟ 🩷" },
      { who: "kharboosh", text: "أنا بشرف على الإنتاجية يا بنتي! وبعدين القهوة فاكهة طبيعية ☕😎" }
    ],
    [
      { who: "companion", text: "زوز شكله مركز أوي في الشاشة النهاردة 👀" },
      { who: "kharboosh", text: "اسكتي خالص لحسن يشغل وضع التركيز ويمنعنا نتكلم 🔒🤫" }
    ],
    [
      { who: "kharboosh", text: "الهودي الوردي جامد عليكي يا فلفلة، بس الأسود بتاعي يكسب 🔥" },
      { who: "companion", text: "طبعاً طبعاً، قول لنفسك يا أبو نضارة! 😂🩷" }
    ]
  ];

  let checkInIndex = 0;
  let jokeIndex = 0;
  let banterIndex = 0;

  function getCheckInCard() {
    const card = CHECK_IN_CARDS[checkInIndex % CHECK_IN_CARDS.length];
    checkInIndex++;
    return card;
  }

  function getBanterPair() {
    const pair = BANTER_SCRIPTS[banterIndex % BANTER_SCRIPTS.length];
    banterIndex++;
    return pair;
  }

  function hasAny(norm, words) {
    return words.some((w) => norm.includes(w));
  }

  function processLocalIntent(rawText, ctx) {
    const norm = normalizeArabic(rawText);

    const isStopFocus = hasAny(norm, ["وقف التركيز", "الغ التركيز", "الغي التركيز", "stop focus", "pause focus", "خلصنا", "كفايه تركيز"]);
    if (ctx.focusRunning && !isStopFocus) {
      const lockedLines = [
        "اشش! إحنا مركزين دلوقتي، مفيش هزار 🔒",
        "مش وقت كلام يا ريس، خلينا نخلّص التايمر الأول 🤫",
        "إحنا في وضع التركيز يا زوز! كمل شغلك وهنلعب بعدين 💪"
      ];
      const text = lockedLines[Math.floor(Math.random() * lockedLines.length)];
      return { reply: text, action: "locked_in_warn", state: "focus" };
    }

    const isWakeCmd = hasAny(norm, ["اصحي", "اصحى", "فوق", "قوم", "wake", "صباح الخير"]);
    if (ctx.sleeping && !isWakeCmd) {
      return {
        reply: "هممم، سيبني أنام يا عم، أنا في الحلم السابع 😴",
        action: "sleep_murmur",
        state: "sleep"
      };
    }

    if (isWakeCmd && ctx.sleeping) {
      return {
        reply: "آه، صحيت خلاص يا زوز! في إيه؟ ☕👀",
        action: "wake",
        state: "talk"
      };
    }

    if (!norm) {
      return {
        reply: "أيوة يا زوز! سامعك، قول عايز إيه؟ 👀",
        action: "talk",
        state: "talk"
      };
    }

    if (isStopFocus) {
      return {
        reply: "تمام، وقفنا مؤقت التركيز! خد نفسك يا بطل 😮‍💨",
        action: "focus_stop",
        state: "talk"
      };
    }

    if (hasAny(norm, ["تركيز", "ركز", "بومودورو", "تايمر", "مؤقت", "focus", "pomodoro", "lock in"])) {
      return {
        reply: "قفلنا كل حاجة! وضع التركيز شغال دلوقتي، اشش إحنا مركزين 🔒",
        action: "focus_start",
        state: "focus"
      };
    }

    if (hasAny(norm, ["العب", "لعبه", "قهوه", "جيم", "زهقان", "catch", "game", "ملل"])) {
      if (hasAny(norm, ["شربت", "هات", "ادي", "كوبايه قهوه", "اشرب"]) && !hasAny(norm, ["العب", "لعبه", "game"])) {
        return {
          reply: "تسلم إيدك يا زوز! أحلى كوباية قهوة تعدل المزاج ☕🔥",
          action: "sip_coffee",
          state: "sip"
        };
      }
      return {
        reply: "يلا بينا! حرّك إيدك وامسك كوبايات القهوة قبل ما تقع! ☕🎮",
        action: "game_start",
        state: "game"
      };
    }

    if (hasAny(norm, ["نام", "نوم", "سرير", "تصبح علي خير", "ريح", "sleep", "bed"])) {
      return {
        reply: "أخيراً! تصبح على خير يا زوز، رايح سريري الأزرق أنام شوية 🛏️💙",
        action: "sleep",
        state: "sleep"
      };
    }

    if (hasAny(norm, ["امشيها", "اخفي", "روحوا", "dismiss", "hide companion"])) {
      return {
        reply: "ماشي يا فلفلة، زوز عايزنا نشتغل لوحدنا شوية 👋🩷",
        action: "companion_off",
        state: "talk"
      };
    }

    if (hasAny(norm, ["صاحبتك", "البنوته", "فلفله", "هودي وردي", "الشخصيه التانيه", "companion", "pink"])) {
      return {
        reply: "يا فلفلة! تعالي سلّمي على زوز فوق شريط التطبيقات 🩷✨",
        action: "companion_on",
        state: "talk"
      };
    }

    if (hasAny(norm, ["تيرمينال", "كلود", "كود", "terminal", "claude"])) {
      return {
        reply: "فتحتلك شاشة الأوامر أهي يا ريس 💻",
        action: "open_terminal",
        state: "talk"
      };
    }

    if (hasAny(norm, ["نوتس", "ملاحظات", "notes"])) {
      return {
        reply: "فتحتلك الملاحظات، اكتب أفكارك عشان ما تنساش 📝",
        action: "open_notes",
        state: "talk"
      };
    }

    if (hasAny(norm, ["اعدادات", "صوت", "مفتاح", "settings"])) {
      return {
        reply: "دي إعدادات الصوت والذكاء الاصطناعي يا زوز 🎙️",
        action: "open_settings",
        state: "talk"
      };
    }

    if (hasAny(norm, ["لبس", "دولاب", "طربوش", "ثيم", "خلفيه", "wardrobe"])) {
      return {
        reply: "افتح الدولاب وشوف الطربوش المصري أو النضارة الجديدة 🎩🕶️",
        action: "open_wardrobe",
        state: "talk"
      };
    }

    if (hasAny(norm, ["اضحك", "ضحك", "هههه", "laugh"])) {
      return {
        reply: "ههههههه! والله دمك خفيف يا زوز 😂",
        action: "laugh",
        state: "laugh"
      };
    }

    if (hasAny(norm, ["نكته", "هزر", "ضحكني", "joke"])) {
      const joke = JOKES[jokeIndex % JOKES.length];
      jokeIndex++;
      return {
        reply: joke,
        action: "laugh",
        state: "laugh"
      };
    }

    if (hasAny(norm, ["اسالني", "سؤال", "اختيار", "check in"])) {
      return {
        reply: null,
        action: "checkin",
        state: "talk"
      };
    }

    if (hasAny(norm, ["جعان", "اكل", "فطار", "غدا", "عشا", "كشري", "فول", "طعميه"])) {
      return {
        reply: "يا عم حرام عليك جوعتني! يلا طبق كشري بالصلصة والدقة أو سندوتشين طعمية سخنة 🧆🔥",
        action: "talk",
        state: "talk"
      };
    }

    if (hasAny(norm, ["شجعني", "تعبان", "كسلان", "مش قادر", "motivate"])) {
      return {
        reply: "إنت قدها يا وحش! ركّز ربع ساعة بس وهتلاقي الدنيا فكت معاك، وأنا هنا في ضهرك 💪🚀",
        action: "talk",
        state: "talk"
      };
    }

    if (hasAny(norm, ["مساؤه", "ازيك", "عامل ايه", "اهلا", "سلام", "صباح", "اخبارك", "wassup", "hello", "hi"])) {
      return {
        reply: getTimeGreeting(),
        action: "greet",
        state: "talk"
      };
    }

    if (hasAny(norm, ["شكرا", "تسلم", "جامد", "عسل", "بحبك", "كفو"])) {
      return {
        reply: "حبيبي يا زوز! إحنا عشرة عمر على نفس الشاشة 💙👾",
        action: "laugh",
        state: "laugh"
      };
    }

    const fallbacks = [
      `سمعتك بتقول: ${rawText}. كلام كبير أوي يا زوز! تحب نلعب قهوة ولا نشغل تركيز؟ 😎`,
      "ماشي يا ريس! أنا مركز معاك هنا، قول لو عايز تايمر أو نكتة أو كوباية قهوة ☕",
      "أيوة يا زميلي! فهمت قصدك، تحب أطلعلك سؤال تفاعلي ولا ننده فلفلة؟ 👾"
    ];
    return {
      reply: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      action: "talk",
      state: "talk"
    };
  }

  async function queryLLM(rawText, llmConfig) {
    const systemPrompt =
      "أنت 'خربوش'، شخصية بيكسل مصرية خفيفة الدم بتعيش على الشاشة. " +
      "لازم ترد بالعامية المصرية فقط بنسبة مية في المية وبدون كلمات إنجليزية، بجمل قصيرة جداً (سطر أو اتنين). " +
      "لو المستخدم طلب تشغيل التركيز ضيف [ACTION:FOCUS]، لو طلب لعبة ضيف [ACTION:GAME]، لو طلب ينام ضيف [ACTION:SLEEP]، لو طلب صاحبته ضيف [ACTION:COMPANION]، لو فيه ضحك ضيف [ACTION:LAUGH].";

    if (llmConfig.provider === "gemini") {
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        encodeURIComponent(llmConfig.apiKey);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nالمستخدم: " + rawText }] }]
        })
      });
      if (!res.ok) throw new Error("Gemini API " + res.status);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return parseLLMAction(text);
    }

    if (llmConfig.provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + llmConfig.apiKey
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: rawText }
          ],
          max_tokens: 140
        })
      });
      if (!res.ok) throw new Error("OpenAI API " + res.status);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      return parseLLMAction(text);
    }

    return null;
  }

  function parseLLMAction(text) {
    let action = "talk";
    let state = "talk";
    if (text.includes("[ACTION:FOCUS]")) {
      action = "focus_start";
      state = "focus";
    } else if (text.includes("[ACTION:GAME]")) {
      action = "game_start";
      state = "game";
    } else if (text.includes("[ACTION:SLEEP]")) {
      action = "sleep";
      state = "sleep";
    } else if (text.includes("[ACTION:COMPANION]")) {
      action = "companion_on";
    } else if (text.includes("[ACTION:LAUGH]")) {
      action = "laugh";
      state = "laugh";
    }
    const clean = text.replace(/\[ACTION:[A-Z_]+\]/g, "").trim();
    return { reply: clean || "أيوة يا زوز!", action, state };
  }

  function isSyncCommand(localAction) {
    return [
      "locked_in_warn",
      "sleep_murmur",
      "wake",
      "focus_start",
      "focus_stop",
      "game_start",
      "sleep",
      "companion_on",
      "companion_off",
      "open_terminal",
      "open_notes",
      "open_settings",
      "open_wardrobe",
      "checkin"
    ].includes(localAction);
  }

  function processInputSync(rawText, ctx) {
    return processLocalIntent(rawText, ctx);
  }

  async function processInput(rawText, ctx, llmConfig) {
    const local = processLocalIntent(rawText, ctx);
    if (!isSyncCommand(local.action) && llmConfig && llmConfig.provider !== "local" && llmConfig.apiKey) {
      try {
        const aiResult = await queryLLM(rawText, llmConfig);
        if (aiResult && aiResult.reply) return aiResult;
      } catch (_) {}
    }
    return local;
  }

  global.KharbooshBrain = {
    normalizeArabic,
    detectWakeWord,
    getTimeGreeting,
    getCheckInCard,
    getBanterPair,
    isSyncCommand,
    processInputSync,
    processInput
  };
})(window);
