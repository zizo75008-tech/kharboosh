(function (global) {
  "use strict";

  const PALETTE = {
    ".": null,
    K: "#020617", // Crisp pixel outline
    H: "#18181b", // Dark hair
    h: "#27272a", // Hair highlight
    S: "#e2a97e", // Warm Egyptian skin
    s: "#c68b5f", // Skin shadow
    W: "#ffffff", // Pure white
    G: "#111827", // Sunglasses / black frame
    L: "#38bdf8", // Cyan glasses glint / glow
    M: "#991b1b", // Mouth inside
    B: "#273549", // Charcoal black hoodie main
    b: "#475569", // Hoodie highlight
    D: "#1e293b", // Dark pants / shadow
    N: "#f8fafc", // Crisp white sneakers / laces
    R: "#dc2626", // Red (tarboosh / heart)
    r: "#991b1b", // Dark red
    Y: "#fbbf24", // Gold / tassel / espresso
    y: "#f59e0b", // Amber
    C: "#78350f", // Coffee brown
    c: "#b45309", // Light coffee
    E: "#34d399", // Emerald focus glow
    P: "#f472b6", // Pink hoodie main
    p: "#db2777", // Pink hoodie shadow
    q: "#fbcfe8", // Pink highlight
    F: "#451a03", // Companion dark hair
    U: "#2563eb", // Blue bed wood / frame
    u: "#60a5fa", // Light blue blanket
    V: "#1d4ed8", // Deep blue shadow
    T: "#86efac", // Mint tea green
    t: "#ca8a04", // Tea amber
    O: "#65a30d", // Taameya / herb green
    Z: "#a855f7"  // Bug purple
  };

  function renderMatrix(ctx, matrix, scale, offsetX, offsetY, flipX) {
    const rows = matrix.length;
    const cols = matrix[0] ? matrix[0].length : 0;
    for (let y = 0; y < rows; y++) {
      const row = matrix[y];
      for (let x = 0; x < cols; x++) {
        const ch = row[x];
        const color = PALETTE[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        const drawX = flipX ? offsetX + (cols - 1 - x) * scale : offsetX + x * scale;
        const drawY = offsetY + y * scale;
        ctx.fillRect(drawX, drawY, scale, scale);
      }
    }
  }

  // 24x24 Kharboosh (Video-faithful Kembo look: curly hair, thin glasses with visible eyes, beard stubble, black hoodie + white tee)
  const KHARBOOSH_FRAMES = {
    idle1: [
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWKGKSGKWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSsMMsSSSHK......",
      ".....KHHssssssHHK.......",
      "......KKKKKKKKKK........",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KBBbBBBBWWBBBBbBBK...",
      "...KSSKBBBBWWBBBBKSSK...",
      "...KSSKBBBBWWBBBBKSSK...",
      "....KK.KBBBWWBBBK.KK....",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................"
    ],
    idle2: [
      "........................",
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWLGKSGLWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSsMMsSSSHK......",
      ".....KHHssssssHHK.......",
      "......KKKKKKKKKK........",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KBBbBBBBWWBBBBbBBK...",
      "...KSSKBBBBWWBBBBKSSK...",
      "....KK.KBBBWWBBBK.KK....",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................"
    ],
    walk1: [
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWKGKSGKWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSsMMsSSSHK......",
      ".....KHHssssssHHK.......",
      "......KKKKKKKKKK........",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KSSKBBBBWWBBBBKBBK...",
      "....KK.KBBBWWBBBK.KSSK..",
      ".......KBBBWWBBBK..KK...",
      ".......KDDDDDDDDK.......",
      "......KDDDK..KDDDK......",
      ".....KDDDK....KDDDK.....",
      "....KNNNNK....KNNNNK....",
      "....KKKKKK....KKKKKK....",
      "........................",
      "........................"
    ],
    walk2: [
      "........................",
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWKGKSGKWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSsMMsSSSHK......",
      ".....KHHssssssHHK.......",
      "......KKKKKKKKKK........",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KBBKBBBBWWBBBBKSSK...",
      "..KSSK.KBBBWWBBBK.KK....",
      "...KK..KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................"
    ],
    talk1: [
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWKGKSGKWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSWMMWSSSHK......",
      ".....KHHSMMMMSHHK.......",
      "......KKKKKKKKKK........",
      ".....KKBBBBWWBBBBKK.....",
      "...KKBBbBBBWWBBBbBBKK...",
      "..KSSKBBBBBWWBBBBBKSSK..",
      "...KK.KBBBBWWBBBBK.KK...",
      "......KBBBBWWBBBBK......",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................"
    ],
    talk2: [
      "........................",
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWLGKSGLWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSsWWsSSSHK......",
      ".....KHHssssssHHK.......",
      "......KKKKKKKKKK........",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KBBbBBBBWWBBBBbBBK...",
      "...KSSKBBBBWWBBBBKSSK...",
      "....KK.KBBBWWBBBK.KK....",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................"
    ],
    laugh1: [
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      "....KHHHHHHHHHHHHK......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGLLGKSGLLGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSWMMMMWSSHK......",
      ".....KHHMMMMMMHHK.......",
      "......KKKKKKKKKK........",
      "....KKKBBBBWWBBBBKKK....",
      "...KSSKBBBBWWBBBBKSSK...",
      "....KK.KBBBWWBBBK.KK....",
      ".......KBBBWWBBBK.......",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      "......KDDDK...KDDDK.....",
      "......KNNNK...KNNNK.....",
      "......KKKKK...KKKKK.....",
      "........................",
      "........................",
      "........................"
    ],
    laugh2: [
      "........................",
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      "....KHHHHHHHHHHHHK......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGLLGKSGLLGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSWMMMMWSSHK......",
      ".....KHHsMMMMsHHK.......",
      "......KKKKKKKKKK........",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KSSKBBBBWWBBBBKSSK...",
      "....KK.KBBBWWBBBK.KK....",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................"
    ],
    focus1: [
      "........................",
      "......KEKKK..KKKEK......",
      ".....KEKHHHHHHHHKEK.....",
      "....KEKHHhHHHHHhHKEK....",
      "....KEKHHHHHHHHHHKEK....",
      "....KEKHSSSSSSSSSHKEK...",
      "....KEKSGGGGKKGGGGSKEK..",
      "....KEKSGEEKKSGEEGSKEK..",
      ".....KKSGGGGKKGGGGSKK...",
      ".....KHSSSKKKKKSSSHK....",
      "......KHHssssssHHK......",
      ".......KKKKKKKKKK.......",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KBBKBBBBEEBBBBKBBK...",
      "...KSSKBBBBWWBBBBKSSK...",
      "....KK.KBBBWWBBBK.KK....",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................"
    ],
    focus2: [
      "........................",
      "......KEKKK..KKKEK......",
      ".....KEKHHHHHHHHKEK.....",
      "....KEKHHhHHHHHhHKEK....",
      "....KEKHHHHHHHHHHKEK....",
      "....KEKHSSSSSSSSSHKEK...",
      "....KEKSGGGGKKGGGGSKEK..",
      "....KEKSGLLKKSGLLGSKEK..",
      ".....KKSGGGGKKGGGGSKK...",
      ".....KHSSSKKKKKSSSHK....",
      "......KHHssssssHHK......",
      ".......KKKKKKKKKK.......",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBK....",
      "...KBBKBBBBLLBBBBKBBK...",
      "...KSSKBBBBWWBBBBKSSK...",
      "....KK.KBBBWWBBBK.KK....",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................"
    ],
    game1: [
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWKGKSGKWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSsMMsSSSHK......",
      ".....KHHssssssHHK.......",
      "......KKKKKKKKKK........",
      "....KKKBBBBWWBBBBKKK....",
      "...KSSKBBBBWWBBBBKSSK...",
      "..KYYYYYYYYYYYYYYYYYYK..",
      "..KKKKKKKKKKKKKKKKKKKK..",
      ".......KBBBWWBBBK.......",
      ".......KDDDDDDDDK.......",
      "......KDDDK..KDDDK......",
      ".....KDDDK....KDDDK.....",
      "....KNNNNK....KNNNNK....",
      "....KKKKKK....KKKKKK....",
      "........................",
      "........................"
    ],
    sip1: [
      "........................",
      ".......KKK..KKK.........",
      "......KHHHHHHHHK........",
      ".....KHHhHHHHHhHK.......",
      ".....KHHHHHHHHHHK.......",
      "....KHSSSSSSSSSSHK......",
      "....KSGGGGKKGGGGSK......",
      "....KSGWKGKSGKWGSK......",
      "....KSGGGGKKGGGGSK......",
      "....KHSSSsMMsSSSHK......",
      ".....KHHssssssHHK...W...",
      "......KKKKKKKKKK...W....",
      ".....KKBBBBWWBBBBKK.....",
      "....KBBbBBBWWBBBbBBKCCK.",
      "...KBBbBBBBWWBBBBbBCcCK.",
      "...KSSKBBBBWWBBBBKSCcCK.",
      "....KK.KBBBWWBBBK.KKKK..",
      ".......KDDDDDDDDK.......",
      ".......KDDDK.KDDDK......",
      ".......KDDDK.KDDDK......",
      "......KNNNNK.KNNNNK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................"
    ]
  };

  // Optional Pixel Accessories (24x24 overlays)
  const ACCESSORIES = {
    tarboosh: [
      "........KKKKKKK.........",
      ".......KRRRRRRRK........",
      "......KRRRRRRRRRK.......",
      "......KRRRRrRRRRK...K...",
      "......KRRRRRRRRRKKKKK...",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ],
    headphones: [
      "......KKKKKKKKKKKK......",
      ".....KLLLLLLLLLLLLK.....",
      "....KLLKKKKKKKKKKLLK....",
      "...KLLK..........KLLK...",
      "...KLK............KLK...",
      "...KLLK..........KLLK...",
      "...KLLK..........KLLK...",
      "....KK............KK....",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ],
    tea: [
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "...................W....",
      "..................W.....",
      "..................KKKK..",
      "..................KTTK..",
      "..................KttK..",
      "..................KttK..",
      "..................KKKK..",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  };

  // 24x24 Second Character (Video-faithful Pink Hoodie Companion with white inner shirt & jeans)
  const COMPANION_FRAMES = {
    idle1: [
      "........................",
      ".......KKKKKKKKKK.......",
      "......KFFFFFFFFFFK......",
      ".....KFFhFFFFFFhFFK.....",
      ".....KFFSSSSSSSSFFK.....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSSSSSSSSSFFK....",
      ".....KFSSSSMMSSSSFK.....",
      ".....KFKKKKKKKKKKFK.....",
      ".....KFFPPPWWPPPFFK.....",
      "....KFFPPqPWWPqPPFFK....",
      "....KFFPPPWPPWPPPFFK....",
      "...KPPPPpPPWWPPpPPPPK...",
      "...KSSKPPPPWWPPPPKSSK...",
      "....KK.KPPPWWPPPK.KK....",
      ".......KUUUUUUUUK.......",
      ".......KUUUK.KUUUK......",
      ".......KVVVK.KVVVK......",
      "......KWWWWK.KWWWWK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................",
      "........................"
    ],
    idle2: [
      "........................",
      "........................",
      ".......KKKKKKKKKK.......",
      "......KFFFFFFFFFFK......",
      ".....KFFhFFFFFFhFFK.....",
      ".....KFFSSSSSSSSFFK.....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSSSSSSSSSFFK....",
      ".....KFSSSSMMSSSSFK.....",
      ".....KFKKKKKKKKKKFK.....",
      ".....KFFPPPWWPPPFFK.....",
      "....KFFPPqPWWPqPPFFK....",
      "....KFFPPPWPPWPPPFFK....",
      "...KPPPPpPPWWPPpPPPPK...",
      "...KSSKPPPPWWPPPPKSSK...",
      "....KK.KPPPWWPPPK.KK....",
      ".......KUUUUUUUUK.......",
      ".......KUUUK.KUUUK......",
      ".......KVVVK.KVVVK......",
      "......KWWWWK.KWWWWK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................"
    ],
    walk1: [
      "........................",
      ".......KKKKKKKKKK.......",
      "......KFFFFFFFFFFK......",
      ".....KFFhFFFFFFhFFK.....",
      ".....KFFSSSSSSSSFFK.....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSSSSSSSSSFFK....",
      ".....KFSSSSMMSSSSFK.....",
      ".....KFKKKKKKKKKKFK.....",
      ".....KFFPPPWWPPPFFK.....",
      "....KFFPPqPWWPqPPFFK....",
      "....KFFPPPWPPWPPPFFK....",
      "...KSSKPPPPWWPPPPKPPK...",
      "....KK.KPPPWWPPPK.KSSK..",
      ".......KUUUUUUUUK..KK...",
      "......KUUUK..KUUUK......",
      ".....KVVVK....KVVVK.....",
      "....KWWWWK....KWWWWK....",
      "....KKKKKK....KKKKKK....",
      "........................",
      "........................",
      "........................",
      "........................"
    ],
    talk1: [
      "........................",
      ".......KKKKKKKKKK.......",
      "......KFFFFFFFFFFK......",
      ".....KFFhFFFFFFhFFK.....",
      ".....KFFSSSSSSSSFFK.....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSKSSSSKSSFFK....",
      "....KFFSSSSSSSSSSFFK....",
      ".....KFSSSWMMWSSSFK.....",
      ".....KFSSMMMMMMSSFK.....",
      ".....KFKKKKKKKKKKFK.....",
      "....KKFFPPPWWPPPFFKK....",
      "...KSSKPPPPWWPPPPKSSK...",
      "....KK.KPPPWWPPPK.KK....",
      ".......KPPPWWPPPK.......",
      ".......KUUUUUUUUK.......",
      ".......KUUUK.KUUUK......",
      ".......KVVVK.KVVVK......",
      "......KWWWWK.KWWWWK.....",
      "......KKKKKK.KKKKKK.....",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  };

  // 32x16 Blue Bed + Sleeping Kharboosh (سرير أزرق صغير)
  const BED_FRAMES = {
    sleep1: [
      "................................",
      ".KK.............................",
      ".KUK............................",
      ".KUK.KKKKKK.....................",
      ".KUKKWWWWWWK.KKKKKKKKKK.........",
      ".KUKKWWWWWWKKHHHHHHHHHHK........",
      ".KUKKWWGGGGKKSSSSSSSSSSK........",
      ".KUKUUUUUUUUUUUUUUUUUUUUUUUUUK..",
      ".KUKUUuuuuuuuuuuuuuuuuuuuuuuUK..",
      ".KUKUUuuuWWWWuuuuWWWWuuuuuuuUK..",
      ".KUKUUuuuuuuuuuuuuuuuuuuuuuuUK..",
      ".KUKVVVVVVVVVVVVVVVVVVVVVVVVVK..",
      ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
      ".KUK......................KUK...",
      ".KKK......................KKK...",
      "................................"
    ],
    sleep2: [
      "................................",
      ".KK.............................",
      ".KUK............................",
      ".KUK.KKKKKK.....................",
      ".KUKKWWWWWWK.KKKKKKKKKK.........",
      ".KUKKWWWWWWKKHHHHHHHHHHK........",
      ".KUKKWWGGGGKKSSSSSSSSSSK........",
      ".KUKUUUUUUUUUUUUUUUUUUUUUUUUUK..",
      ".KUKUUuuuuuuuuuuuuuuuuuuuuuuUK..",
      ".KUKUUuuuuWWWWuuuuWWWWuuuuuuUK..",
      ".KUKUUuuuuuuuuuuuuuuuuuuuuuuUK..",
      ".KUKVVVVVVVVVVVVVVVVVVVVVVVVVK..",
      ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
      ".KUK......................KUK...",
      ".KKK......................KKK...",
      "................................"
    ]
  };

  // 16x16 Mini-Game Items
  const ITEM_SPRITES = {
    coffee: [
      "......W...W.....",
      ".......W...W....",
      "......W...W.....",
      "................",
      "...KKKKKKKKKK...",
      "...KCCCCCCCCK...",
      "...KWWWWWWWWKKK.",
      "...KWWCCCCWWK.K.",
      "...KWWCCCCWWKKK.",
      "...KWWWWWWWWK...",
      "....KWWWWWWK....",
      ".....KKKKKK.....",
      "................",
      "................",
      "................",
      "................"
    ],
    golden: [
      ".....Y..W..Y....",
      "......W...W.....",
      ".....Y.W.W.Y....",
      "................",
      "...KKKKKKKKKK...",
      "...KYYYYYYYYK...",
      "...KYYYYYYYYKKK.",
      "...KYYWWWWYYK.K.",
      "...KYYWWWWYYKKK.",
      "...KYYYYyyyyK...",
      "....KYYYYYYK....",
      ".....KKKKKK.....",
      "................",
      "................",
      "................",
      "................"
    ],
    bug: [
      "................",
      "....K......K....",
      ".....K....K.....",
      "....KKKKKKKK....",
      "...KZZZZZZZZK...",
      "..KZZWWZZWWZZK..",
      "..KZZWKZZKWZZK..",
      "..KZZZZZZZZZZK..",
      ".KKZZZZKKZZZZKK.",
      ".K.KZZZKKZZZK.K.",
      "....KZZZZZZK....",
      "...K.KKKKKK.K...",
      "..K..........K..",
      "................",
      "................",
      "................"
    ],
    tea: [
      "......W...W.....",
      ".......W...W....",
      "................",
      "....KKKKKKKK....",
      "....KTTTTTTK....",
      "....KttttttK....",
      "....KtTTTTtK....",
      "....KttttttK....",
      "....KttttttK....",
      ".....KttttK.....",
      ".....KttttK.....",
      ".....KKKKKK.....",
      "................",
      "................",
      "................",
      "................"
    ],
    taameya: [
      "................",
      "................",
      ".....KKKKKK.....",
      "...KKYYYYYYKK...",
      "..KYyWWYYWWyYK..",
      ".KYyOOYYYYOOyYK.",
      ".KYyOOyyyyOOyYK.",
      ".KYyyyyWWyyyyYK.",
      "..KYyYYYYYYyYK..",
      "...KKYYYYYYKK...",
      ".....KKKKKK.....",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  };

  function drawKharboosh(ctx, frameName, accessory, flipX) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const matrix = KHARBOOSH_FRAMES[frameName] || KHARBOOSH_FRAMES.idle1;
    const scale = Math.floor(w / 24);
    renderMatrix(ctx, matrix, scale, 0, 0, Boolean(flipX));

    if (accessory && accessory !== "shades" && ACCESSORIES[accessory]) {
      renderMatrix(ctx, ACCESSORIES[accessory], scale, 0, 0, Boolean(flipX));
    }
  }

  function drawCompanion(ctx, frameName, flipX) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const matrix = COMPANION_FRAMES[frameName] || COMPANION_FRAMES.idle1;
    const scale = Math.floor(w / 24);
    renderMatrix(ctx, matrix, scale, 0, 0, Boolean(flipX));
  }

  function drawBed(ctx, frameIndex) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const matrix = frameIndex % 2 === 0 ? BED_FRAMES.sleep1 : BED_FRAMES.sleep2;
    const scale = Math.floor(w / 32);
    renderMatrix(ctx, matrix, scale, 0, 0, false);
  }

  function drawItem(ctx, itemKey, x, y, scale) {
    const matrix = ITEM_SPRITES[itemKey] || ITEM_SPRITES.coffee;
    renderMatrix(ctx, matrix, scale || 3, x, y, false);
  }

  global.KharbooshSprites = {
    drawKharboosh,
    drawCompanion,
    drawBed,
    drawItem,
    KHARBOOSH_FRAMES,
    COMPANION_FRAMES,
    BED_FRAMES,
    ITEM_SPRITES
  };
})(window);
