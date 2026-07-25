(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("posterCanvas");
  const ctx = canvas.getContext("2d");
  const sceneCanvas = document.createElement("canvas");
  const sceneCtx = sceneCanvas.getContext("2d", { willReadFrequently: true });
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const deepClone = (v) => JSON.parse(JSON.stringify(v));
  const round = (n) => Math.round(Number(n) || 0);

  const fontFamilies = {
    pretendard: '"PretendardVariable", "Pretendard", sans-serif',
    dotum: '"KoPubDotum", sans-serif',
    batang: '"KoPubBatang", serif',
    chosunSm: '"ChosunSm", serif',
    chosunKm: '"ChosunKm", serif',
    chosunKg: '"ChosunKg", sans-serif',
    chosunSg: '"ChosunSg", sans-serif',
    chosunBg: '"ChosunBg", sans-serif',
    chosunGu: '"ChosunGu", sans-serif',
    chosunLo: '"ChosunLo", sans-serif',
    chosunGs: '"ChosunGs", serif'
  };
  const FONT_OPTIONS = [
    ["pretendard", "프리텐다드 Variable"],
    ["dotum", "KoPub 돋움"],
    ["batang", "KoPub 바탕"],
    ["chosunSm", "조선신명조"],
    ["chosunKm", "조선굵은명조"],
    ["chosunKg", "조선굵은고딕"],
    ["chosunSg", "조선가는고딕"],
    ["chosunBg", "조선견고딕"],
    ["chosunGu", "조선굴림체"],
    ["chosunLo", "조선로고체"],
    ["chosunGs", "조선궁서체"]
  ];
  const PX_PER_MM = 8;
  const EFFECT_TYPES = ["shadow", "hollow", "extrude", "outline"];

  const QUICK_COLORS = [
    "#ffffff", "#111111", "#f4e900", "#ff3b30", "#ff6a00", "#ff4f9a", "#a53cff", "#1356c5",
    "#00a6d7", "#19d37e", "#73e531", "#f4c7a1", "#d9d9d9", "#7f8795", "#6a2c1b", "#003c88"
  ];

  const SYMBOLS = [
    { cat: "기본", chars: "•◦▪▫■□●○◆◇★☆♥♡☎☏✆✦✧✪✩" },
    { cat: "화살표", chars: "→←↑↓↗↘↙↖⇒⇐⇑⇓➜➤➥➦➧➨" },
    { cat: "주의", chars: "※‼⁉⚠⚡☢☣✖✕✚✜✹✺✷✸" },
    { cat: "괄호", chars: "〈〉《》「」『』【】〔〕〖〗〘〙〚〛" },
    { cat: "돈·숫자", chars: "₩$€£¥¢①②③④⑤⑥⑦⑧⑨⑩⅓⅔" },
    { cat: "카드", chars: "♠♤♣♧♥♡♦♢⚀⚁⚂⚃⚄⚅" },
    { cat: "음악·별", chars: "♪♫♬♩♭♯✶✷✸✹✺✻✼✽✾✿" },
    { cat: "한글 장식", chars: "㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㈎㈏㈐㈑㈒" },
    { cat: "기호", chars: "@#%&*+=/\\|~^_`§¶†‡∞∴∵≈≠" }
  ];

  const UNICODE_PRESETS = [
    ["none", "없음"],
    ["slash", "단어 사이 /"],
    ["slashChar", "글자 사이 /"],
    ["dot", "단어 사이 ·"],
    ["dotChar", "글자 사이 ·"],
    ["star", "단어 사이 ★"],
    ["starChar", "글자 사이 ★"],
    ["heart", "단어 사이 ♥"],
    ["heartChar", "글자 사이 ♥"],
    ["block", "단어 사이 ■"],
    ["blockChar", "글자 사이 ■"],
    ["bullet", "단어 사이 •"],
    ["bulletChar", "글자 사이 •"],
    ["wrapQuote", "『문장』"],
    ["wrapPhone", "☎ 문장 ☎"],
    ["wrapCard", "♠ 문장 ♠"],
    ["glitch", "기호 난입"],
    ["custom", "직접 기호"],
  ];

  function hexToRgb(hex) {
    if (!hex || hex === "none") return { r: 0, g: 0, b: 0 };
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    const num = parseInt(full, 16) || 0;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }
  function mix(a, b, amount) {
    const A = hexToRgb(a); const B = hexToRgb(b);
    return rgbToHex({ r: A.r + (B.r - A.r) * amount, g: A.g + (B.g - A.g) * amount, b: A.b + (B.b - A.b) * amount });
  }
  function luminance(color) {
    const { r, g, b } = hexToRgb(color);
    const linear = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  const contrastText = (color) => luminance(color) > 0.45 ? "#111111" : "#ffffff";
  function contrastRatio(a, b) {
    const A = luminance(a) + .05;
    const B = luminance(b) + .05;
    return Math.max(A, B) / Math.min(A, B);
  }
  function bestAccentColor(background, baseColor) {
    const candidates=availablePalette(state?.palette).colors;
    const ranked=candidates
      .filter((color)=>color.toLowerCase()!==String(baseColor||"").toLowerCase())
      .map((color)=>({color,score:contrastRatio(color,background)}))
      .sort((a,b)=>b.score-a.score);
    return ranked[0]?.color||candidates[0]||state?.palette?.primary||"#ffd400";
  }


  function rawPaletteRoleColor(role, palette = null) {
    const p = palette || state?.palette || {};
    if (role === "primary") return p.primary || "#ffd400";
    if (role === "secondary") return p.secondary || p.primary || "#111111";
    if (role === "tertiary") return p.tertiary || p.secondary || p.primary || "#e62d20";
    if (role === "white") return "#ffffff";
    if (role === "black") return "#111111";
    return null;
  }

  function enabledPaletteRoles(palette = null) {
    const p = palette || state?.palette || {};
    const enabled = ["primary"];
    if (p.secondaryEnabled !== false && p.secondary) enabled.push("secondary");
    if (p.tertiaryEnabled !== false && p.tertiary) enabled.push("tertiary");
    if (p.useWhite !== false) enabled.push("white");
    if (p.useBlack !== false) enabled.push("black");
    return enabled;
  }

  function paletteRoleOrder(palette = null) {
    const p = palette || state?.palette || {};
    const enabled = enabledPaletteRoles(p);
    const saved = Array.isArray(p.roleOrder) ? p.roleOrder : [];
    const ordered = saved.filter((role, index) => enabled.includes(role) && saved.indexOf(role) === index);
    enabled.forEach((role) => { if (!ordered.includes(role)) ordered.push(role); });
    return ordered;
  }

  function availablePalette(palette = null) {
    const p = palette || state?.palette || {};
    const order = paletteRoleOrder(p);
    const colors = [];
    order.forEach((role) => {
      const color = rawPaletteRoleColor(role, p);
      if (color && !colors.some((item) => item.toLowerCase() === color.toLowerCase())) colors.push(color);
    });
    if (!colors.length) colors.push(p.primary || "#ffd400");
    const neutrals = [];
    if (p.useWhite !== false) neutrals.push("#ffffff");
    if (p.useBlack !== false) neutrals.push("#111111");
    return { colors, neutrals, order };
  }

  function paletteColor(role, palette) {
    const p = palette || state?.palette || { primary: "#ffd400", secondary: "#111111", tertiary: "#e62d20" };
    const { colors } = availablePalette(p);
    const active=colors.length?colors:[p.primary||"#ffd400"];
    const primary=active[0];
    const secondary=active[1%active.length];
    const tertiary=active[2%active.length];
    const exactWhite=p.useWhite!==false?"#ffffff":null;
    const exactBlack=p.useBlack!==false?"#111111":null;
    const lightest=active.slice().sort((a,b)=>luminance(b)-luminance(a))[0]||primary;
    const darkest=active.slice().sort((a,b)=>luminance(a)-luminance(b))[0]||primary;
    const templateWhite=exactWhite||active[3%active.length];
    const templateBlack=exactBlack||active[4%active.length];
    const paperMix=clamp((Number(p.paperMix)||78)/100,0,.96);
    const backgroundEnabled=p.useBackground!==false;
    if(!role)return darkest;
    if(role==="primary")return primary;
    if(role==="secondary")return secondary;
    if(role==="tertiary")return tertiary;
    if(role==="ink")return darkest;
    if(role==="black")return templateBlack;
    if(role==="white")return templateWhite;
    if(role==="paper")return backgroundEnabled?mix(rawPaletteRoleColor("primary",p),"#ffffff",paperMix):(exactWhite||lightest);
    if(role==="paperHard")return backgroundEnabled?mix(rawPaletteRoleColor("primary",p),"#ffffff",clamp(paperMix-.18,0,.88)):(exactWhite||lightest);
    if(role==="primarySoft")return backgroundEnabled?mix(primary,exactWhite||lightest,clamp(paperMix*.55,.12,.72)):primary;
    if(role==="primaryDeep")return mix(primary,exactBlack||darkest,.18);
    if(role==="secondarySoft")return backgroundEnabled?mix(secondary,exactWhite||lightest,.18):secondary;
    if(role==="secondaryPaper")return backgroundEnabled?mix(secondary,"#ffffff",.74):secondary;
    if(role==="tertiarySoft")return backgroundEnabled?mix(tertiary,exactWhite||lightest,.22):tertiary;
    if(role==="tertiaryPaper")return backgroundEnabled?mix(tertiary,"#ffffff",.66):tertiary;
    if(role==="tertiaryDeep")return mix(tertiary,exactBlack||darkest,.16);
    if(role==="cream")return backgroundEnabled?mix(primary,"#fff4d2",.82):primary;
    return role;
  }

  const PREVIEW_BACKGROUND_MODES = {
    white: { label: "흰색" },
    black: { label: "검은색" },
    "black-transparent": { label: "검은 투명배경" },
    "white-transparent": { label: "흰 투명배경" },
    transparent: { label: "투명배경" }
  };

  function normalizedPreviewBackgroundMode(value) {
    return Object.prototype.hasOwnProperty.call(PREVIEW_BACKGROUND_MODES, value) ? value : "black";
  }

  function applyPreviewBackgroundMode() {
    const mode = normalizedPreviewBackgroundMode(state.previewBackgroundMode);
    state.previewBackgroundMode = mode;
    const stage = $("canvasStage");
    if (stage) {
      stage.dataset.previewBackgroundMode = mode;
      stage.style.removeProperty("background");
      stage.style.removeProperty("background-color");
      stage.style.removeProperty("background-image");
    }
    const button = $("previewBackgroundButton");
    const icon = $("previewBackgroundIcon");
    const label = PREVIEW_BACKGROUND_MODES[mode].label;
    if (button) {
      button.dataset.mode = mode;
      button.title = `미리보기 바탕: ${label}`;
      button.setAttribute("aria-label", `미리보기 바탕: ${label}`);
    }
    if (icon) icon.dataset.mode = mode;
    document.querySelectorAll("[data-preview-background-mode]").forEach((option) => {
      const active = option.dataset.previewBackgroundMode === mode;
      option.classList.toggle("active", active);
      option.setAttribute("aria-checked", active ? "true" : "false");
    });
  }

  function setPreviewBackgroundMenuOpen(open) {
    const menu = $("previewBackgroundMenu");
    const button = $("previewBackgroundButton");
    const options = $("previewBackgroundOptions");
    if (!menu || !button || !options) return;
    menu.classList.toggle("open", Boolean(open));
    button.setAttribute("aria-expanded", open ? "true" : "false");
    options.hidden = !open;
  }

  function shufflePaletteRoles() {
    const roles = enabledPaletteRoles(state.palette);
    if (roles.length < 2) {
      toast("섞을 색상을 두 가지 이상 켜 주세요.");
      return;
    }
    const previous = paletteRoleOrder(state.palette).join("|");
    let shuffled = roles.slice();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (shuffled.join("|") !== previous) break;
    }
    state.palette.roleOrder = shuffled;
    applyPaletteRefresh();
    schedulePersistState();
    markHistoryDirty(true);
    toast("템플릿의 사용 색상 위치를 섞었습니다.");
  }

  function R(name, x, y, w, h, options = {}) {
    const region = {
      id: uid(), name, x, y, w, h,
      shape: "rect", radius: 0, rotation: 0, padding: 26, textVAlign: "center",
      fill: "#ffffff", fillRole: null, fillNone: false,
      stroke: "#111111", strokeRole: null, strokeNone: true, strokeWidth: 0,
      acceptText: true, clipText: false, effect: "none", effects: [], effectColor: "#111111", effectSize: 18,
      ...options
    };
    if (options.strokeNone === undefined && (options.stroke || options.strokeRole) && Number(options.strokeWidth) > 0) {
      region.strokeNone = false;
    }
    return region;
  }

  const REGION_TEXT_PRESETS = {
    hero: {
      fontFamily:"chosunKg", align:"left", bold:true, italic:false,
      lineHeight:.82, scaleX:.96, letterSpacing:-5,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:226, fontScale:1.20, gapScale:.48, accentWords:true
    },
    heroShadow: {
      fontFamily:"chosunKg", align:"left", bold:true, italic:false,
      lineHeight:.82, scaleX:.96, letterSpacing:-5,
      unicodeStyle:"none", effect:"shadow", effectColorRole:"secondary", outlineWidth:3,
      fontCap:220, fontScale:1.16, gapScale:.48, accentWords:false
    },
    heroOutline: {
      fontFamily:"chosunKg", align:"left", bold:true, italic:false,
      lineHeight:.82, scaleX:.96, letterSpacing:-5,
      unicodeStyle:"none", effect:"outline", effectColorRole:"paper", outlineWidth:2,
      fontCap:220, fontScale:1.17, gapScale:.48, accentWords:true
    },
    strap: {
      fontFamily:"dotum", align:"center", bold:true, italic:false,
      lineHeight:.88, scaleX:.93, letterSpacing:-3,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:112, fontScale:1.10, gapScale:.42, accentWords:false
    },
    badge: {
      fontFamily:"chosunLo", align:"center", bold:true, italic:false,
      lineHeight:.82, scaleX:.97, letterSpacing:-2,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:132, fontScale:1.10, gapScale:.40, accentWords:false
    },
    badgeOutline: {
      fontFamily:"chosunLo", align:"center", bold:true, italic:false,
      lineHeight:.82, scaleX:.97, letterSpacing:-2,
      unicodeStyle:"none", effect:"outline", effectColorRole:"paper", outlineWidth:2,
      fontCap:128, fontScale:1.08, gapScale:.40, accentWords:false
    },
    bulletDense: {
      fontFamily:"dotum", align:"left", bold:true, italic:false,
      lineHeight:.96, scaleX:.93, letterSpacing:-2,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:92, fontScale:1.02, gapScale:.44, accentWords:false
    },
    bodyDense: {
      fontFamily:"dotum", align:"left", bold:true, italic:false,
      lineHeight:.98, scaleX:.91, letterSpacing:-2,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:94, fontScale:1.02, gapScale:.44, accentWords:true
    },
    bodyDisplay: {
      fontFamily:"chosunKg", align:"left", bold:true, italic:false,
      lineHeight:.86, scaleX:.96, letterSpacing:-3,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:130, fontScale:1.10, gapScale:.40, accentWords:true
    },
    micro: {
      fontFamily:"dotum", align:"left", bold:false, italic:false,
      lineHeight:1.05, scaleX:.89, letterSpacing:-1,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:48, fontScale:.94, gapScale:.30, accentWords:false
    },
    microCenter: {
      fontFamily:"dotum", align:"center", bold:false, italic:false,
      lineHeight:1.02, scaleX:.89, letterSpacing:-1,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:48, fontScale:.94, gapScale:.30, accentWords:false
    },
    hotline: {
      fontFamily:"chosunKg", align:"center", bold:true, italic:false,
      lineHeight:.80, scaleX:.94, letterSpacing:-3,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:176, fontScale:1.20, gapScale:.30, accentWords:true
    },
    hotlineOutline: {
      fontFamily:"chosunKg", align:"center", bold:true, italic:false,
      lineHeight:.80, scaleX:.94, letterSpacing:-3,
      unicodeStyle:"none", effect:"outline", effectColorRole:"paper", outlineWidth:2,
      fontCap:174, fontScale:1.18, gapScale:.30, accentWords:true
    },
    note: {
      fontFamily:"chosunSm", align:"center", bold:true, italic:false,
      lineHeight:.90, scaleX:.94, letterSpacing:-2,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:108, fontScale:1.06, gapScale:.40, accentWords:false
    }
  };

  const templateSpecs = [
    {
      id:"street-alert",
      name:"원형 속보형",
      caption:"원형 배지·큰 제목·두 정보칸·하단 연락처",
      bg:{ mode:"solid", role:"primary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("속보 배지", .025, .035, .135, .225, { shape:"ellipse", fillRole:"tertiary", padding:18, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("큰 제목", .175, .025, .800, .245, { fillNone:true, padding:2, emphasis:1.52, textVAlign:"top", textPreset:"hero", textRoles:["headline"] }),
        R("기관 발표", 0, .295, 1, .075, { fillRole:"secondary", radius:0, padding:10, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("핵심 목록", .025, .405, .515, .315, { fillRole:"paper", padding:20, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet","body"] }),
        R("짧은 강조", .565, .405, .410, .185, { fillRole:"tertiary", padding:18, emphasis:1.05, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .565, .620, .230, .100, { fillRole:"secondary", padding:10, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", .025, .780, .950, .125, { fillRole:"tertiary", padding:12, emphasis:1.20, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .025, .930, .950, .045, { fillNone:true, padding:0, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[0,1,2,3,4,5,6,7]
    },
    {
      id:"black-red-split",
      name:"검정·빨강 분할형",
      caption:"밝은 제목판과 빨강 정보판을 검정 바탕에 결합",
      bg:{ mode:"solid", role:"secondary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("제목판", .025, .030, .950, .270, { fillRole:"paperHard", acceptText:false, padding:0 }),
        R("속보 배지", .030, .045, .135, .220, { shape:"ellipse", fillRole:"tertiary", padding:18, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("큰 제목", .180, .040, .770, .235, { fillNone:true, padding:2, emphasis:1.40, textVAlign:"center", textPreset:"hero", textRoles:["headline"] }),
        R("기관 발표", .025, .325, .950, .060, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("빨강 판", .025, .420, .950, .440, { fillRole:"tertiary", acceptText:false, padding:0 }),
        R("핵심 목록", .050, .445, .525, .235, { fillNone:true, padding:4, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("짧은 강조", .610, .445, .335, .235, { fillRole:"secondary", padding:18, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .050, .715, .250, .105, { fillRole:"paper", padding:10, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("전화 문구", .330, .705, .615, .120, { fillNone:true, padding:2, textVAlign:"center", textPreset:"hotlineOutline", textRoles:["footer"] }),
        R("주의 문구", .045, .885, .910, .060, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[1,2,3,5,6,7,8,9]
    },
    {
      id:"hotline-bottom",
      name:"전화번호 하단형",
      caption:"검은 바탕·폭발 배지·하단 전화번호를 크게 강조",
      bg:{ mode:"solid", role:"secondary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#ffffff", width:0, radius:0 },
      regions:[
        R("상단 안내", 0, .020, 1, .070, { fillRole:"primary", padding:9, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("큰 제목", .030, .120, .675, .300, { fillNone:true, padding:2, emphasis:1.46, textVAlign:"top", textPreset:"heroOutline", textRoles:["headline"] }),
        R("폭발 배지", .745, .120, .225, .290, { shape:"burst", fillRole:"tertiary", strokeRole:"paper", strokeWidth:3, strokeNone:false, padding:36, textVAlign:"center", textPreset:"badge", textRoles:["tag","callout"] }),
        R("핵심 목록", .030, .470, .540, .235, { fillRole:"paper", padding:20, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("짧은 강조", .600, .470, .370, .155, { fillRole:"primary", padding:16, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .600, .650, .230, .080, { fillRole:"tertiary", padding:8, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("전화 문구", 0, .770, 1, .170, { fillRole:"primary", padding:14, emphasis:1.42, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .945, .940, .030, { fillNone:true, padding:0, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[2,1,0,3,4,5,6,7]
    },
    {
      id:"giant-headline",
      name:"초대형 제목형",
      caption:"띠 없이 제목을 크게 두고 우측에 배지와 목록 배치",
      bg:{ mode:"solid", role:"primary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("큰 제목", .025, .030, .625, .500, { fillNone:true, padding:2, emphasis:1.70, textVAlign:"top", textPreset:"hero", textRoles:["headline"] }),
        R("속보 배지", .690, .040, .275, .285, { shape:"ellipse", fillRole:"tertiary", padding:30, textVAlign:"center", textPreset:"badge", textRoles:["tag","callout"] }),
        R("기관 발표", .690, .350, .275, .120, { fillNone:true, padding:3, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("핵심 목록", .685, .500, .285, .260, { fillRole:"secondary", padding:20, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("짧은 강조", .030, .585, .585, .180, { fillRole:"paper", padding:18, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .030, .800, .230, .090, { fillRole:"tertiary", padding:9, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("전화 문구", .290, .785, .680, .120, { fillNone:true, padding:2, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .930, .940, .045, { fillNone:true, padding:0, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[1,0,2,3,4,5,6,7]
    },
    {
      id:"round-badge-grid",
      name:"원형 배지+정보칸",
      caption:"띠 없이 원형 배지와 크기가 다른 네모칸 조합",
      bg:{ mode:"solid", role:"tertiary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("큰 제목", .030, .035, .585, .235, { fillRole:"paper", padding:18, textVAlign:"center", textPreset:"hero", textRoles:["headline"] }),
        R("큰 원", .670, .025, .295, .310, { shape:"ellipse", fillRole:"primary", padding:32, textVAlign:"center", textPreset:"badge", textRoles:["tag","callout"] }),
        R("기관 발표", .030, .300, .585, .075, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("왼쪽 목록", .030, .405, .455, .345, { fillRole:"secondary", padding:22, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("오른쪽 강조", .520, .405, .445, .205, { fillRole:"paper", padding:20, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("작은 타원", .625, .645, .320, .135, { shape:"ellipse", fillRole:"primary", padding:18, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("전화 문구", .035, .805, .530, .115, { fillNone:true, padding:2, textVAlign:"center", textPreset:"hotlineOutline", textRoles:["footer"] }),
        R("주의 문구", .595, .820, .370, .080, { fillNone:true, padding:1, textVAlign:"left", textPreset:"micro", textRoles:["micro"] })
      ],
      textSlots:[1,0,2,3,4,5,6,7]
    },
    {
      id:"three-columns",
      name:"3단 정보형",
      caption:"상단 제목과 서로 다른 색의 촘촘한 세 정보칸",
      bg:{ mode:"solid", role:"primary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("속보 배지", .020, .030, .110, .160, { shape:"ellipse", fillRole:"tertiary", padding:14, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("큰 제목", .145, .025, .830, .175, { fillRole:"secondary", padding:14, textVAlign:"center", textPreset:"heroOutline", textRoles:["headline"] }),
        R("기관 발표", .025, .220, .950, .060, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("왼쪽 정보", .025, .315, .300, .405, { fillRole:"paper", padding:18, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("가운데 정보", .350, .315, .300, .405, { fillRole:"tertiary", padding:18, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("오른쪽 정보", .675, .315, .300, .405, { fillRole:"secondary", padding:18, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", 0, .770, 1, .150, { fillRole:"tertiary", padding:13, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .025, .940, .950, .035, { fillNone:true, padding:0, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[0,1,2,3,4,5,6,7]
    },
    {
      id:"vertical-label",
      name:"세로 라벨형",
      caption:"왼쪽의 긴 색면과 오른쪽의 큰 제목·정보칸",
      bg:{ mode:"solid", role:"primary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("세로 색면", .020, .025, .205, .950, { fillRole:"secondary", acceptText:false, padding:0 }),
        R("속보 배지", .035, .060, .175, .185, { fillRole:"tertiary", padding:14, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("큰 제목", .255, .030, .715, .260, { fillNone:true, padding:2, emphasis:1.45, textVAlign:"top", textPreset:"hero", textRoles:["headline"] }),
        R("기관 발표", .255, .310, .715, .065, { fillRole:"tertiary", padding:8, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("핵심 목록", .255, .415, .405, .345, { fillRole:"paper", padding:20, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("짧은 강조", .690, .415, .280, .205, { fillRole:"tertiary", padding:18, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .690, .650, .280, .110, { fillRole:"secondary", padding:10, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", .255, .805, .715, .115, { fillRole:"tertiary", padding:12, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .035, .735, .175, .200, { fillNone:true, padding:4, textVAlign:"bottom", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[1,2,3,4,5,6,7,8]
    },
    {
      id:"center-burst",
      name:"중앙 폭발형",
      caption:"중앙 뾰족 말풍선과 좌우의 작은 정보 묶음",
      bg:{ mode:"solid", role:"tertiary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#ffffff", width:0, radius:0 },
      regions:[
        R("큰 제목", .025, .030, .950, .205, { fillRole:"paper", padding:16, textVAlign:"center", textPreset:"hero", textRoles:["headline"] }),
        R("속보 배지", .035, .260, .165, .120, { fillRole:"secondary", padding:12, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("기관 발표", .225, .270, .750, .090, { fillNone:true, padding:2, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("왼쪽 목록", .030, .420, .265, .310, { fillNone:true, padding:4, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("중앙 폭발", .325, .380, .350, .390, { shape:"burst", fillRole:"primary", strokeRole:"secondary", strokeWidth:4, strokeNone:false, padding:44, textVAlign:"center", textPreset:"badge", textRoles:["callout"] }),
        R("오른쪽 수치", .705, .420, .265, .200, { fillRole:"secondary", padding:18, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", .300, .805, .670, .115, { fillRole:"secondary", padding:12, textVAlign:"center", textPreset:"hotlineOutline", textRoles:["footer"] }),
        R("주의 문구", .030, .825, .235, .085, { fillNone:true, padding:1, textVAlign:"left", textPreset:"micro", textRoles:["micro"] })
      ],
      textSlots:[1,0,2,3,4,5,6,7]
    },
    {
      id:"coupon-rows",
      name:"쿠폰 행형",
      caption:"길이가 다른 색상 행을 계단처럼 쌓은 구성",
      bg:{ mode:"solid", role:"primary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("큰 제목", .025, .030, .815, .185, { fillRole:"secondary", padding:14, textVAlign:"center", textPreset:"heroOutline", textRoles:["headline"] }),
        R("속보 배지", .865, .030, .110, .185, { shape:"ellipse", fillRole:"tertiary", padding:12, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("기관 발표", .030, .245, .940, .060, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("첫 행", .030, .345, .940, .155, { fillRole:"paper", padding:16, textVAlign:"center", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("둘째 행", .130, .535, .840, .130, { fillRole:"tertiary", padding:14, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("셋째 행", .030, .700, .680, .120, { fillRole:"secondary", padding:12, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", .465, .850, .505, .095, { fillNone:true, padding:2, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .865, .405, .065, { fillNone:true, padding:1, textVAlign:"left", textPreset:"micro", textRoles:["micro"] })
      ],
      textSlots:[1,0,2,3,4,5,6,7]
    },
    {
      id:"photo-slot",
      name:"사진 자리형",
      caption:"오른쪽 사진 자리를 비우고 왼쪽 텍스트를 촘촘하게",
      bg:{ mode:"solid", role:"paper", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("속보 배지", .030, .035, .135, .180, { shape:"ellipse", fillRole:"tertiary", padding:14, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("큰 제목", .185, .025, .455, .205, { fillNone:true, padding:2, textVAlign:"top", textPreset:"hero", textRoles:["headline"] }),
        R("기관 발표", .030, .260, .610, .065, { fillRole:"secondary", padding:8, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("핵심 목록", .030, .365, .610, .320, { fillRole:"primary", padding:20, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("사진 자리", .680, .025, .290, .660, { fillRole:"secondary", acceptText:false, padding:0 }),
        R("짧은 강조", .680, .720, .290, .105, { fillRole:"tertiary", padding:10, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .030, .725, .230, .100, { fillRole:"secondary", padding:10, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", .285, .710, .355, .125, { fillNone:true, padding:2, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .890, .940, .055, { fillNone:true, padding:0, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[0,1,2,3,5,6,7,8]
    },
    {
      id:"small-ad",
      name:"소형 광고형",
      caption:"외곽선 안에 제목·본문·연락처를 빈틈없이 배치",
      bg:{ mode:"solid", role:"paper", pattern:"none", scale:48 },
      border:{ enabled:true, color:"#111111", width:10, radius:0 },
      regions:[
        R("속보 배지", .030, .035, .135, .165, { shape:"ellipse", fillRole:"tertiary", padding:14, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("큰 제목", .180, .030, .790, .175, { fillNone:true, padding:2, textVAlign:"center", textPreset:"hero", textRoles:["headline"] }),
        R("기관 발표", .030, .235, .940, .065, { fillRole:"secondary", padding:8, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("핵심 목록", .030, .335, .555, .285, { fillRole:"primary", padding:18, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("짧은 강조", .615, .335, .355, .170, { fillRole:"tertiary", padding:16, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .615, .535, .355, .085, { fillRole:"secondary", padding:8, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", .030, .680, .940, .150, { fillRole:"tertiary", padding:13, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .870, .940, .070, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[0,1,2,3,4,5,6,7]
    },
    {
      id:"blackout",
      name:"검정 반전형",
      caption:"검은 바탕 위 원색 제목과 두 개의 큰 정보칸",
      bg:{ mode:"solid", role:"secondary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#ffffff", width:0, radius:0 },
      regions:[
        R("큰 제목", .030, .030, .940, .285, { fillNone:true, padding:2, textVAlign:"top", textPreset:"heroOutline", textRoles:["headline"] }),
        R("속보 배지", .780, .040, .185, .200, { shape:"ellipse", fillRole:"primary", padding:18, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("기관 발표", .030, .340, .940, .065, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("왼쪽 정보", .030, .445, .560, .285, { fillRole:"tertiary", padding:20, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("오른쪽 강조", .620, .445, .350, .175, { fillRole:"paper", padding:18, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .620, .650, .350, .080, { fillRole:"primary", padding:8, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("전화 문구", .500, .785, .470, .120, { fillRole:"primary", padding:12, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .805, .430, .080, { fillNone:true, padding:1, textVAlign:"left", textPreset:"micro", textRoles:["micro"] })
      ],
      textSlots:[1,0,2,3,4,5,6,7]
    },
    {
      id:"bare-type",
      name:"무테 타이포형",
      caption:"카드와 띠 없이 글자 크기·색·작은 원만으로 구성",
      bg:{ mode:"solid", role:"primary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("배경 원", .800, -.070, .265, .315, { shape:"ellipse", fillRole:"tertiary", acceptText:false, padding:0 }),
        R("속보 배지", .030, .035, .135, .180, { fillNone:true, padding:2, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("큰 제목", .170, .025, .710, .350, { fillNone:true, padding:2, emphasis:1.70, textVAlign:"top", textPreset:"hero", textRoles:["headline"] }),
        R("기관 발표", .030, .400, .940, .065, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("핵심 목록", .030, .505, .410, .270, { fillNone:true, padding:4, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("짧은 강조", .490, .490, .480, .170, { fillNone:true, padding:4, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .560, .690, .330, .090, { fillNone:true, padding:2, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("전화 문구", .300, .825, .670, .090, { fillNone:true, padding:2, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .830, .235, .080, { fillNone:true, padding:1, textVAlign:"left", textPreset:"micro", textRoles:["micro"] })
      ],
      textSlots:[1,2,3,4,5,6,7,8]
    },
    {
      id:"headline-two-columns",
      name:"제목 아래 2칸",
      caption:"띠 없이 큰 제목 아래 넓은 칸과 좁은 칸 배치",
      bg:{ mode:"solid", role:"tertiary", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("속보 배지", .030, .040, .140, .195, { shape:"ellipse", fillRole:"secondary", padding:16, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("큰 제목", .205, .030, .765, .260, { fillNone:true, padding:2, textVAlign:"top", textPreset:"heroOutline", textRoles:["headline"] }),
        R("기관 발표", .030, .315, .940, .060, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("왼쪽 목록", .030, .415, .585, .315, { fillRole:"paper", padding:20, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("오른쪽 강조", .645, .415, .325, .190, { fillRole:"primary", padding:18, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .645, .640, .325, .090, { fillRole:"secondary", padding:8, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("전화 문구", .560, .790, .410, .120, { fillRole:"primary", padding:12, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .810, .490, .080, { fillNone:true, padding:1, textVAlign:"left", textPreset:"micro", textRoles:["micro"] })
      ],
      textSlots:[0,1,2,3,4,5,6,7]
    },
    {
      id:"top-bottom-stack",
      name:"상하 3단형",
      caption:"위쪽 제목과 아래쪽 세 칸을 단단하게 압축한 구성",
      bg:{ mode:"solid", role:"paper", pattern:"none", scale:48 },
      border:{ enabled:false, color:"#111111", width:0, radius:0 },
      regions:[
        R("속보 배지", .030, .030, .170, .145, { fillRole:"tertiary", padding:12, textVAlign:"center", textPreset:"badgeOutline", textRoles:["tag"] }),
        R("큰 제목", .030, .195, .940, .250, { fillNone:true, padding:2, textVAlign:"top", textPreset:"hero", textRoles:["headline"] }),
        R("기관 발표", .230, .045, .740, .115, { fillRole:"secondary", padding:10, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] }),
        R("핵심 목록", .030, .495, .390, .285, { fillRole:"primary", padding:18, textVAlign:"top", textPreset:"bulletDense", textRoles:["bullet"] }),
        R("짧은 강조", .455, .495, .215, .285, { fillRole:"secondary", padding:16, textVAlign:"center", textPreset:"bodyDisplay", textRoles:["callout"] }),
        R("수치 배지", .705, .495, .265, .140, { fillRole:"tertiary", padding:14, textVAlign:"center", textPreset:"badge", textRoles:["tag"] }),
        R("전화 문구", .705, .665, .265, .115, { fillRole:"primary", padding:10, textVAlign:"center", textPreset:"hotline", textRoles:["footer"] }),
        R("주의 문구", .030, .835, .940, .075, { fillNone:true, padding:1, textVAlign:"center", textPreset:"microCenter", textRoles:["micro"] })
      ],
      textSlots:[0,1,2,3,4,5,6,7]
    }
  ];
  function makeText(text, overrides = {}) {
    return {
      id: uid(), text, regionId: null, order: 0, role: "body", roleHint: null, sample: false,
      styleMode: "auto", regionLocked: false, manualProtected: false,
      fontFamily: "pretendard", fontWeight: 780, fontSize: 54, align: "left",
      bold: true, italic: false, underline: false, strike: false,
      scaleX: 1, scaleY: 1, autoNoWrap: false, letterSpacing: -1, lineHeight: 1.08,
      effect: "none", effects: [], outlineWidth: 3,
      colorMode: "auto", color: "#ffffff", effectColor: "#111111",
      gap: 12, unicodeStyle: "none", customUnicode: "★", unicodePlacement: "word",
      prefixEnabled: false, prefixSymbol: "•", prefixGap: 12,
      rangeColors: [], rangeBackgrounds: [], rangeUnicodes: [], manualX: null, manualY: null, manualScale: 1,
      ...overrides
    };
  }

  function makeElement(type, x, y, options = {}) {
    const defaults = type === "band" ? { w: 1320, h: 120 } : type === "circle" ? { w: 260, h: 260 } : { w: 360, h: 240 };
    return {
      id: uid(), type, x, y, w: defaults.w, h: defaults.h,
      fill: "#f4e900", fillNone: false, stroke: "#111111", strokeNone: false, strokeWidth: 4,
      radius: type === "band" ? 0 : 0, rotation: 0,
      bandScope: type === "band" ? "canvas" : null, bandRegionId: null, bandPosition: .5,
      flowMargin: 0, affectFlow: true,
      effect: "none", effects: [], effectColor: "#111111", effectSize: 20,
      clipRegionId: null, alphaBounds: null, alphaMask: null,
      label: "", labelSize: 72, labelColor: "#111111", imageFit: "contain", imageSrc: null,
      ...options
    };
  }

  const initialState = {
    schemaVersion: 21,
    theme: "light",
    orientation: "landscape",
    artboard: { preset: "flyer", widthMm: 180, heightMm: 100 },
    bleedMm: 0,
    pageMargin: 28,
    regionGapX: 0,
    regionGapY: 0,
    regionGapReduction: 32,
    templateId: "dense-left-rail",
    palette: {
      primary: "#ffd400", secondary: "#111111", tertiary: "#e62d20",
      secondaryEnabled: true, tertiaryEnabled: true, useBackground: true, useWhite: true, useBlack: true, paperMix: 78,
      roleOrder: ["primary", "secondary", "tertiary"]
    },
    background: { mode:"solid", c1:"#ffd400", c2:"#ffd400", pattern:"none", patternColor:"#e62d20", angle:0, scale:48 },
    regions: [],
    elements: [],
    texts: [],
    posterBorder: { enabled:false, color:"#111111", width:12, radius:0 },
    selectedTextId: null,
    selectedRegionId: null,
    selectedElementId: null,
    jpgQuality: .92,
    showRegions: false,
    activeTool: "templates",
    previewZoom: 1,
    previewFit: true,
    previewBackgroundMode: "black",
    previewBackground: "#1b1f25"
  };

  let state = deepClone(initialState);
  let layoutFragments = [];
  let regionHitBoxes = [];
  let elementHitBoxes = [];
  let dragState = null;
  let transformTarget = null;
  let longPressTimer = null;
  let pendingLongPress = null;
  let autoArrangeTimer = null;
  let activeTextarea = null;
  let renderQueued = false;
  let fontsReady = false;
  let toastTimer = null;
  let unicodeTarget = null;
  const imageCache = new Map();
  const colorFields = [];
  const staticNumericControllers = new Map();
  const itemNumericDefaults = new Map();
  const textNumericDefaults = new Map();
  const textEditorTabs = new Map();
  const globalNumericDefaults = {
    bleedMm: 0,
    artboardWidthMm: 180,
    artboardHeightMm: 100,
    pageMargin: 28,
    regionGapX: 0,
    regionGapY: 0,
    palettePaperMix: 78,
    regionGapReduction: 32,
    gradientAngle: 0,
    patternScale: 48,
    posterBorderWidth: 12,
    posterBorderRadius: 0,
    jpgQuality: 92
  };

  const HISTORY_LIMIT = 80;
  let historyPast = [];
  let historyFuture = [];
  let historyLastSnapshot = "";
  let historyTimer = null;
  let historyReady = false;
  let historyRestoring = false;
  let historyInteractionDepth = 0;

  const PERSIST_DB_NAME = "jjirasi-maker-document";
  const PERSIST_STORE_NAME = "documents";
  const PERSIST_KEY = "current";
  let persistTimer = null;
  let persistDisabled = false;

  function persistedStatePayload() {
    const documentState = deepClone(state);
    documentState.elements?.forEach((element) => {
      delete element.alphaMask;
    });
    return documentState;
  }

  function openPersistDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(PERSIST_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PERSIST_STORE_NAME)) db.createObjectStore(PERSIST_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    });
  }

  async function persistStateNow() {
    if (persistDisabled || historyRestoring) return;
    const payload = persistedStatePayload();
    try {
      const db = await openPersistDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(PERSIST_STORE_NAME, "readwrite");
        tx.objectStore(PERSIST_STORE_NAME).put(payload, PERSIST_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error("IndexedDB save failed"));
      });
      db.close();
    } catch (error) {
      try {
        localStorage.setItem("jjirasi-maker-state", JSON.stringify(payload));
      } catch {
        persistDisabled = true;
      }
    }
  }

  function schedulePersistState() {
    if (persistDisabled || historyRestoring) return;
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistStateNow, 420);
  }

  async function restorePersistedState() {
    let saved = null;
    try {
      const db = await openPersistDb();
      saved = await new Promise((resolve, reject) => {
        const tx = db.transaction(PERSIST_STORE_NAME, "readonly");
        const request = tx.objectStore(PERSIST_STORE_NAME).get(PERSIST_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("IndexedDB read failed"));
      });
      db.close();
    } catch {
      try { saved = JSON.parse(localStorage.getItem("jjirasi-maker-state") || "null"); } catch { saved = null; }
    }
    if (!saved || !Array.isArray(saved.regions) || !Array.isArray(saved.texts)) return false;
    state = saved;
    ensureStateCompatibility();
    return true;
  }

  function snapshotState() {
    const documentState = deepClone(state);
    // Selection and guide visibility are view state, not undoable design data.
    delete documentState.selectedTextId;
    delete documentState.selectedRegionId;
    delete documentState.selectedElementId;
    delete documentState.showRegions;
    return JSON.stringify(documentState);
  }

  function updateHistoryButtons() {
    const undo = $("undoBtn");
    const redo = $("redoBtn");
    if (undo) undo.disabled = historyPast.length === 0;
    if (redo) redo.disabled = historyFuture.length === 0;
  }

  function initializeHistory() {
    clearTimeout(historyTimer);
    historyPast = [];
    historyFuture = [];
    historyLastSnapshot = snapshotState();
    historyReady = true;
    updateHistoryButtons();
  }

  function commitHistorySnapshot() {
    if (!historyReady || historyRestoring) return;
    clearTimeout(historyTimer);
    historyTimer = null;
    const next = snapshotState();
    if (!historyLastSnapshot) {
      historyLastSnapshot = next;
      updateHistoryButtons();
      return;
    }
    if (next === historyLastSnapshot) {
      updateHistoryButtons();
      return;
    }
    historyPast.push(historyLastSnapshot);
    if (historyPast.length > HISTORY_LIMIT) historyPast.shift();
    historyLastSnapshot = next;
    historyFuture = [];
    updateHistoryButtons();
  }

  function beginHistoryInteraction() {
    if (historyInteractionDepth === 0) clearTimeout(historyTimer);
    historyInteractionDepth += 1;
  }

  function endHistoryInteraction({ commit = true } = {}) {
    historyInteractionDepth = Math.max(0, historyInteractionDepth - 1);
    if (historyInteractionDepth === 0 && commit) commitHistorySnapshot();
  }

  function markHistoryDirty(immediate = false) {
    if (!historyReady || historyRestoring || historyInteractionDepth > 0) return;
    clearTimeout(historyTimer);
    if (immediate) commitHistorySnapshot();
    else historyTimer = setTimeout(commitHistorySnapshot, 520);
  }

  function restoreHistorySnapshot(snapshot) {
    historyRestoring = true;
    try {
      const viewState = {
        selectedTextId: state.selectedTextId,
        selectedRegionId: state.selectedRegionId,
        selectedElementId: state.selectedElementId,
        showRegions: state.showRegions
      };
      state = JSON.parse(snapshot);
      state.selectedTextId = state.texts.some((item) => item.id === viewState.selectedTextId) ? viewState.selectedTextId : (state.texts[0]?.id || null);
      state.selectedRegionId = state.regions.some((item) => item.id === viewState.selectedRegionId) ? viewState.selectedRegionId : null;
      state.selectedElementId = state.elements.some((item) => item.id === viewState.selectedElementId) ? viewState.selectedElementId : null;
      state.showRegions = Boolean(viewState.showRegions);
      layoutFragments = [];
      regionHitBoxes = [];
      elementHitBoxes = [];
      dragState = null;
      transformTarget = null;
      pendingLongPress = null;
      if (autoArrangeTimer) clearTimeout(autoArrangeTimer);
      refreshAllUI();
      syncStaticNumericFields();
      const show = $("showRegions");
      if (show) show.checked = Boolean(state.showRegions);
      queueRender();
    } finally {
      historyRestoring = false;
    }
  }

  function undoHistory() {
    if (!historyReady) return;
    commitHistorySnapshot();
    if (!historyPast.length) return;
    const current = historyLastSnapshot || snapshotState();
    const target = historyPast.pop();
    historyFuture.push(current);
    historyLastSnapshot = target;
    restoreHistorySnapshot(target);
    updateHistoryButtons();
    toast("실행취소했습니다.");
  }

  function redoHistory() {
    if (!historyReady || !historyFuture.length) return;
    clearTimeout(historyTimer);
    const target = historyFuture.pop();
    if (historyLastSnapshot) historyPast.push(historyLastSnapshot);
    if (historyPast.length > HISTORY_LIMIT) historyPast.shift();
    historyLastSnapshot = target;
    restoreHistorySnapshot(target);
    updateHistoryButtons();
    toast("재실행했습니다.");
  }

  function dimensions() {
    const widthMm = clamp(Number(state.artboard?.widthMm) || 180, 50, 420);
    const heightMm = clamp(Number(state.artboard?.heightMm) || 100, 50, 420);
    const trimW = Math.max(320, Math.round(widthMm * PX_PER_MM));
    const trimH = Math.max(320, Math.round(heightMm * PX_PER_MM));
    const bleed = Math.round((Number(state.bleedMm) || 0) * PX_PER_MM);
    return { trimW, trimH, bleed, fullW: trimW + bleed * 2, fullH: trimH + bleed * 2, widthMm, heightMm };
  }

  function resolveColor(item, prop) {
    const role = item[`${prop}Role`];
    return role ? paletteColor(role, state.palette) : item[prop];
  }

  function selectedText() { return state.texts.find((x) => x.id === state.selectedTextId) || null; }
  function selectedRegion() { return state.regions.find((x) => x.id === state.selectedRegionId) || null; }
  function selectedElement() { return state.elements.find((x) => x.id === state.selectedElementId) || null; }

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function rgbToHsv({ r, g, b }) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === rn) h = 60 * (((gn - bn) / d) % 6);
      else if (max === gn) h = 60 * ((bn - rn) / d + 2);
      else h = 60 * ((rn - gn) / d + 4);
    }
    if (h < 0) h += 360;
    return { h, s: max === 0 ? 0 : d / max, v: max };
  }

  function hsvToRgb({ h, s, v }) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60) [rp,gp,bp] = [c,x,0];
    else if (h < 120) [rp,gp,bp] = [x,c,0];
    else if (h < 180) [rp,gp,bp] = [0,c,x];
    else if (h < 240) [rp,gp,bp] = [0,x,c];
    else if (h < 300) [rp,gp,bp] = [x,0,c];
    else [rp,gp,bp] = [c,0,x];
    return { r:(rp+m)*255, g:(gp+m)*255, b:(bp+m)*255 };
  }

  function hsvToHex(hsv) { return rgbToHex(hsvToRgb(hsv)); }
  function rgbToHsl({ r, g, b }) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === rn) h = 60 * (((gn - bn) / d) % 6);
      else if (max === gn) h = 60 * ((bn - rn) / d + 2);
      else h = 60 * ((rn - gn) / d + 4);
    }
    if (h < 0) h += 360;
    const l = (max + min) / 2;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return { h, s: sat, l };
  }
  function rgbToCmyk({ r, g, b }) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const k = 1 - Math.max(rn, gn, bn);
    if (k >= .9999) return { c: 0, m: 0, y: 0, k: 1 };
    return {
      c: (1 - rn - k) / (1 - k),
      m: (1 - gn - k) / (1 - k),
      y: (1 - bn - k) / (1 - k),
      k
    };
  }
  function isHex(value) { return /^#[0-9a-f]{6}$/i.test(String(value || "")); }

  function closeColorFields(except = null) {
    document.querySelectorAll(".color-field.open").forEach((root) => {
      if (root === except) return;
      root.classList.remove("open");
      root.querySelector(".color-trigger")?.setAttribute("aria-expanded", "false");
      root.closest(".field-grid")?.classList.remove("picker-expanded");
    });
  }

  function createColorPickerNode(getter, setter, { allowNone = true, onCommit = null } = {}) {
    const root = document.createElement("div");
    root.className = "color-field";
    root.innerHTML = `
      <button type="button" class="color-trigger" aria-expanded="false">
        <span class="color-swatch"></span>
        <span class="color-trigger-copy"><small>색상</small><strong></strong></span>
        <span class="color-chevron">⌄</span>
      </button>
      <div class="color-popover">
        <div class="color-picker-top">
          <span class="color-preview"></span>
          <div><strong class="color-picker-title">직접 선택</strong><small class="color-picker-value"></small></div>
          ${allowNone ? '<button type="button" class="color-none-button">색 없음</button>' : ''}
        </div>
        <div class="sv-plane" role="slider" aria-label="채도와 밝기" tabindex="0"><span class="sv-cursor"></span></div>
        <div class="hue-strip" role="slider" aria-label="색상" tabindex="0"><span class="hue-cursor"></span></div>
        <div class="color-value-grid">
          <label class="color-hex-field"><span>HEX</span><span class="color-hex-row"><input class="color-hex" type="text" maxlength="7" inputmode="text" /><button type="button" class="color-copy-button" title="HEX 복사" aria-label="HEX 복사">복사</button></span></label>
          <div class="color-readout"><small>RGB</small><strong class="color-rgb"></strong></div>
          <div class="color-readout"><small>CMYK</small><strong class="color-cmyk"></strong></div>
          <div class="color-readout"><small>HSV</small><strong class="color-hsv"></strong></div>
          <div class="color-readout"><small>HSL</small><strong class="color-hsl"></strong></div>
        </div>
        <div class="quick-swatches" aria-label="빠른 색상"></div>
      </div>`;

    const trigger = root.querySelector(".color-trigger");
    const swatch = root.querySelector(".color-swatch");
    const label = root.querySelector(".color-trigger-copy strong");
    const preview = root.querySelector(".color-preview");
    const valueLabel = root.querySelector(".color-picker-value");
    const svPlane = root.querySelector(".sv-plane");
    const svCursor = root.querySelector(".sv-cursor");
    const hueStrip = root.querySelector(".hue-strip");
    const hueCursor = root.querySelector(".hue-cursor");
    const hex = root.querySelector(".color-hex");
    const rgbReadout = root.querySelector(".color-rgb");
    const cmykReadout = root.querySelector(".color-cmyk");
    const hsvReadout = root.querySelector(".color-hsv");
    const hslReadout = root.querySelector(".color-hsl");
    const copyBtn = root.querySelector(".color-copy-button");
    const noneBtn = root.querySelector(".color-none-button");
    const swatches = root.querySelector(".quick-swatches");
    let hsv = { h: 44, s: .99, v: .99 };
    let lastColor = "#FCBA03";

    function commit(value) {
      setter(value);
      update();
      if (onCommit) onCommit(value);
      queueRender();
    }

    function update() {
      const value = getter();
      const none = !value || value === "none";
      if (!none && isHex(value)) {
        lastColor = String(value).toUpperCase();
        const next = rgbToHsv(hexToRgb(value));
        if (next.s > .001) hsv.h = next.h;
        hsv.s = next.s;
        hsv.v = next.v;
      }
      const display = none ? "없음" : lastColor;
      const checker = "repeating-conic-gradient(#d7d9df 0 25%, #777b86 0 50%) 50%/10px 10px";
      swatch.style.background = none ? checker : lastColor;
      preview.style.background = none ? checker : lastColor;
      label.textContent = display;
      valueLabel.textContent = none ? "채우기/선 사용 안 함" : lastColor;
      hex.value = none ? "none" : lastColor;
      svPlane.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`;
      svCursor.style.left = `${hsv.s * 100}%`;
      svCursor.style.top = `${(1 - hsv.v) * 100}%`;
      hueCursor.style.left = `${(hsv.h / 360) * 100}%`;
      const rgb = hexToRgb(lastColor);
      const hsl = rgbToHsl(rgb);
      const cmyk = rgbToCmyk(rgb);
      rgbReadout.textContent = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
      cmykReadout.textContent = `${Math.round(cmyk.c*100)}%, ${Math.round(cmyk.m*100)}%, ${Math.round(cmyk.y*100)}%, ${Math.round(cmyk.k*100)}%`;
      hsvReadout.textContent = `${Math.round(hsv.h)}°, ${Math.round(hsv.s*100)}%, ${Math.round(hsv.v*100)}%`;
      hslReadout.textContent = `${Math.round(hsl.h)}°, ${Math.round(hsl.s*100)}%, ${Math.round(hsl.l*100)}%`;
      trigger.setAttribute("aria-expanded", String(root.classList.contains("open")));
    }

    function updateSV(event) {
      const rect = svPlane.getBoundingClientRect();
      hsv.s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      hsv.v = 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1);
      commit(hsvToHex(hsv));
    }

    function updateHue(event) {
      const rect = hueStrip.getBoundingClientRect();
      hsv.h = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360;
      commit(hsvToHex(hsv));
    }

    function bindPointerSurface(node, handler) {
      node.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        node.setPointerCapture(event.pointerId);
        handler(event);
      });
      node.addEventListener("pointermove", (event) => {
        if (node.hasPointerCapture(event.pointerId)) handler(event);
      });
    }

    QUICK_COLORS.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quick-swatch";
      btn.style.background = color;
      btn.title = color;
      btn.addEventListener("click", () => commit(color));
      swatches.append(btn);
    });

    trigger.addEventListener("click", () => {
      const opening = !root.classList.contains("open");
      closeColorFields(root);
      root.classList.toggle("open", opening);
      root.closest(".field-grid")?.classList.toggle("picker-expanded", opening);
      update();
    });
    bindPointerSurface(svPlane, updateSV);
    bindPointerSurface(hueStrip, updateHue);
    function commitHexInput() {
      const value = hex.value.trim();
      if (allowNone && value.toLowerCase() === "none") return commit("none");
      if (isHex(value)) return commit(value.toUpperCase());
      update();
      toast("색상은 #RRGGBB 형식으로 입력하세요.");
    }
    hex.addEventListener("change", commitHexInput);
    hex.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); commitHexInput(); }
    });
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(lastColor);
      } catch {
        const helper = document.createElement("textarea");
        helper.value = lastColor;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.append(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      toast(`${lastColor} 복사됨`);
    });
    noneBtn?.addEventListener("click", () => commit("none"));

    const api = { root, update };
    update();
    return api;
  }

  function createColorField(hostId, getter, setter, options = {}) {
    const host = $(hostId);
    if (!host) return null;
    const api = createColorPickerNode(getter, setter, options);
    host.replaceChildren(api.root);
    colorFields.push(api);
    return api;
  }

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".color-field")) closeColorFields();
  });


  function cloneTemplateRegion(spec, W, H) {
    const region = deepClone(spec);
    region.id = uid();
    region.x = Math.round(spec.x * W);
    region.y = Math.round(spec.y * H);
    region.w = Math.round(spec.w * W);
    region.h = Math.round(spec.h * H);
    region.layoutBase = { x: region.x, y: region.y, w: region.w, h: region.h };
    region.layoutDetached = false;
    region.layoutManualDelta = null;
    return region;
  }

  const ROLE_STYLE_DEFAULTS = {
    headline: { fontFamily:"dotum", fontSize:88, align:"left", bold:true, italic:false, lineHeight:.94, scaleX:.94, letterSpacing:-3, effect:"none", outlineWidth:4, colorMode:"auto", gap:4 },
    bullet: { fontFamily:"dotum", fontSize:46, align:"left", bold:true, italic:false, lineHeight:1.03, scaleX:.98, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:4 },
    callout: { fontFamily:"dotum", fontSize:54, align:"center", bold:true, italic:false, lineHeight:.96, scaleX:.98, letterSpacing:-2, effect:"outline", outlineWidth:2, colorMode:"auto", gap:3 },
    body: { fontFamily:"dotum", fontSize:45, align:"left", bold:true, italic:false, lineHeight:1.02, scaleX:.96, letterSpacing:-2, effect:"none", outlineWidth:2, colorMode:"auto", gap:4 },
    footer: { fontFamily:"dotum", fontSize:48, align:"center", bold:true, italic:false, lineHeight:.94, scaleX:.98, letterSpacing:-2, effect:"none", outlineWidth:2, colorMode:"auto", gap:3 },
    tag: { fontFamily:"dotum", fontSize:34, align:"center", bold:true, italic:false, lineHeight:.92, scaleX:1.02, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:2 },
    micro: { fontFamily:"dotum", fontSize:25, align:"center", bold:true, italic:false, lineHeight:.98, scaleX:.94, letterSpacing:-1, effect:"none", outlineWidth:1, colorMode:"auto", gap:2 }
  };

  function applyRoleStyle(text, role) {
    const keep = {
      unicodeStyle: text.unicodeStyle,
      customUnicode: text.customUnicode,
      unicodePlacement: text.unicodePlacement || "word",
      prefixEnabled: text.prefixEnabled,
      prefixSymbol: text.prefixSymbol,
      prefixGap: text.prefixGap,
      rangeColors: text.rangeColors,
      rangeBackgrounds: text.rangeBackgrounds,
      rangeUnicodes: text.rangeUnicodes
    };
    Object.assign(text, ROLE_STYLE_DEFAULTS[role] || ROLE_STYLE_DEFAULTS.body, keep);
  }


  function hashString(value) {
    let hash = 2166136261;
    for (const ch of String(value || "")) {
      hash ^= ch.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function textFacts(text) {
    const raw = String(text.text || "").trim();
    const lines = raw ? raw.split("\n") : [""];
    const compact = [...raw.replace(/\s/g, "")].length;
    const words = raw.split(/\s+/).filter(Boolean).length;
    const hasBullet = lines.filter(Boolean).length >= 2 && lines.filter(Boolean).every((line) => /^[•◦▪▫■□●○◆◇★☆♥♡☎☏✆※!\-*]/.test(line.trim()));
    const hasContact = /☎|☏|✆|전화|문의|상담|연락|접수|예약|@/.test(raw);
    return { raw, lines, compact, words, hasBullet, hasContact };
  }

  function inferTextRole(text, index = 0) {
    if (text.roleHint && ROLE_STYLE_DEFAULTS[text.roleHint]) return text.roleHint;
    const facts = textFacts(text);
    if (facts.hasContact) return "footer";
    if (/^[※＊*]|부작용|주의|참고/.test(facts.raw) && facts.compact >= 24) return "micro";
    if (facts.hasBullet) return "bullet";
    if (facts.compact <= 5 && facts.lines.length === 1) return "tag";
    if (index === 0 && facts.compact >= 12) return "headline";
    if (facts.compact <= 18 && facts.lines.length <= 2) return "callout";
    if (facts.lines.length >= 3 && facts.compact <= 80) return "bullet";
    if (facts.compact >= 82) return "micro";
    if (index === 0) return "headline";
    return "body";
  }

  function regionTextScore(region, role, facts, occupied) {
    const box = regionContentBox(region);
    const area = box.w * box.h;
    const aspect = box.w / Math.max(1, box.h);
    const potential = Math.sqrt(area / Math.max(5, facts.compact + facts.lines.length * 5));
    const roleTarget = { headline: 102, body: 55, bullet: 52, callout: 72, footer: 54, tag: 58, micro: 28 }[role] || 54;
    let score = 82 - Math.abs(potential - roleTarget) * .34;
    const hints = region.textRoles || [];
    if (hints.includes(role)) score += 96 - hints.indexOf(role) * 10;
    if (region.shape === "ellipse" || region.shape === "burst") {
      score += ["callout", "tag"].includes(role) ? 54 : -108;
      if (facts.compact > 34) score -= 90;
    }
    if (aspect > 5.0) score += ["headline", "footer", "tag", "callout", "micro"].includes(role) ? 38 : -30;
    if (aspect < .78) score += ["tag", "callout"].includes(role) ? 22 : -26;
    if (role === "micro") {
      score += aspect > 4.4 ? 62 : -18;
      score += area < 150000 ? 20 : -12;
    }
    if (role === "body" && area > 150000) score += 22;
    if (role === "headline" && (region.y < dimensions().trimH * .34 || area > 170000)) score += 24;
    if (role === "footer" && region.y > dimensions().trimH * .62) score += 34;
    score += (Number(region.emphasis) || 1) * 18;
    if (occupied > 0) score -= area > 250000 ? 180 : 290;
    if (occupied > 1) score -= 460 * occupied;
    return score;
  }

  function setAutomaticAccentRanges(text, role, region, baseColor) {
    if (text.styleMode === "manual") return;
    text.rangeColors = [];
    if (!["headline", "callout", "tag", "footer"].includes(role)) return;
    const regionBg = region.fillNone ? state.background.c1 : resolveColor(region, "fill");
    const accent = bestAccentColor(regionBg, baseColor);
    const patterns = [/수달/g, /심장/g, /압수/g, /입덕/g, /속보/g, /귀여움/g, /98\.7%/g, /조개/g, /돌/g, /무직/g];
    let count = 0;
    for (const pattern of patterns) {
      for (const match of String(text.text || "").matchAll(pattern)) {
        text.rangeColors.push({ start: match.index, end: match.index + match[0].length, color: accent });
        count += 1;
        if (count >= 2) return;
      }
    }
  }

  function regionAutoTextStyle(region, role) {
    const preset = region?.textPreset ? REGION_TEXT_PRESETS[region.textPreset] : null;
    const shared = region?.textStyle || null;
    const roleSpecific = region?.roleStyles?.[role] || null;
    if (!preset && !shared && !roleSpecific) return null;
    return { ...(preset || {}), ...(shared || {}), ...(roleSpecific || {}) };
  }

  function applyRegionAutoTextStyle(text, role, region) {
    const style = regionAutoTextStyle(region, role);
    text.autoFontCap = null;
    text.autoFontScale = 1;
    text.autoGapScale = 1;
    if (!style) return null;

    const special = new Set(["fontCap", "fontScale", "gapScale", "colorRole", "effectColorRole", "accentWords"]);
    Object.entries(style).forEach(([key, value]) => {
      if (!special.has(key) && value !== undefined) text[key] = value;
    });
    text.autoFontCap = Number(style.fontCap) || null;
    text.autoFontScale = Number(style.fontScale) || 1;
    text.autoGapScale = Number(style.gapScale) || 1;
    if (style.colorRole) {
      if (style.colorRole === "auto") text.colorMode = "auto";
      else {
        text.colorMode = "manual";
        text.color = paletteColor(style.colorRole, state.palette);
      }
    }
    if (style.effectColorRole) text.effectColor = paletteColor(style.effectColorRole, state.palette);
    return style;
  }

  function autoDecoration(text, role, region) {
    const facts = textFacts(text);
    const seed = hashString(String(text.id));
    const regionBg = region.fillNone ? state.background.c1 : resolveColor(region, "fill");
    const baseColor = contrastText(regionBg);
    const accent = bestAccentColor(regionBg, baseColor);
    text.bold = role !== "micro" || seed % 4 !== 0;
    text.italic = false;
    text.underline = false;
    text.strike = false;
    text.colorMode = "auto";
    text.effectColor = accent;
    text.prefixEnabled = false;
    text.prefixGap = 7;
    text.customUnicode = ["★", "※", "◆", "☎"][seed % 4];
    text.autoFontCap = null;
    text.autoFontScale = 1;
    text.autoGapScale = 1;

    if (role === "headline") {
      text.fontFamily = "dotum";
      text.align = "left";
      text.lineHeight = facts.lines.length > 1 ? .90 : .86;
      text.scaleX = facts.compact < 22 ? 1.02 : .92;
      text.letterSpacing = facts.compact < 22 ? -2 : -4;
      text.unicodeStyle = "none";
      text.effect = "none";
      text.outlineWidth = 0;
    } else if (role === "callout") {
      text.fontFamily = "dotum";
      text.align = region.w / Math.max(1, region.h) > 3.7 ? "left" : "center";
      text.lineHeight = .92;
      text.scaleX = facts.compact <= 12 ? 1.08 : .96;
      text.letterSpacing = facts.compact <= 12 ? -1 : -3;
      text.unicodeStyle = facts.compact <= 12 && seed % 4 === 0 ? "wrapQuote" : "none";
      text.effect = facts.compact <= 8 && seed % 3 === 0 ? "outline" : "none";
      text.outlineWidth = 2;
    } else if (role === "tag") {
      text.fontFamily = "dotum";
      text.align = "center";
      text.lineHeight = .88;
      text.scaleX = facts.compact <= 6 ? 1.10 : .98;
      text.letterSpacing = -1;
      text.unicodeStyle = "none";
      text.effect = "none";
      text.outlineWidth = 0;
    } else if (role === "bullet") {
      text.fontFamily = "dotum";
      text.align = "left";
      text.lineHeight = 1.01;
      text.scaleX = .96;
      text.letterSpacing = -2;
      text.unicodeStyle = "none";
      text.prefixEnabled = !facts.hasBullet;
      text.prefixSymbol = ["•", "■", "★", "♥"][seed % 4];
      text.effect = "none";
      text.outlineWidth = 0;
    } else if (role === "footer") {
      text.fontFamily = "dotum";
      text.align = "center";
      text.lineHeight = .90;
      text.scaleX = .96;
      text.letterSpacing = -2;
      text.unicodeStyle = /☎|☏|✆/.test(facts.raw) ? "none" : "wrapPhone";
      text.effect = "none";
      text.outlineWidth = 0;
    } else if (role === "micro") {
      text.fontFamily = "dotum";
      text.align = region.w / Math.max(1, region.h) > 3.8 ? "center" : "left";
      text.lineHeight = 1.08;
      text.scaleX = .90;
      text.letterSpacing = -1;
      text.unicodeStyle = "none";
      text.effect = "none";
      text.outlineWidth = 0;
    } else {
      text.fontFamily = seed % 7 === 0 ? "batang" : "dotum";
      text.align = "left";
      text.lineHeight = facts.lines.length >= 3 ? 1.03 : .99;
      text.scaleX = .95;
      text.letterSpacing = -2;
      text.unicodeStyle = "none";
      text.effect = "none";
      text.outlineWidth = 0;
    }

    const regionStyle = applyRegionAutoTextStyle(text, role, region);
    text.rangeColors = [];
    const accentWords = regionStyle
      ? (regionStyle.accentWords ?? ["hero", "heroShadow", "heroOutline"].includes(region.textPreset))
      : true;
    if (accentWords) setAutomaticAccentRanges(text, role, region, baseColor);
  }

  function fitTextFontSize(c, text, box, targetHeight, role, emphasis = 1) {
    const caps = { headline: 228, callout: 180, tag: 132, bullet: 98, footer: 168, body: 112, micro: 50 };
    const cap = Number(text.autoFontCap) || caps[role] || 104;
    const styleScale = clamp(Number(text.autoFontScale) || 1, .55, 1.8);
    let low = 12;
    let high = Math.max(18, Math.min(cap, box.h * .96, box.w * .54) * clamp(emphasis, .70, 1.62) * styleScale);
    const fits = (size) => {
      const lines = layoutTextLines(c, text, size, box.w);
      const height = Math.max(size * text.lineHeight, lines.length * size * text.lineHeight);
      const widest = Math.max(1, ...lines.map((line) => line.width * text.scaleX));
      return height <= targetHeight + 1 && widest <= box.w + 1;
    };
    for (let i = 0; i < 13; i++) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid; else high = mid;
    }
    return Math.max(12, Math.floor(low));
  }

  function autoStyleAssignedTexts({ force = false } = {}) {
    const groups = new Map();
    state.texts.forEach((text, index) => {
      text.autoRole = inferTextRole(text, index);
      text.role = text.autoRole;
      if (!groups.has(text.regionId)) groups.set(text.regionId, []);
      groups.get(text.regionId).push(text);
    });

    groups.forEach((texts, regionId) => {
      const region = state.regions.find((item) => item.id === regionId);
      if (!region) return;
      const box = regionContentBox(region);
      const styled = texts.filter((text) => force || text.styleMode !== "manual");
      if (!styled.length) return;
      const weights = styled.map((text) => {
        const facts = textFacts(text);
        const role = text.autoRole || "body";
        const factor = { headline: 1.42, callout: 1.12, tag: .72, bullet: 1.02, footer: .88, body: 1.06, micro: .58 }[role] || 1;
        const shortBoost = facts.compact <= 14 ? 1.34 : facts.compact <= 26 ? 1.16 : 1;
        return clamp(Math.sqrt(facts.compact + 8) * factor * shortBoost, 2.5, 14);
      });
      const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
      const gapBudget = Math.max(0, styled.length - 1) * 5;
      styled.forEach((text, index) => {
        const role = text.autoRole || "body";
        autoDecoration(text, role, region);
        const targetHeight = styled.length === 1
          ? box.h
          : Math.max(36, (box.h - gapBudget) * weights[index] / totalWeight);
        const facts = textFacts(text);
        const emphasis = (Number(region.emphasis) || 1) * (facts.compact <= 14 ? 1.18 : 1);
        text.fontSize = fitTextFontSize(sceneCtx, text, box, targetHeight, role, emphasis);
        text.gap = Math.round(clamp(text.fontSize * .065 * (Number(text.autoGapScale) || 1), 1, 10));
      });
    });
  }

  function autoArrangeTexts({ reassign = true, forceStyle = false, announce = false } = {}) {
    const regions = state.regions.filter((region) => region.acceptText && region.shape !== "line");
    if (!regions.length) return;
    if (reassign) {
      const validIds = new Set(regions.map((region) => region.id));
      const occupancy = new Map(regions.map((region) => [region.id, 0]));
      const locked = state.texts.filter((text) => text.regionLocked && validIds.has(text.regionId));
      locked.forEach((text) => {
        text.order = occupancy.get(text.regionId) || 0;
        occupancy.set(text.regionId, text.order + 1);
      });
      const ranked = state.texts.filter((text) => !locked.includes(text)).map((text, index) => {
        const role = inferTextRole(text, state.texts.indexOf(text));
        const facts = textFacts(text);
        const priority = ({ headline: 190, footer: 170, bullet: 145, callout: 135, tag: 125, body: 118, micro: 90 }[role] || 100) + Math.min(facts.compact, 60);
        return { text, index, role, facts, priority };
      }).sort((a, b) => b.priority - a.priority);

      ranked.forEach(({ text, role, facts }) => {
        let best = regions[0];
        let bestScore = -Infinity;
        regions.forEach((region) => {
          const occupied = occupancy.get(region.id) || 0;
          const score = regionTextScore(region, role, facts, occupied);
          if (score > bestScore) { best = region; bestScore = score; }
        });
        text.regionId = best.id;
        text.order = occupancy.get(best.id) || 0;
        text.manualX = null;
        text.manualY = null;
        text.autoRole = role;
        occupancy.set(best.id, text.order + 1);
      });
      normalizeTextOrders();
    }
    autoStyleAssignedTexts({ force: forceStyle });
    if (announce) toast("문장 길이와 영역을 다시 계산해 자동 정리했습니다.");
  }

  function scheduleAutoArrange({ reassign = true, refreshControls = false } = {}) {
    clearTimeout(autoArrangeTimer);
    autoArrangeTimer = setTimeout(() => {
      autoArrangeTexts({ reassign, forceStyle: false });
      if (refreshControls) renderTextList();
      queueRender();
    }, 220);
  }

  function assignTextsToTemplate(spec, { restyle = false, preferSlots = true } = {}) {
    const regions = state.regions.filter((region) => region.acceptText && region.shape !== "line");
    const occupancy = new Map(regions.map((region) => [region.id, 0]));
    const overflow = [];

    state.texts.forEach((text, index) => {
      if (!text.styleMode) text.styleMode = "auto";
      text.role = inferTextRole(text, index);
      text.autoRole = text.role;
      text.regionLocked = false;
      text.manualX = null;
      text.manualY = null;

      const slot = preferSlots && Array.isArray(spec.textSlots) ? spec.textSlots[index] : null;
      const region = Number.isInteger(slot) ? state.regions[slot] : null;
      if (region && region.acceptText && region.shape !== "line") {
        text.regionId = region.id;
        text.order = occupancy.get(region.id) || 0;
        occupancy.set(region.id, text.order + 1);
      } else {
        overflow.push({ text, index, role:text.role, facts:textFacts(text) });
      }
    });

    overflow
      .sort((a, b) => {
        const priority = { headline:190, footer:170, bullet:145, callout:135, tag:125, body:118, micro:90 };
        return (priority[b.role] || 100) - (priority[a.role] || 100);
      })
      .forEach(({ text, role, facts }) => {
        let best = regions[0];
        let bestScore = -Infinity;
        regions.forEach((region) => {
          const score = regionTextScore(region, role, facts, occupancy.get(region.id) || 0);
          if (score > bestScore) { best = region; bestScore = score; }
        });
        if (!best) return;
        text.regionId = best.id;
        text.order = occupancy.get(best.id) || 0;
        occupancy.set(best.id, text.order + 1);
      });

    normalizeTextOrders();
    autoStyleAssignedTexts({ force: restyle });
  }

  function ensureRegionLayoutBase(region) {
    if (!region) return null;
    if (!region.layoutBase) {
      region.layoutBase = {
        x: Number(region.x) || 0,
        y: Number(region.y) || 0,
        w: Math.max(20, Number(region.w) || 20),
        h: Math.max(20, Number(region.h) || 20)
      };
    }
    if (typeof region.layoutDetached !== "boolean") region.layoutDetached = false;
    if (region.layoutManualDelta) {
      region.layoutManualDelta = {
        x: Number(region.layoutManualDelta.x) || 0,
        y: Number(region.layoutManualDelta.y) || 0,
        w: Number(region.layoutManualDelta.w) || 0,
        h: Number(region.layoutManualDelta.h) || 0
      };
    }
    return region.layoutBase;
  }

  function regionGapLabel(value = state.regionGapReduction) {
    const amount = Math.round(clamp(Number(value) || 0, 0, 72));
    return amount > 0 ? `${amount}px 더 촘촘` : "템플릿 원본";
  }

  function regionGapGeometry(region, amount = state.regionGapReduction) {
    const base = ensureRegionLayoutBase(region);
    const { trimW, trimH } = dimensions();
    const gap = clamp(Number(amount) || 0, 0, 72);
    const isFullWidth = base.x <= 1 && base.w >= trimW - 2;
    const horizontal = region.shape === "line" || isFullWidth ? 0 : gap;
    const vertical = region.shape === "line" ? Math.min(8, gap * .25) : gap;
    let x = base.x - horizontal / 2;
    let y = base.y - vertical / 2;
    let w = base.w + horizontal;
    let h = base.h + vertical;
    if (isFullWidth) { x = 0; w = trimW; }
    x = clamp(x, -trimW * .12, trimW - 20);
    y = clamp(y, -trimH * .12, trimH - 20);
    w = clamp(w, 20, trimW * 1.24);
    h = clamp(h, 20, trimH * 1.24);
    return { x, y, w, h };
  }

  function captureRegionManualDelta(region, amount = state.regionGapReduction) {
    if (!region) return;
    const target = regionGapGeometry(region, amount);
    region.layoutManualDelta = {
      x: (Number(region.x) || 0) - target.x,
      y: (Number(region.y) || 0) - target.y,
      w: Math.max(20, Number(region.w) || 20) - target.w,
      h: Math.max(20, Number(region.h) || 20) - target.h
    };
    region.layoutDetached = true;
  }

  function applyGapToRegion(region, amount = state.regionGapReduction, { preserveManual = true } = {}) {
    if (!region) return;
    const target = regionGapGeometry(region, amount);
    const delta = preserveManual && region.layoutDetached && region.layoutManualDelta
      ? region.layoutManualDelta
      : { x: 0, y: 0, w: 0, h: 0 };
    const { trimW, trimH } = dimensions();
    const nextW = clamp(target.w + (Number(delta.w) || 0), 20, trimW * 1.24);
    const nextH = clamp(target.h + (Number(delta.h) || 0), 20, trimH * 1.24);
    const nextX = clamp(target.x + (Number(delta.x) || 0), -trimW * .12, trimW - 20);
    const nextY = clamp(target.y + (Number(delta.y) || 0), -trimH * .12, trimH - 20);
    region.x = Math.round(nextX);
    region.y = Math.round(nextY);
    region.w = Math.round(nextW);
    region.h = Math.round(nextH);
  }

  function applyRegionGapReduction({ force = false } = {}) {
    state.regionGapReduction = clamp(Number(state.regionGapReduction) || 0, 0, 72);
    state.regions.forEach((region) => {
      ensureRegionLayoutBase(region);
      if (force) {
        region.layoutDetached = false;
        region.layoutManualDelta = null;
      }
      applyGapToRegion(region, state.regionGapReduction, { preserveManual: !force });
    });
    autoStyleAssignedTexts({ force: false });
  }

  function restoreRegionLayout(region) {
    if (!region) return;
    region.layoutDetached = false;
    region.layoutManualDelta = null;
    applyGapToRegion(region, state.regionGapReduction, { preserveManual: false });
  }


  function applyTemplate(templateId, { preserveTexts = true } = {}) {
    const spec = templateSpecs.find((t) => t.id === templateId) || templateSpecs[0];
    const { trimW: W, trimH: H } = dimensions();
    const keepPalette = { ...state.palette };
    state.templateId = spec.id;
    state.palette = keepPalette;
    const bgRole = spec.bg?.role || "primary";
    const bgColor = paletteColor(bgRole, state.palette);
    state.background = { mode: "solid", c1: bgColor, c2: bgColor, pattern: "none", patternColor: state.palette.tertiary, angle: 0, scale: spec.bg?.scale || 48 };
    state.regions = spec.regions.map((r) => cloneTemplateRegion(r, W, H));
    if (!Number.isFinite(Number(state.regionGapReduction))) state.regionGapReduction = globalNumericDefaults.regionGapReduction;
    applyRegionGapReduction({ force: true });
    state.posterBorder = spec.border
      ? { enabled:Boolean(spec.border.enabled), color:spec.border.color || state.palette.secondary || "#111111", width:Number(spec.border.width) || 0, radius:Number(spec.border.radius) || 0 }
      : { enabled:false, color:state.palette.secondary || "#111111", width:0, radius:0 };
    globalNumericDefaults.gradientAngle = Number(state.background.angle) || 0;
    globalNumericDefaults.patternScale = Number(state.background.scale) || 48;
    globalNumericDefaults.posterBorderWidth = Number(state.posterBorder.width) || 0;
    globalNumericDefaults.posterBorderRadius = Number(state.posterBorder.radius) || 0;
    state.selectedRegionId = null;
    state.selectedElementId = null;

    const resetTexts = !preserveTexts || !state.texts.length;
    if (resetTexts) {
      const sample = (copy, role, extra = {}) => makeText(copy, {
        ...ROLE_STYLE_DEFAULTS[role], role, roleHint:role, sample:true, unicodeStyle:"none", ...extra
      });
      state.texts = [
        sample("속보", "tag"),
        sample(`수달, 돌 하나 주웠을 뿐인데
전국민 심장 압수 시작`, "headline"),
        sample("★국가수달과몰입대책본부 발표｜귀여움 경보 4단계｜조개 비축 권고★", "micro"),
        sample(`•배 위 조개 개봉 가능
•물 위 낮잠·식사 동시 수행
•오늘의 문제: 너무 귀여움
•해결 방법: 4K로 더 크게 보기`, "bullet"),
        sample(`무직인데
매일 바쁨`, "callout"),
        sample(`입덕률
98.7%`, "tag"),
        sample("☎ 수달 제보 02)770-수달수달 ☎", "footer"),
        sample("※부작용: 영상 47개 연속 재생·조약돌 수집·친구에게 사진 전송", "micro")
      ];
    }

    assignTextsToTemplate(spec, { restyle: resetTexts, preferSlots: true });
    if (!state.texts.some((t) => t.id === state.selectedTextId)) state.selectedTextId = resetTexts ? null : (state.texts[0]?.id || null);
    refreshAllUI();
    queueRender();
  }

  function thumbColor(spec, region, prop) {
    const role = region[`${prop}Role`];
    return role ? paletteColor(role, state.palette) : region[prop];
  }

  function drawTemplateThumbnail(target, spec) {
    const c = target.getContext("2d");
    const W = target.width = 320;
    const H = target.height = 180;
    c.clearRect(0, 0, W, H);
    const bgColor = paletteColor(spec.bg?.role || "primary", state.palette);
    c.fillStyle = bgColor;
    c.fillRect(0, 0, W, H);

    const pathFor = (r) => {
      const x=r.x*W, y=r.y*H, w=r.w*W, h=r.h*H;
      if (r.shape === "ellipse") { c.beginPath(); c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2); }
      else if (r.shape === "burst") burstPath(c,x,y,w,h,18);
      else roundedRectPath(c,x,y,w,h,(r.radius||0)*Math.min(W/1600,H/900));
      return {x,y,w,h};
    };

    spec.regions.forEach((r) => {
      const box = pathFor(r);
      if (!r.fillNone) { c.fillStyle = thumbColor(spec,r,"fill"); c.fill(); }
      if (!r.strokeNone && r.strokeWidth > 0) {
        pathFor(r); c.strokeStyle = thumbColor(spec,r,"stroke"); c.lineWidth = Math.max(1,r.strokeWidth*.35); c.stroke();
      }
      if (r.acceptText && r.shape !== "line") {
        const fill = r.fillNone ? bgColor : thumbColor(spec,r,"fill");
        c.fillStyle = contrastText(fill);
        c.globalAlpha = .72;
        const inset = Math.max(4, Math.min(box.w,box.h)*.12);
        const lineW = Math.max(10, box.w - inset*2);
        const lineH = Math.max(2, Math.min(6, box.h*.07));
        c.fillRect(box.x+inset,box.y+inset,lineW*.78,lineH);
        if (box.h > 34) c.fillRect(box.x+inset,box.y+inset+lineH*2.3,lineW*.58,lineH);
        c.globalAlpha = 1;
      }
    });

    if (spec.border?.enabled && spec.border.width > 0) {
      c.strokeStyle = spec.border.color;
      c.lineWidth = Math.max(2,spec.border.width*.35);
      c.strokeRect(c.lineWidth/2,c.lineWidth/2,W-c.lineWidth,H-c.lineWidth);
    }
  }

  function renderTemplateGrid() {
    const grid = $("templateGrid");
    grid.replaceChildren();
    templateSpecs.forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `template-card${state.templateId === template.id ? " active" : ""}`;
      const canvasThumb = document.createElement("canvas");
      canvasThumb.className = "template-thumb";
      const meta = document.createElement("span");
      meta.className = "template-meta";
      const name = document.createElement("strong");
      name.textContent = template.name;
      const caption = document.createElement("small");
      caption.textContent = template.caption || `${template.regions.filter((r) => r.acceptText).length}개 글자 영역`;
      meta.append(name, caption);
      button.append(canvasThumb, meta);
      drawTemplateThumbnail(canvasThumb, template);
      button.addEventListener("click", () => applyTemplate(template.id, { preserveTexts: true }));
      grid.append(button);
    });
  }

  function renderRegionList() {
    const list = $("regionList");
    list.replaceChildren();
    state.regions.forEach((region, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `region-chip${state.selectedRegionId === region.id ? " active" : ""}${region.layoutDetached ? " detached" : ""}`;
      const color = region.fillNone ? "transparent" : resolveColor(region, "fill");
      button.innerHTML = `<span class="region-dot"></span>${index + 1}. ${region.name}${region.layoutDetached ? '<span class="region-chip-state">수동</span>' : ""}`;
      button.querySelector(".region-dot").style.background = color;
      button.addEventListener("click", () => {
        state.selectedRegionId = region.id;
        state.selectedElementId = null;
        state.selectedTextId = null;
        transformTarget = null;
        updateRegionControls();
        updateElementControls();
        renderRegionList();
        renderTextList({bringSelectedRegionIntoView:true});
        queueRender();
      });
      list.append(button);
    });
  }

  function updateCanvasMeta() {
    const { trimW, trimH, bleed, fullW, fullH } = dimensions();
    if (canvas.width !== fullW) canvas.width = fullW;
    if (canvas.height !== fullH) canvas.height = fullH;
    if (sceneCanvas.width !== fullW) sceneCanvas.width = fullW;
    if (sceneCanvas.height !== fullH) sceneCanvas.height = fullH;
    $("canvasSizeLabel").textContent = bleed ? `${trimW} × ${trimH} + 재단 ${state.bleedMm}mm` : `${trimW} × ${trimH}`;
    $("currentTemplateName").textContent = state.templateId === CUSTOM_TEMPLATE_ID ? "직접 만들기" : (templateSpecs.find((x) => x.id === state.templateId)?.name || "사용자 템플릿");
    applyPreviewBackgroundMode();
  }

  function refreshAllUI() {
    updateCanvasMeta();
    if ($("regionGapReduction")) {
      $("regionGapReduction").value = String(state.regionGapReduction ?? globalNumericDefaults.regionGapReduction);
      $("regionGapReductionValue").textContent = regionGapLabel(state.regionGapReduction);
    }
    renderTemplateGrid();
    renderTextList();
    renderRegionList();
    updateRegionControls();
    updateElementControls();
    syncBackgroundControls();
    colorFields.forEach((f) => f.update());
  }

  function makeInlineColorControl(host, getter, setter, allowNone = false) {
    const api = createColorPickerNode(getter, setter, { allowNone });
    host.append(api.root);
    return api;
  }

  function makeSelect(options, value) {
    const select = document.createElement("select");
    options.forEach(([v, label]) => {
      const option = document.createElement("option");
      option.value = v; option.textContent = label; option.selected = v === value;
      select.append(option);
    });
    return select;
  }

  function labeledControl(labelText, control) {
    const label = document.createElement("label");
    label.append(document.createTextNode(labelText), control);
    return label;
  }

  function parseNumericDraft(text) {
    const value = String(text ?? "").trim().replace(",", ".");
    if (["", "-", "+", ".", "-.", "+."].includes(value)) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function numericPrecision(step) {
    const text = String(step);
    if (text.includes("e-")) return Number(text.split("e-")[1]) || 0;
    return (text.split(".")[1] || "").length;
  }

  function normalizeNumericValue(value, min, max, step, fallback = min) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? parsed : Number(fallback);
    const clamped = clamp(safe, min, max);
    const steps = Math.round((clamped - min) / step);
    const normalized = min + steps * step;
    return Number(normalized.toFixed(Math.min(8, numericPrecision(step))));
  }

  function numericFieldControl(labelText, value, min, max, step, formatter, onInput, options = {}) {
    const wrap=document.createElement("div");wrap.className="numeric-field numeric-stepper";
    const row=document.createElement("div");row.className="numeric-inline-row";
    const title=document.createElement("span");title.className="numeric-inline-label";title.textContent=labelText;
    const minus=document.createElement("button");minus.type="button";minus.className="step-button";minus.textContent="−";minus.title=`${labelText} 줄이기`;
    const number=document.createElement("input");number.type="text";number.inputMode="decimal";number.autocomplete="off";number.spellcheck=false;number.className="numeric-direct-input";number.setAttribute("aria-label",`${labelText} 직접 입력`);
    const plus=document.createElement("button");plus.type="button";plus.className="step-button";plus.textContent="+";plus.title=`${labelText} 키우기`;
    const reset=document.createElement("button");reset.type="button";reset.className="numeric-reset-button";reset.textContent="↺";reset.title=`${labelText} 원래값으로 복귀`;reset.setAttribute("aria-label",`${labelText} 원래값으로 복귀`);
    row.append(title,minus,number,plus,reset);
    const range=document.createElement("input");range.type="range";range.min=String(min);range.max=String(max);range.step=String(step);range.className="numeric-range-input";range.setAttribute("aria-label",`${labelText} 슬라이더`);
    wrap.append(row,range);

    const defaultResolver=typeof options.defaultValue==="function"?options.defaultValue:()=>options.defaultValue??value;
    let committed=normalizeNumericValue(value,min,max,step,value),editingStart=committed,numberEditing=false,numberCancelled=false,rangeInteraction=false,keyboardInteraction=false;
    const currentDefault=()=>normalizeNumericValue(defaultResolver(),min,max,step,value);
    const updateReset=()=>{const defaultValue=currentDefault();reset.disabled=Math.abs(committed-defaultValue)<Math.max(1e-8,step/1000);reset.title=`${labelText} 원래값 ${formatter(defaultValue)}로 복귀`;};
    const syncDisplay=(next,{preserveDraft=false}={})=>{committed=normalizeNumericValue(next,min,max,step,committed);if(!preserveDraft)number.value=String(committed);range.value=String(committed);updateRangeVisual(range);number.title=formatter(committed);updateReset();return committed;};
    const preview=(next,{preserveDraft=false}={})=>{const fixed=syncDisplay(next,{preserveDraft});onInput(fixed);queueRender();return fixed;};
    const commitAtomic=(next)=>{preview(next);markHistoryDirty(true);};
    syncDisplay(committed);
    minus.addEventListener("click",()=>commitAtomic(committed-step));plus.addEventListener("click",()=>commitAtomic(committed+step));reset.addEventListener("click",()=>commitAtomic(currentDefault()));
    number.addEventListener("focus",()=>{numberEditing=true;numberCancelled=false;editingStart=committed;beginHistoryInteraction();number.select();});
    number.addEventListener("input",()=>{const parsed=parseNumericDraft(number.value);if(parsed!==null)preview(parsed,{preserveDraft:true});});
    number.addEventListener("blur",()=>{if(!numberEditing)return;const parsed=parseNumericDraft(number.value);if(numberCancelled){syncDisplay(editingStart);endHistoryInteraction({commit:false});}else{preview(parsed===null?committed:parsed);endHistoryInteraction({commit:true});}numberEditing=false;numberCancelled=false;});
    number.addEventListener("keydown",(event)=>{if(event.key==="Enter"){event.preventDefault();number.blur();}else if(event.key==="Escape"){event.preventDefault();numberCancelled=true;preview(editingStart);number.blur();}});
    range.addEventListener("pointerdown",()=>{if(rangeInteraction)return;rangeInteraction=true;beginHistoryInteraction();});
    range.addEventListener("input",()=>preview(Number(range.value)));
    const finishRange=()=>{if(!rangeInteraction)return;rangeInteraction=false;endHistoryInteraction({commit:true});};
    range.addEventListener("pointerup",finishRange);range.addEventListener("pointercancel",finishRange);
    range.addEventListener("keydown",(event)=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","PageUp","PageDown","Home","End"].includes(event.key))return;if(!keyboardInteraction){keyboardInteraction=true;beginHistoryInteraction();}});
    range.addEventListener("keyup",()=>{if(!keyboardInteraction)return;keyboardInteraction=false;endHistoryInteraction({commit:true});});
    range.addEventListener("blur",()=>{if(!keyboardInteraction)return;keyboardInteraction=false;endHistoryInteraction({commit:true});});
    return wrap;
  }


  function rangeControl(labelText, value, min, max, step, formatter, onInput, options = {}) {
    return numericFieldControl(labelText, value, min, max, step, formatter, onInput, options);
  }

  function numericStepperControl(labelText, value, min, max, step, formatter, onInput, options = {}) {
    return numericFieldControl(labelText, value, min, max, step, formatter, onInput, options);
  }

  function ensureItemNumericDefaults(kind, item) {
    if (!item) return null;
    const key = `${kind}:${item.id}`;
    if (itemNumericDefaults.has(key)) return itemNumericDefaults.get(key);
    const values = kind === "region"
      ? {
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          w: Number(item.w) || 20,
          h: Number(item.h) || 20,
          radius: Number(item.radius) || 0,
          padding: Number(item.padding) || 0,
          strokeWidth: Number(item.strokeWidth) || 0,
          rotation: Number(item.rotation) || 0,
          effectSize: Number(item.effectSize) || 0
        }
      : {
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          w: Number(item.w) || 20,
          h: Number(item.h) || 20,
          strokeWidth: Number(item.strokeWidth) || 0,
          radius: Number(item.radius) || 0,
          rotation: Number(item.rotation) || 0,
          flowMargin: Number(item.flowMargin) || 0,
          effectSize: Number(item.effectSize) || 0,
          labelSize: Number(item.labelSize) || 12,
          bandPosition: Math.round(clamp(Number(item.bandPosition) || .5, 0, 1) * 100)
        };
    itemNumericDefaults.set(key, values);
    return values;
  }

  function itemNumericDefault(kind, prop, fallback) {
    const item = kind === "region" ? selectedRegion() : selectedElement();
    return ensureItemNumericDefaults(kind, item)?.[prop] ?? fallback;
  }

  function captureTextNumericDefaults(text, force = false) {
    if (!text || (!force && textNumericDefaults.has(text.id))) return;
    textNumericDefaults.set(text.id, {
      fontSize: Number(text.fontSize) || 54,
      lineHeight: Number(text.lineHeight) || 1.08,
      scaleX: Number(text.scaleX) || 1,
      letterSpacing: Number(text.letterSpacing) || 0,
      prefixGap: Number(text.prefixGap) || 0,
      outlineWidth: Number(text.outlineWidth) || 0,
      gap: Number(text.gap) || 0
    });
  }

  function textNumericDefault(text, prop, fallback) {
    return textNumericDefaults.get(text.id)?.[prop] ?? fallback;
  }

  const STATIC_NUMERIC_SPECS = {
    regionGapReduction: { min: 0, max: 72, step: 1, reset: () => globalNumericDefaults.regionGapReduction },
    regionX: { min: -1600, max: 3200, step: 1, reset: () => itemNumericDefault("region", "x", 0) },
    regionY: { min: -1600, max: 3200, step: 1, reset: () => itemNumericDefault("region", "y", 0) },
    regionW: { min: 20, max: 3200, step: 1, reset: () => itemNumericDefault("region", "w", 720) },
    regionH: { min: 20, max: 3200, step: 1, reset: () => itemNumericDefault("region", "h", 320) },
    regionRadius: { min: 0, max: 240, step: 1, reset: () => itemNumericDefault("region", "radius", 0) },
    regionPadding: { min: 0, max: 180, step: 1, reset: () => itemNumericDefault("region", "padding", 24) },
    regionStrokeWidth: { min: 0, max: 80, step: 1, reset: () => itemNumericDefault("region", "strokeWidth", 0) },
    regionRotation: { min: -180, max: 180, step: 1, reset: () => itemNumericDefault("region", "rotation", 0) },
    regionEffectSize: { min: 0, max: 100, step: 1, reset: () => itemNumericDefault("region", "effectSize", 18) },
    regionScale: { min: 20, max: 300, step: 1, reset: () => 100 },
    elementX: { min: -1600, max: 3200, step: 1, reset: () => itemNumericDefault("element", "x", 0) },
    elementY: { min: -1600, max: 3200, step: 1, reset: () => itemNumericDefault("element", "y", 0) },
    elementW: { min: 20, max: 3200, step: 1, reset: () => itemNumericDefault("element", "w", 360) },
    elementH: { min: 20, max: 3200, step: 1, reset: () => itemNumericDefault("element", "h", 240) },
    bandPosition: { min: 0, max: 100, step: 1, reset: () => itemNumericDefault("element", "bandPosition", 50) },
    elementStrokeWidth: { min: 0, max: 80, step: 1, reset: () => itemNumericDefault("element", "strokeWidth", 0) },
    elementRadius: { min: 0, max: 240, step: 1, reset: () => itemNumericDefault("element", "radius", 0) },
    elementRotation: { min: -180, max: 180, step: 1, reset: () => itemNumericDefault("element", "rotation", 0) },
    flowMargin: { min: -160, max: 240, step: 1, reset: () => itemNumericDefault("element", "flowMargin", 0) },
    elementEffectSize: { min: 0, max: 100, step: 1, reset: () => itemNumericDefault("element", "effectSize", 20) },
    elementLabelSize: { min: 12, max: 280, step: 1, reset: () => itemNumericDefault("element", "labelSize", 72) },
    elementScale: { min: 20, max: 300, step: 1, reset: () => 100 },
    bleedMm: { min: 0, max: 30, step: .5, reset: () => globalNumericDefaults.bleedMm },
    gradientAngle: { min: 0, max: 360, step: 1, reset: () => globalNumericDefaults.gradientAngle },
    patternScale: { min: 12, max: 180, step: 1, reset: () => globalNumericDefaults.patternScale },
    posterBorderWidth: { min: 0, max: 100, step: 1, reset: () => globalNumericDefaults.posterBorderWidth },
    posterBorderRadius: { min: 0, max: 240, step: 1, reset: () => globalNumericDefaults.posterBorderRadius },
    jpgQuality: { min: 50, max: 100, step: 1, reset: () => globalNumericDefaults.jpgQuality }
  };

  function updateRangeVisual(input) {
    if (!input) return;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const ratio = max === min ? 0 : (value - min) / (max - min);
    input.style.setProperty("--range-progress", `${clamp(ratio, 0, 1) * 100}%`);
  }

  function enhanceStaticNumericField(bridge) {
    if (!bridge?.id || bridge.dataset.numericEnhanced === "true") return;
    const sourceMin = Number(bridge.min);
    const sourceMax = Number(bridge.max);
    const sourceStep = Number(bridge.step);
    const spec = STATIC_NUMERIC_SPECS[bridge.id] || {
      min: Number.isFinite(sourceMin) ? sourceMin : 0,
      max: Number.isFinite(sourceMax) ? sourceMax : 100,
      step: Number.isFinite(sourceStep) && sourceStep > 0 ? sourceStep : 1,
      reset: () => Number(bridge.defaultValue || bridge.value || 0)
    };
    const min = Number.isFinite(spec.min) ? spec.min : 0;
    const max = Number.isFinite(spec.max) ? spec.max : 100;
    const step = Number.isFinite(spec.step) && spec.step > 0 ? spec.step : 1;
    bridge.min = String(min);
    bridge.max = String(max);
    bridge.step = String(step);
    bridge.dataset.numericEnhanced = "true";
    bridge.classList.add("numeric-bridge-input");
    bridge.tabIndex = -1;
    bridge.setAttribute("aria-hidden", "true");

    const ownerLabel = bridge.closest("label");
    let captionText = bridge.getAttribute("aria-label") || bridge.id || "수치";
    if (ownerLabel) {
      const directText = [...ownerLabel.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).filter(Boolean);
      if (directText.length) captionText = directText.join(" ");
      [...ownerLabel.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => { node.textContent = ""; });
      ownerLabel.querySelectorAll(":scope > b").forEach((node) => node.classList.add("numeric-legacy-readout"));
      ownerLabel.classList.add("numeric-enhanced-label");
    }
    const shell = document.createElement("div");
    shell.className = "static-numeric-field";
    const row = document.createElement("div");
    row.className = "numeric-inline-row static-numeric-row";
    const caption = document.createElement("span");
    caption.className = "numeric-inline-label";
    caption.textContent = captionText;
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "step-button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "값 줄이기");
    const number = document.createElement("input");
    number.type = "text";
    number.inputMode = "decimal";
    number.autocomplete = "off";
    number.spellcheck = false;
    number.className = "numeric-direct-input";
    number.setAttribute("aria-label", "수치 직접 입력");
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "step-button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "값 늘리기");
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "numeric-reset-button numeric-reset-compact";
    reset.textContent = "↺";
    reset.setAttribute("aria-label", "원래값으로 복귀");
    row.append(caption, minus, number, plus, reset);

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.className = "numeric-range-input";
    range.setAttribute("aria-label", "수치 슬라이더");
    shell.append(row, range);
    bridge.insertAdjacentElement("afterend", shell);

    let committed = normalizeNumericValue(bridge.value, min, max, step, spec.reset());
    let editing = false;
    let editingStart = committed;
    let cancelled = false;
    let rangeInteraction = false;
    let keyboardInteraction = false;

    const currentDefault = () => normalizeNumericValue(spec.reset(), min, max, step, committed);
    const isContextDisabled = () => bridge.disabled || Boolean(bridge.closest(".editor-card.is-disabled"));
    const updateReset = () => {
      const defaultValue = currentDefault();
      reset.disabled = isContextDisabled() || Math.abs(committed - defaultValue) < Math.max(1e-8, step / 1000);
      reset.title = `원래값 ${defaultValue}로 복귀`;
    };
    const sync = ({ preserveDraft = false } = {}) => {
      committed = normalizeNumericValue(bridge.value, min, max, step, committed);
      if (!preserveDraft && !editing) number.value = String(committed);
      range.value = String(committed);
      updateRangeVisual(range);
      const disabled = isContextDisabled();
      number.disabled = disabled;
      range.disabled = disabled;
      minus.disabled = disabled;
      plus.disabled = disabled;
      updateReset();
    };
    const emitBridge = (next, { commit = false, preserveDraft = false } = {}) => {
      committed = normalizeNumericValue(next, min, max, step, committed);
      bridge.value = String(committed);
      if (!preserveDraft) number.value = String(committed);
      range.value = String(committed);
      updateRangeVisual(range);
      bridge.dispatchEvent(new Event("input", { bubbles: true }));
      if (commit) bridge.dispatchEvent(new Event("change", { bubbles: true }));
      updateReset();
      if (commit) markHistoryDirty(true);
      return committed;
    };

    minus.addEventListener("click", () => emitBridge(committed - step, { commit: true }));
    plus.addEventListener("click", () => emitBridge(committed + step, { commit: true }));
    reset.addEventListener("click", () => emitBridge(currentDefault(), { commit: true }));

    number.addEventListener("focus", () => {
      editing = true;
      cancelled = false;
      editingStart = committed;
      beginHistoryInteraction();
      number.select();
    });
    number.addEventListener("input", () => {
      const parsed = parseNumericDraft(number.value);
      if (parsed === null) return;
      emitBridge(parsed, { preserveDraft: true });
    });
    number.addEventListener("blur", () => {
      if (!editing) return;
      const parsed = parseNumericDraft(number.value);
      if (cancelled) {
        emitBridge(editingStart);
        endHistoryInteraction({ commit: false });
      } else {
        emitBridge(parsed === null ? committed : parsed, { commit: true });
        endHistoryInteraction({ commit: true });
      }
      editing = false;
      cancelled = false;
      sync();
    });
    number.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        number.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelled = true;
        emitBridge(editingStart);
        number.blur();
      }
    });

    range.addEventListener("pointerdown", () => {
      if (rangeInteraction) return;
      rangeInteraction = true;
      beginHistoryInteraction();
    });
    range.addEventListener("input", () => emitBridge(Number(range.value)));
    const finishRange = () => {
      if (!rangeInteraction) return;
      rangeInteraction = false;
      bridge.dispatchEvent(new Event("change", { bubbles: true }));
      endHistoryInteraction({ commit: true });
    };
    range.addEventListener("pointerup", finishRange);
    range.addEventListener("pointercancel", finishRange);
    range.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
      if (!keyboardInteraction) {
        keyboardInteraction = true;
        beginHistoryInteraction();
      }
    });
    range.addEventListener("keyup", () => {
      if (!keyboardInteraction) return;
      keyboardInteraction = false;
      bridge.dispatchEvent(new Event("change", { bubbles: true }));
      endHistoryInteraction({ commit: true });
    });
    range.addEventListener("blur", () => {
      if (!keyboardInteraction) return;
      keyboardInteraction = false;
      endHistoryInteraction({ commit: true });
    });

    const controller = { bridge, shell, number, range, reset, sync };
    staticNumericControllers.set(bridge.id, controller);
    sync();
  }

  function enhanceStaticNumericFields() {
    document.querySelectorAll('input[type="number"], input[type="range"]').forEach(enhanceStaticNumericField);
  }

  function syncStaticNumericFields(ids = null) {
    const targets = ids || [...staticNumericControllers.keys()];
    targets.forEach((id) => staticNumericControllers.get(id)?.sync());
  }

  function makeSegmentedControl(options, value, onChange, className = "") {
    const wrap = document.createElement("div");
    wrap.className = `segmented-control${className ? ` ${className}` : ""}`;
    wrap.setAttribute("role", "group");
    options.forEach(([optionValue, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.value = optionValue;
      button.textContent = label;
      button.classList.toggle("active", optionValue === value);
      button.addEventListener("click", () => {
        wrap.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
        onChange(optionValue);
      });
      wrap.append(button);
    });
    return wrap;
  }

  function syncSegmented(id, value) {
    const root = $(id);
    if (!root) return;
    root.dataset.value = value;
    root.querySelectorAll("button[data-value]").forEach((button) => button.classList.toggle("active", button.dataset.value === value));
  }

  function bindSegmented(id, handler) {
    const root = $(id);
    if (!root) return;
    root.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button || !root.contains(button)) return;
      syncSegmented(id, button.dataset.value);
      handler(button.dataset.value);
      queueRender();
    });
  }

function isTextManualProtected(text) {
    if (!text) return false;
    return Boolean(
      text.manualProtected ||
      text.styleMode === "manual" ||
      text.regionLocked ||
      text.manualX != null ||
      text.manualY != null ||
      Math.abs((Number(text.manualScale) || 1) - 1) > .001
    );
  }

  function markTextManual(text) {
    if (!text) return;
    text.styleMode = "manual";
    text.manualProtected = true;
  }

  function resetTextManualAdjustments(text, { restyle = true } = {}) {
    if (!text) return;
    text.styleMode = "auto";
    text.manualProtected = false;
    text.regionLocked = false;
    text.manualX = null;
    text.manualY = null;
    text.manualScale = 1;
    text.rangeColors = [];
    text.rangeBackgrounds = [];
    text.rangeUnicodes = [];
    text.effects = [];
    text.effect = "none";
    text.unicodeStyle = "none";
    text.customUnicode = "★";
    text.prefixEnabled = false;
    text.prefixSymbol = "•";
    text.prefixGap = 8;
    textNumericDefaults.delete(text.id);
    if (!restyle) return;
    const region = state.regions.find((item) => item.id === text.regionId);
    const index = Math.max(0, state.texts.indexOf(text));
    const role = inferTextRole(text, index);
    text.role = role;
    text.autoRole = role;
    text.fontWeight = ROLE_STYLE_DEFAULTS[role]?.fontWeight ?? (ROLE_STYLE_DEFAULTS[role]?.bold ? 760 : 520);
    applyRoleStyle(text, role);
    if (region) {
      autoDecoration(text, role, region);
      const box = regionContentBox(region);
      const facts = textFacts(text);
      const emphasis = (Number(region.emphasis) || 1) * (facts.compact <= 14 ? 1.18 : 1);
      text.fontSize = fitTextFontSize(sceneCtx, text, box, box.h, role, emphasis);
    }
    normalizeEffects(text);
  }

  function openUnicodeBrowser(target, hint) {
    unicodeTarget = target;
    $("unicodeTargetHint").textContent = hint;
    $("unicodeSearch").value = "";
    renderUnicodeGrid("전체", "");
    $("unicodeDialog").showModal();
  }

  function effectLabel(value) {
    return ({ none: "효과 없음", outline: "외곽선", shadow: "딱 떨어지는 그림자", hollow: "빈 그림자", extrude: "단색 입체" })[value] || "효과 없음";
  }

  function renderTextList() {
    const list = $("textList");
    list.replaceChildren();
    const accepting = state.regions.filter((region) => region.acceptText && region.shape !== "line");

    state.texts.forEach((text, index) => {
      if (!text.styleMode) text.styleMode = "auto";
      const card = document.createElement("article");
      card.className = `text-card${state.selectedTextId === text.id ? " active" : ""}`;
      card.dataset.textId = text.id;
      card.dataset.auto = String(text.styleMode !== "manual");

      const head = document.createElement("div");
      head.className = "text-card-head";
      const grip = document.createElement("div");
      grip.className = "drag-grip";
      grip.textContent = String(index + 1).padStart(2, "0");
      const textarea = document.createElement("textarea");
      textarea.className = "text-input";
      textarea.value = text.text;
      textarea.rows = Math.max(2, Math.min(6, text.text.split("\n").length + 1));
      textarea.addEventListener("focus", () => {
        state.selectedTextId = text.id;
        activeTextarea = textarea;
        list.querySelectorAll(".text-card").forEach((node) => node.classList.toggle("active", node.dataset.textId === text.id));
        queueRender();
      });
      textarea.addEventListener("click", () => { state.selectedTextId = text.id; activeTextarea = textarea; });
      textarea.addEventListener("input", () => {
        text.text = textarea.value;
        text.roleHint = null;
        text.sample = false;
        textarea.rows = Math.max(2, Math.min(6, textarea.value.split("\n").length + 1));
        scheduleAutoArrange({ reassign: !text.regionLocked, refreshControls: false });
        queueRender();
      });
      textarea.addEventListener("blur", () => {
        if (text.styleMode !== "manual") {
          autoArrangeTexts({ reassign: !text.regionLocked, forceStyle: false });
          renderTextList();
          queueRender();
        }
      });
      textarea.addEventListener("select", () => { activeTextarea = textarea; });

      const actions = document.createElement("div");
      actions.className = "text-card-actions";
      const up = document.createElement("button"); up.className = "small-button"; up.type = "button"; up.textContent = "↑"; up.title = "위로";
      const down = document.createElement("button"); down.className = "small-button"; down.type = "button"; down.textContent = "↓"; down.title = "아래로";
      const remove = document.createElement("button"); remove.className = "small-button"; remove.type = "button"; remove.textContent = "×"; remove.title = "삭제";
      up.addEventListener("click", () => moveTextInList(text.id, -1));
      down.addEventListener("click", () => moveTextInList(text.id, 1));
      remove.addEventListener("click", () => {
        if (state.texts.length === 1) return toast("문장은 하나 이상 필요합니다.");
        state.texts = state.texts.filter((item) => item.id !== text.id);
        state.selectedTextId = state.texts[Math.max(0, index - 1)]?.id || null;
        autoArrangeTexts({ reassign: true, forceStyle: false });
        renderTextList();
        queueRender();
      });
      actions.append(up, down, remove);
      head.append(grip, textarea, actions);
      head.addEventListener("pointerdown", (event) => {
        if (event.target.closest("textarea,button,input,select")) return;
        state.selectedTextId = text.id;
        list.querySelectorAll(".text-card").forEach((node) => node.classList.toggle("active", node.dataset.textId === text.id));
        queueRender();
      });
      card.append(head);

      const controls = document.createElement("div");
      controls.className = "inline-text-controls";
      const titleRow = document.createElement("div");
      titleRow.className = "text-style-heading";
      const title = document.createElement("p");
      title.className = "control-title";
      title.textContent = "선택 문장 꾸미기";
      const mode = makeSegmentedControl([["auto", "자동 맞춤"], ["manual", "직접 꾸미기"]], text.styleMode, (value) => {
        text.styleMode = value;
        if (value === "auto") {
          textNumericDefaults.delete(text.id);
          autoStyleAssignedTexts({ force: false });
          toast("이 문장의 크기와 효과를 영역에 맞췄습니다.");
        }
        renderTextList();
        queueRender();
      }, "compact");
      titleRow.append(title, mode);
      controls.append(titleRow);

      const settingsDetails = document.createElement("details");
      settingsDetails.className = "text-settings-details";
      settingsDetails.open = text.styleMode === "manual";
      const settingsSummary = document.createElement("summary");
      const settingsSummaryTitle = document.createElement("span");
      settingsSummaryTitle.textContent = "세부 꾸미기";
      const settingsSummaryMeta = document.createElement("small");
      const updateSettingsSummary = () => {
        const assignedRegionName = state.regions.find((region) => region.id === text.regionId)?.name || "영역 미지정";
        settingsSummaryMeta.textContent = `${text.styleMode === "manual" ? "직접" : "자동"} · ${assignedRegionName} · ${Math.round(text.fontSize)}px · ${effectLabel(text.effect)}`;
      };
      updateSettingsSummary();
      settingsSummary.append(settingsSummaryTitle, settingsSummaryMeta);
      const settingsBody = document.createElement("div");
      settingsBody.className = "text-settings-body";
      settingsDetails.append(settingsSummary, settingsBody);
      controls.append(settingsDetails);

      const manual = (action) => {
        if (text.styleMode !== "manual") captureTextNumericDefaults(text, true);
        markTextManual(text);
        action();
        card.dataset.auto = "false";
        mode.querySelectorAll("button[data-value]").forEach((button) => button.classList.toggle("active", button.dataset.value === "manual"));
        settingsDetails.open = true;
        updateSettingsSummary();
        queueRender();
      };

      const row1 = document.createElement("div"); row1.className = "field-grid three";
      const fontSelect = makeSelect([["dotum", "KoPub 돋움"], ["batang", "KoPub 바탕"], ["gulim", "굴림체"]], text.fontFamily);
      fontSelect.addEventListener("change", () => manual(() => { text.fontFamily = fontSelect.value; }));
      const fontSize = numericStepperControl("크기", text.fontSize, 12, 300, 1, (value) => `${Math.round(value)}px`, (value) => manual(() => { text.fontSize = clamp(Number(value), 12, 300); }), {
        defaultValue: () => textNumericDefault(text, "fontSize", ROLE_STYLE_DEFAULTS[text.role]?.fontSize ?? 54)
      });
      const regionSelect = document.createElement("select");
      accepting.forEach((region) => {
        const option = document.createElement("option");
        option.value = region.id;
        option.textContent = region.name;
        option.selected = text.regionId === region.id;
        regionSelect.append(option);
      });
      regionSelect.disabled = !accepting.length;
      regionSelect.addEventListener("change", () => {
        text.regionId = regionSelect.value;
        text.regionLocked = true;
        text.manualX = null;
        text.manualY = null;
        normalizeTextOrders();
        autoStyleAssignedTexts({ force: false });
        updateSettingsSummary();
        queueRender();
      });
      row1.append(labeledControl("폰트", fontSelect), fontSize, labeledControl("글자 영역", regionSelect));
      settingsBody.append(row1);

      const row2 = document.createElement("div"); row2.className = "field-grid three";
      const align = makeSelect([["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]], text.align);
      align.addEventListener("change", () => manual(() => { text.align = align.value; }));
      const unicode = makeSelect(UNICODE_PRESETS, text.unicodeStyle);
      unicode.addEventListener("change", () => manual(() => { text.unicodeStyle = unicode.value; renderTextList(); }));
      const lineHeight = rangeControl("줄 간격", text.lineHeight, .8, 1.8, .02, (value) => `${value.toFixed(2)}배`, (value) => manual(() => { text.lineHeight = value; }), {
        defaultValue: () => textNumericDefault(text, "lineHeight", ROLE_STYLE_DEFAULTS[text.role]?.lineHeight ?? 1.08)
      });
      row2.append(labeledControl("정렬", align), labeledControl("유니코드 연출", unicode), lineHeight);
      settingsBody.append(row2);

      const unicodeRow = document.createElement("div"); unicodeRow.className = "field-grid two";
      const customWrap = document.createElement("div"); customWrap.innerHTML = '<span class="field-label">직접 기호</span>';
      const customInputRow = document.createElement("div"); customInputRow.className = "unicode-row";
      const customInput = document.createElement("input"); customInput.value = text.customUnicode || "★";
      customInput.addEventListener("input", () => manual(() => { text.customUnicode = customInput.value; text.unicodeStyle = "custom"; text.unicodePlacement ||= "word"; }));
      const customBrowse = document.createElement("button"); customBrowse.type = "button"; customBrowse.className = "button"; customBrowse.textContent = "찾아보기";
      customBrowse.addEventListener("click", () => openUnicodeBrowser((char) => {
        markTextManual(text); text.customUnicode = char; text.unicodeStyle = "custom"; renderTextList(); queueRender();
      }, "선택한 문장의 단어 사이 기호로 넣습니다."));
      customInputRow.append(customInput, customBrowse); customWrap.append(customInputRow);

      const prefixWrap = document.createElement("div"); prefixWrap.innerHTML = '<span class="field-label">각 줄 앞 기호</span>';
      const prefixInputRow = document.createElement("div"); prefixInputRow.className = "unicode-row";
      const prefixInput = document.createElement("input"); prefixInput.value = text.prefixSymbol || "•";
      prefixInput.addEventListener("input", () => manual(() => { text.prefixSymbol = prefixInput.value; text.prefixEnabled = true; }));
      const prefixBrowse = document.createElement("button"); prefixBrowse.type = "button"; prefixBrowse.className = "button"; prefixBrowse.textContent = "찾아보기";
      prefixBrowse.addEventListener("click", () => openUnicodeBrowser((char) => {
        markTextManual(text); text.prefixSymbol = char; text.prefixEnabled = true; renderTextList(); queueRender();
      }, "선택한 문장의 각 줄 앞에 붙일 기호입니다."));
      prefixInputRow.append(prefixInput, prefixBrowse); prefixWrap.append(prefixInputRow);
      unicodeRow.append(customWrap, prefixWrap); settingsBody.append(unicodeRow);

      const toggles = document.createElement("div"); toggles.className = "toggle-row";
      [["bold", "볼드"], ["italic", "이탤릭"], ["underline", "밑줄"], ["strike", "취소선"], ["prefixEnabled", "줄 앞 기호 사용"]].forEach(([key, labelText]) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = Boolean(text[key]);
        input.addEventListener("change", () => manual(() => { text[key] = input.checked; }));
        label.append(input, labelText);
        toggles.append(label);
      });
      settingsBody.append(toggles);

      const row3 = document.createElement("div"); row3.className = "field-grid three";
      row3.append(
        rangeControl("글자 폭", text.scaleX * 100, 50, 180, 1, (value) => `${Math.round(value)}%`, (value) => manual(() => { text.scaleX = value / 100; }), {
          defaultValue: () => textNumericDefault(text, "scaleX", ROLE_STYLE_DEFAULTS[text.role]?.scaleX ?? 1) * 100
        }),
        rangeControl("자간", text.letterSpacing, -12, 36, 1, (value) => String(value), (value) => manual(() => { text.letterSpacing = value; }), {
          defaultValue: () => textNumericDefault(text, "letterSpacing", ROLE_STYLE_DEFAULTS[text.role]?.letterSpacing ?? 0)
        }),
        rangeControl("줄 앞 간격", text.prefixGap, 0, 60, 1, (value) => String(value), (value) => manual(() => { text.prefixGap = value; }), {
          defaultValue: () => textNumericDefault(text, "prefixGap", 12)
        })
      );
      settingsBody.append(row3);

      const row4 = document.createElement("div"); row4.className = "field-grid three";
      const effect = makeSelect([["none", "없음"], ["outline", "외곽선"], ["shadow", "딱 떨어지는 그림자"], ["hollow", "빈 그림자"], ["extrude", "단색 입체"]], text.effect);
      effect.addEventListener("change", () => manual(() => { text.effect = effect.value; }));
      const outline = numericFieldControl("효과 두께", text.outlineWidth, 0, 48, 1, (value) => `${Math.round(value)}px`, (value) => manual(() => { text.outlineWidth = value; }), {
        defaultValue: () => textNumericDefault(text, "outlineWidth", ROLE_STYLE_DEFAULTS[text.role]?.outlineWidth ?? 2)
      });
      const gap = numericFieldControl("문장 아래 여백", text.gap, 0, 120, 1, (value) => `${Math.round(value)}px`, (value) => manual(() => { text.gap = value; }), {
        defaultValue: () => textNumericDefault(text, "gap", ROLE_STYLE_DEFAULTS[text.role]?.gap ?? 8)
      });
      row4.append(labeledControl("효과", effect), outline, gap);
      settingsBody.append(row4);
      const effectRule = document.createElement("p");
      effectRule.className = "effect-rule-note compact";
      effectRule.innerHTML = "<b>딱 떨어지는 그림자</b>: 번짐 없는 단색 복사 · <b>단색 입체</b>: 그림자 없는 한 색 옆면";
      settingsBody.append(effectRule);

      const row5 = document.createElement("div"); row5.className = "field-grid three";
      const colorModeWrap = document.createElement("div"); colorModeWrap.className = "segmented-field";
      const colorModeLabel = document.createElement("span"); colorModeLabel.className = "field-label"; colorModeLabel.textContent = "글자 색";
      const colorMode = makeSegmentedControl([["auto", "배경 따라"], ["custom", "직접 선택"]], text.colorMode, (value) => manual(() => { text.colorMode = value; }));
      colorModeWrap.append(colorModeLabel, colorMode);
      const textColorHost = document.createElement("div"); textColorHost.innerHTML = '<span class="field-label">본문 색</span>';
      makeInlineColorControl(textColorHost, () => text.color, (value) => manual(() => { text.color = value; text.colorMode = "custom"; }));
      const effectColorHost = document.createElement("div"); effectColorHost.innerHTML = '<span class="field-label">효과 색</span>';
      makeInlineColorControl(effectColorHost, () => text.effectColor, (value) => manual(() => { text.effectColor = value; }));
      row5.append(colorModeWrap, textColorHost, effectColorHost); settingsBody.append(row5);

      const rangeBox = document.createElement("div"); rangeBox.className = "range-color-box";
      rangeBox.innerHTML = "<p>위 입력창에서 글자를 드래그한 뒤 색상을 적용하세요. 줄바꿈을 포함한 부분 선택도 가능합니다.</p>";
      const inline = document.createElement("div"); inline.className = "range-color-controls";
      let selectedRangeColor = "#F4E900";
      const rangeColorHost = document.createElement("div");
      rangeColorHost.innerHTML = '<span class="field-label">선택 부분 색</span>';
      makeInlineColorControl(rangeColorHost, () => selectedRangeColor, (value) => { selectedRangeColor = value; });
      const apply = document.createElement("button"); apply.type = "button"; apply.className = "button button-accent"; apply.textContent = "선택 글자 색 적용";
      apply.addEventListener("click", () => {
        const target = card.querySelector("textarea");
        const start = target.selectionStart;
        const end = target.selectionEnd;
        if (start === end) return toast("먼저 입력창에서 일부 글자를 선택하세요.");
        markTextManual(text);
        text.rangeColors.push({ start, end, color: selectedRangeColor });
        renderTextList();
        queueRender();
      });
      inline.append(rangeColorHost, apply); rangeBox.append(inline);
      const chips = document.createElement("div"); chips.className = "chips";
      text.rangeColors.forEach((range, rangeIndex) => {
        const chip = document.createElement("span"); chip.className = "chip"; chip.style.borderColor = range.color;
        chip.innerHTML = `${range.start + 1}–${range.end} <button type="button">×</button>`;
        chip.querySelector("button").addEventListener("click", () => {
          markTextManual(text); text.rangeColors.splice(rangeIndex, 1); renderTextList(); queueRender();
        });
        chips.append(chip);
      });
      rangeBox.append(chips); settingsBody.append(rangeBox);

      card.append(controls);
      list.append(card);
    });
  }

function moveTextInList(id, direction) {
    const index = state.texts.findIndex((x) => x.id === id);
    const next = clamp(index + direction, 0, state.texts.length - 1);
    if (next === index) return;
    const current = state.texts[index];
    const other = state.texts[next];
    [state.texts[index], state.texts[next]] = [other, current];
    [current, other].forEach((text) => {
      if (!text) return;
      text.regionLocked = true;
      text.manualProtected = true;
    });
    normalizeTextOrders(); renderTextList(); queueRender();
  }

  function normalizeTextOrders() {
    const groups = new Map();
    state.texts.forEach((text) => {
      if (!groups.has(text.regionId)) groups.set(text.regionId, []);
      groups.get(text.regionId).push(text);
    });
    groups.forEach((items) => items.forEach((text, i) => text.order = i));
  }

  function updateRegionControls() {
    const region = selectedRegion();
    const controls = $("regionControls");
    controls.classList.toggle("is-disabled", !region);
    controls.classList.toggle("transform-active", Boolean(region && transformTarget?.kind === "region" && transformTarget.id === region.id));
    if (!region) {
      $("selectedRegionName").textContent = "선택된 영역 없음";
      $("selectedRegionBadge").textContent = "미리보기에서 선택";
      $("toggleRegionTransformBtn").textContent = "핸들 열기";
      if ($("restoreRegionLayoutBtn")) $("restoreRegionLayoutBtn").disabled = true;
      $("regionGapReduction").value = String(state.regionGapReduction ?? globalNumericDefaults.regionGapReduction);
      $("regionGapReductionValue").textContent = regionGapLabel(state.regionGapReduction);
      syncStaticNumericFields(["regionGapReduction", "regionX", "regionY", "regionW", "regionH", "regionRadius", "regionPadding", "regionStrokeWidth", "regionRotation", "regionEffectSize"]);
      colorFields.forEach((field) => field.update());
      return;
    }
    ensureItemNumericDefaults("region", region);
    const active = transformTarget?.kind === "region" && transformTarget.id === region.id;
    $("selectedRegionName").textContent = region.name;
    $("selectedRegionBadge").textContent = active ? "캔버스 조작 중" : (region.layoutDetached ? "수동 위치" : (region.acceptText ? "문장 영역" : "장식 영역"));
    $("toggleRegionTransformBtn").textContent = active ? "핸들 닫기" : "핸들 열기";
    if ($("restoreRegionLayoutBtn")) $("restoreRegionLayoutBtn").disabled = !region.layoutBase;
    $("regionGapReduction").value = String(state.regionGapReduction ?? globalNumericDefaults.regionGapReduction);
    $("regionGapReductionValue").textContent = regionGapLabel(state.regionGapReduction);
    $("regionX").value = round(region.x); $("regionY").value = round(region.y);
    $("regionW").value = round(region.w); $("regionH").value = round(region.h);
    $("regionShape").value = region.shape;
    $("regionRadius").value = region.radius; $("regionRadiusValue").textContent = round(region.radius);
    $("regionPadding").value = region.padding; $("regionPaddingValue").textContent = round(region.padding);
    $("regionStrokeWidth").value = region.strokeWidth;
    $("regionRotation").value = region.rotation; $("regionRotationValue").textContent = `${round(region.rotation)}°`;
    syncSegmented("regionAcceptText", region.acceptText ? "yes" : "no");
    $("regionEffect").value = region.effect; $("regionEffectSize").value = region.effectSize;
    syncStaticNumericFields(["regionGapReduction", "regionX", "regionY", "regionW", "regionH", "regionRadius", "regionPadding", "regionStrokeWidth", "regionRotation", "regionEffectSize"]);
    colorFields.forEach((field) => field.update());
  }

  function updateElementControls() {
    const element = selectedElement();
    const controls = $("elementControls");
    controls.classList.toggle("is-disabled", !element);
    controls.classList.toggle("transform-active", Boolean(element && transformTarget?.kind === "element" && transformTarget.id === element.id));
    if (!element) {
      $("selectedElementName").textContent = "선택된 요소 없음";
      $("selectedElementBadge").textContent = "미리보기에서 선택";
      $("toggleElementTransformBtn").textContent = "핸들 열기";
      $("bandControls").classList.add("hidden");
      syncStaticNumericFields(["elementX", "elementY", "elementW", "elementH", "bandPosition", "elementStrokeWidth", "elementRadius", "elementRotation", "flowMargin", "elementEffectSize", "elementLabelSize"]);
      colorFields.forEach((field) => field.update());
      return;
    }
    const labels = { rect:"사각형", band:"띠", circle:"원형", heart:"하트", burst:"뾰족 말풍선", image:"사진" };
    ensureItemNumericDefaults("element", element);
    const active = transformTarget?.kind === "element" && transformTarget.id === element.id;
    const geometry = elementGeometry(element);
    $("selectedElementName").textContent = labels[element.type] || "요소";
    $("selectedElementBadge").textContent = active ? "캔버스 조작 중" : (element.type === "image" ? "사진" : "도형");
    $("toggleElementTransformBtn").textContent = active ? "핸들 닫기" : "핸들 열기";
    $("elementX").value = round(geometry.x); $("elementY").value = round(geometry.y);
    $("elementW").value = round(geometry.w); $("elementH").value = round(geometry.h);
    const isBand = element.type === "band";
    $("elementX").disabled = isBand;
    $("elementW").disabled = isBand;
    $("elementY").disabled = isBand && element.bandScope === "region";
    $("elementStrokeWidth").value = element.strokeWidth;
    $("elementRadius").value = element.radius; $("elementRadiusValue").textContent = round(element.radius);
    $("elementRotation").value = element.rotation; $("rotationValue").textContent = `${round(element.rotation)}°`;
    $("flowMargin").value = element.flowMargin; $("flowMarginValue").textContent = round(element.flowMargin);
    syncSegmented("affectFlow", element.affectFlow ? "avoid" : "overlap");
    $("elementEffect").value = element.effect; $("elementEffectSize").value = element.effectSize;
    $("elementLabel").value = element.label || ""; $("elementLabelSize").value = element.labelSize;
    syncSegmented("imageFit", element.imageFit || "contain");

    $("bandControls").classList.toggle("hidden", !isBand);
    if (isBand) {
      syncSegmented("bandScope", element.bandScope || "canvas");
      const select = $("bandRegion");
      const current = element.bandRegionId;
      select.replaceChildren();
      state.regions.filter((region) => region.acceptText && region.shape !== "line").forEach((region) => {
        const option = document.createElement("option");
        option.value = region.id;
        option.textContent = region.name;
        option.selected = current === region.id;
        select.append(option);
      });
      if (!element.bandRegionId || !state.regions.some((region) => region.id === element.bandRegionId && region.acceptText)) {
        element.bandRegionId = select.value || null;
      }
      select.value = element.bandRegionId || "";
      select.disabled = element.bandScope !== "region";
      $("bandPosition").value = Math.round(clamp(Number(element.bandPosition) || .5, 0, 1) * 100);
      $("bandPositionValue").textContent = `${$("bandPosition").value}%`;
    }
    syncStaticNumericFields(["elementX", "elementY", "elementW", "elementH", "bandPosition", "elementStrokeWidth", "elementRadius", "elementRotation", "flowMargin", "elementEffectSize", "elementLabelSize"]);
    colorFields.forEach((field) => field.update());
  }

  function syncBackgroundControls() {
    syncSegmented("orientation", state.orientation);
    $("bleedMm").value = String(state.bleedMm);
    $("backgroundMode").value = state.background.mode;
    $("gradientAngle").value = state.background.angle; $("gradientAngleValue").textContent = `${round(state.background.angle)}°`;
    $("patternType").value = state.background.pattern;
    $("patternScale").value = state.background.scale; $("patternScaleValue").textContent = round(state.background.scale);
    syncSegmented("posterBorderEnabled", state.posterBorder.enabled ? "on" : "off");
    $("posterBorderWidth").value = state.posterBorder.width; $("posterBorderWidthValue").textContent = round(state.posterBorder.width);
    $("posterBorderRadius").value = state.posterBorder.radius; $("posterBorderRadiusValue").textContent = round(state.posterBorder.radius);
    $("jpgQuality").value = Math.round(state.jpgQuality * 100); $("jpgQualityValue").textContent = `${Math.round(state.jpgQuality * 100)}%`;
    syncStaticNumericFields(["bleedMm", "gradientAngle", "patternScale", "posterBorderWidth", "posterBorderRadius", "jpgQuality"]);
  }

  function bindValue(id, getter, setter, event = "input", after = null) {
    $(id).addEventListener(event, () => {
      setter($(id).type === "number" || $(id).type === "range" ? Number($(id).value) : $(id).value);
      if (after) after();
      queueRender();
    });
  }

  function bindControls() {
    document.querySelectorAll(".tool-tab").forEach((tab) => tab.addEventListener("click", () => openToolTab(tab.dataset.toolTab)));
    $("undoBtn")?.addEventListener("click", undoHistory);
    $("redoBtn")?.addEventListener("click", redoHistory);
    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      if (!command || event.altKey) return;
      const editable = event.target && event.target.closest && event.target.closest("input, textarea, [contenteditable='true']");
      if (editable) return;
      if (key === "z" && event.shiftKey) { event.preventDefault(); redoHistory(); }
      else if (key === "z") { event.preventDefault(); undoHistory(); }
      else if (key === "y") { event.preventDefault(); redoHistory(); }
    });

    $("autoArrangeBtn").addEventListener("click", () => {
      autoArrangeTexts({ reassign: true, forceStyle: true, announce: true });
      renderTextList();
      queueRender();
      markHistoryDirty(true);
    });

    $("addTextBtn").addEventListener("click", () => {
      const text = makeText("새로운 수달 소식\n여기에 문장을 입력하세요", { role: "body", styleMode: "auto", manualProtected:false });
      const regions=state.regions.filter((region)=>region.acceptText&&region.shape!=="line");
      const occupancy=new Map(regions.map((region)=>[region.id,state.texts.filter((item)=>item.regionId===region.id).length]));
      let best=regions[0],bestScore=-Infinity;
      const facts=textFacts(text);
      regions.forEach((region)=>{
        const score=regionTextScore(region,"body",facts,occupancy.get(region.id)||0);
        if(score>bestScore){best=region;bestScore=score;}
      });
      text.regionId=best?.id||null;
      text.order=best?(occupancy.get(best.id)||0):0;
      state.texts.push(text);
      state.selectedTextId=text.id;
      if(best){
        autoDecoration(text,"body",best);
        const box=regionContentBox(best);
        text.fontSize=fitTextFontSize(sceneCtx,text,box,box.h,"body",Number(best.emphasis)||1);
      }
      normalizeTextOrders();
      renderTextList();
      queueRender();
    });

    $("addRegionBtn").addEventListener("click", () => {
      const { trimW: W, trimH: H } = dimensions();
      const region = R(`영역 ${state.regions.length + 1}`, Math.round(W * .18), Math.round(H * .18), Math.round(W * .45), Math.round(H * .28), {
        fillRole: "paper", strokeNone: true, strokeWidth: 0, radius: 22, padding: 28
      });
      region.layoutBase = { x: region.x, y: region.y, w: region.w, h: region.h };
      region.layoutDetached = false;
      region.layoutManualDelta = null;
      state.regions.push(region);
      state.selectedRegionId = region.id;
      state.selectedElementId = null;
      transformTarget = null;
      renderRegionList();
      updateRegionControls();
      updateElementControls();
      queueRender();
    });

    document.querySelectorAll("[data-add-shape]").forEach((button) => button.addEventListener("click", () => {
      const { trimW: W, trimH: H } = dimensions();
      const type = button.dataset.addShape;
      const presets = type === "heart"
        ? { fill: state.palette.tertiary, strokeNone: true, strokeWidth: 0 }
        : type === "burst"
          ? { fill: paletteColor("paper", state.palette), stroke: state.palette.secondary, strokeNone: false, strokeWidth: 4, effect: "shadow", effectSize: 12 }
          : { fill: state.palette.tertiary, strokeNone: true, strokeWidth: 0 };
      const element = makeElement(type, Math.round(W * .34), Math.round(H * .34), presets);
      state.elements.push(element);
      state.selectedElementId = element.id;
      state.selectedRegionId = null;
      transformTarget = null;
      openToolTab("elements");
      updateElementControls();
      updateRegionControls();
      queueRender();
    }));

    document.querySelectorAll("[data-add-band]").forEach((button) => button.addEventListener("click", () => {
      const { trimW: W, trimH: H } = dimensions();
      const scope = button.dataset.addBand === "region" ? "region" : "canvas";
      const region = selectedRegion()?.acceptText ? selectedRegion() : state.regions.find((item) => item.acceptText && item.shape !== "line");
      if (scope === "region" && !region) return toast("먼저 문장을 넣을 영역을 만들어 주세요.");
      const element = makeElement("band", 0, Math.round(H * .44), {
        w: W,
        h: Math.round(H * .115),
        radius: 0,
        fill: state.palette.secondary,
        strokeNone: true,
        strokeWidth: 0,
        flowMargin: -10,
        affectFlow: false,
        label: "",
        labelColor: contrastText(state.palette.secondary),
        bandScope: scope,
        bandRegionId: scope === "region" ? region.id : null,
        bandPosition: .5
      });
      state.elements.push(element);
      state.selectedElementId = element.id;
      state.selectedRegionId = null;
      transformTarget = null;
      openToolTab("elements");
      updateElementControls();
      updateRegionControls();
      queueRender();
    }));

    $("addPhotoBtn").addEventListener("click", () => $("photoInput").click());
    $("photoInput").addEventListener("change", () => {
      const file = $("photoInput").files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const { trimW: W, trimH: H } = dimensions();
        const element = makeElement("image", Math.round(W * .3), Math.round(H * .25), {
          w: Math.round(W * .38), h: Math.round(H * .48), imageSrc: String(reader.result), fillNone: true,
          stroke: "#ffffff", strokeWidth: 5, radius: 20, flowMargin: 0, affectFlow: true
        });
        state.elements.push(element);
        state.selectedElementId = element.id;
        state.selectedRegionId = null;
        transformTarget = null;
        openToolTab("elements");
        updateElementControls();
        updateRegionControls();
        queueRender();
      };
      reader.readAsDataURL(file);
      $("photoInput").value = "";
    });

    bindValue("regionGapReduction", () => globalNumericDefaults.regionGapReduction, (value) => {
      const previousGap = clamp(Number(state.regionGapReduction) || 0, 0, 72);
      state.regions.forEach((region) => {
        if (region.layoutDetached) captureRegionManualDelta(region, previousGap);
      });
      state.regionGapReduction = clamp(Number(value) || 0, 0, 72);
      $("regionGapReductionValue").textContent = regionGapLabel(state.regionGapReduction);
      applyRegionGapReduction({ force: false });
      renderRegionList();
      updateRegionControls();
      renderTemplateGrid();
    });
    $("restoreAllRegionsBtn")?.addEventListener("click", () => {
      state.regions.forEach((region) => { region.layoutDetached = false; });
      applyRegionGapReduction({ force: true });
      renderRegionList();
      updateRegionControls();
      queueRender();
      markHistoryDirty(true);
      toast("모든 영역을 템플릿 위치로 되돌렸습니다.");
    });
    $("restoreRegionLayoutBtn")?.addEventListener("click", () => {
      const region = selectedRegion();
      if (!region) return;
      restoreRegionLayout(region);
      autoStyleAssignedTexts({ force: false });
      renderRegionList();
      updateRegionControls();
      queueRender();
      markHistoryDirty(true);
      toast("선택 영역을 원래 위치로 되돌렸습니다.");
    });

    ["regionX", "regionY", "regionW", "regionH"].forEach((id) => bindValue(id, () => 0, (value) => {
      const region = selectedRegion();
      if (!region) return;
      const key = { regionX: "x", regionY: "y", regionW: "w", regionH: "h" }[id];
      region[key] = value;
      if (key === "w" || key === "h") region[key] = Math.max(20, region[key]);
      ensureRegionLayoutBase(region);
      captureRegionManualDelta(region, state.regionGapReduction);
      renderRegionList();
      autoStyleAssignedTexts({ force: false });
    }));
    bindValue("regionShape", () => "rect", (value) => { const region = selectedRegion(); if (region) region.shape = value; }, "change");
    bindValue("regionRadius", () => 0, (value) => { const region = selectedRegion(); if (region) region.radius = value; }, "input", () => $("regionRadiusValue").textContent = $("regionRadius").value);
    bindValue("regionPadding", () => 0, (value) => {
      const region = selectedRegion(); if (region) region.padding = value;
      autoStyleAssignedTexts({ force: false });
    }, "input", () => $("regionPaddingValue").textContent = $("regionPadding").value);
    bindValue("regionStrokeWidth", () => 0, (value) => { const region = selectedRegion(); if (region) region.strokeWidth = value; });
    bindValue("regionRotation", () => 0, (value) => { const region = selectedRegion(); if (region) region.rotation = value; }, "input", () => $("regionRotationValue").textContent = `${$("regionRotation").value}°`);
    bindSegmented("regionAcceptText", (value) => {
      const region = selectedRegion();
      if (!region) return;
      const next = value === "yes";
      if (!next && region.acceptText) {
        const replacement = state.regions.find((item) => item.id !== region.id && item.acceptText && item.shape !== "line");
        if (!replacement && state.texts.some((text) => text.regionId === region.id)) {
          syncSegmented("regionAcceptText", "yes");
          return toast("문장이 들어갈 다른 영역을 먼저 만들어 주세요.");
        }
        state.texts.filter((text) => text.regionId === region.id).forEach((text) => {
          text.regionId = replacement?.id || null;
          text.regionLocked = false;
          text.manualX = null;
          text.manualY = null;
        });
      }
      region.acceptText = next;
      autoArrangeTexts({ reassign: true, forceStyle: false });
      renderRegionList();
      renderTextList();
      updateRegionControls();
    });
    bindValue("regionEffect", () => "none", (value) => { const region = selectedRegion(); if (region) region.effect = value; }, "change");
    bindValue("regionEffectSize", () => 0, (value) => { const region = selectedRegion(); if (region) region.effectSize = value; });
    $("toggleRegionTransformBtn").addEventListener("click", () => toggleTransform("region", selectedRegion()?.id));
    $("deleteRegionBtn").addEventListener("click", () => {
      const region = selectedRegion();
      if (!region) return;
      if (state.regions.length === 1) return toast("영역은 하나 이상 필요합니다.");
      state.regions = state.regions.filter((item) => item.id !== region.id);
      const replacement = state.regions.find((item) => item.acceptText && item.shape !== "line");
      state.texts.filter((text) => text.regionId === region.id).forEach((text) => {
        text.regionId = replacement?.id || null;
        text.regionLocked = false;
        text.manualX = null;
        text.manualY = null;
      });
      state.elements.filter((element) => element.type === "band" && element.bandRegionId === region.id).forEach((element) => {
        element.bandRegionId = replacement?.id || null;
        if (!replacement) element.bandScope = "canvas";
      });
      state.selectedRegionId = null;
      transformTarget = null;
      autoArrangeTexts({ reassign: true, forceStyle: false });
      renderRegionList();
      renderTextList();
      updateRegionControls();
      updateElementControls();
      queueRender();
    });

    const setElementGeometry = (key, value) => {
      const element = selectedElement();
      if (!element) return;
      if (element.type === "band") {
        if (key === "h") element.h = Math.max(18, value);
        else if (key === "y" && element.bandScope === "canvas") element.y = value;
      } else {
        if(element.type==="image"&&(key==="w"||key==="h")){
          const ratio=Math.max(.01,(Number(element.w)||20)/Math.max(1,Number(element.h)||20));
          if(key==="w"){element.w=Math.max(20,value);element.h=Math.max(20,element.w/ratio);}
          else{element.h=Math.max(20,value);element.w=Math.max(20,element.h*ratio);}
        }else{
          element[key]=value;
          if(key==="w"||key==="h")element[key]=Math.max(20,element[key]);
        }
        if (element.type === "image") {
          const { trimW, trimH } = dimensions();
          const constrained = clampImageToMinimumOverlap(
            Number(element.x) || 0, Number(element.y) || 0,
            Number(element.w) || 20, Number(element.h) || 20,
            trimW, trimH, .05
          );
          element.x = constrained.x;
          element.y = constrained.y;
          element.imageFit = "contain";
        }
      }
      updateElementControls();
    };
    ["elementX", "elementY", "elementW", "elementH"].forEach((id) => {
      $(id).addEventListener("input", () => {
        const key = { elementX: "x", elementY: "y", elementW: "w", elementH: "h" }[id];
        setElementGeometry(key, Number($(id).value));
        queueRender();
      });
    });
    bindValue("elementStrokeWidth", () => 0, (value) => { const element = selectedElement(); if (element) element.strokeWidth = value; });
    bindValue("elementRadius", () => 0, (value) => { const element = selectedElement(); if (element) element.radius = value; }, "input", () => $("elementRadiusValue").textContent = $("elementRadius").value);
    bindValue("elementRotation", () => 0, (value) => { const element = selectedElement(); if (element) element.rotation = value; }, "input", () => $("rotationValue").textContent = `${$("elementRotation").value}°`);
    bindValue("flowMargin", () => 0, (value) => { const element = selectedElement(); if (element) element.flowMargin = value; }, "input", () => $("flowMarginValue").textContent = $("flowMargin").value);
    bindSegmented("affectFlow", (value) => { const element = selectedElement(); if (element) element.affectFlow = value === "avoid"; });
    bindValue("elementEffect", () => "none", (value) => { const element = selectedElement(); if (element) element.effect = value; }, "change");
    bindValue("elementEffectSize", () => 0, (value) => { const element = selectedElement(); if (element) element.effectSize = value; });
    bindValue("elementLabel", () => "", (value) => { const element = selectedElement(); if (element) element.label = value; });
    bindValue("elementLabelSize", () => 0, (value) => { const element = selectedElement(); if (element) element.labelSize = value; });
    bindSegmented("imageFit", (value) => { const element = selectedElement(); if (element) element.imageFit = value; });
    bindSegmented("bandScope", (value) => {
      const element = selectedElement();
      if (!element || element.type !== "band") return;
      element.bandScope = value;
      if (value === "region") {
        const region = state.regions.find((item) => item.id === element.bandRegionId && item.acceptText) || selectedRegion() || state.regions.find((item) => item.acceptText && item.shape !== "line");
        if (!region) {
          element.bandScope = "canvas";
          syncSegmented("bandScope", "canvas");
          return toast("글자 영역을 먼저 만들어 주세요.");
        }
        element.bandRegionId = region.id;
      }
      updateElementControls();
    });
    $("bandRegion").addEventListener("change", () => {
      const element = selectedElement();
      if (!element || element.type !== "band") return;
      element.bandRegionId = $("bandRegion").value || null;
      updateElementControls();
      queueRender();
    });
    $("bandPosition").addEventListener("input", () => {
      const element = selectedElement();
      if (!element || element.type !== "band") return;
      element.bandPosition = Number($("bandPosition").value) / 100;
      $("bandPositionValue").textContent = `${$("bandPosition").value}%`;
      updateElementControls();
      queueRender();
    });
    $("toggleElementTransformBtn").addEventListener("click", () => toggleTransform("element", selectedElement()?.id));
    $("deleteElementBtn").addEventListener("click", () => {
      const element = selectedElement();
      if (!element) return;
      state.elements = state.elements.filter((item) => item.id !== element.id);
      state.selectedElementId = null;
      transformTarget = null;
      updateElementControls();
      queueRender();
    });

    bindSegmented("orientation", (value) => changeOrientation(value));
    bindValue("bleedMm", () => globalNumericDefaults.bleedMm, (value) => {
      state.bleedMm = clamp(Number(value) || 0, 0, 30);
      updateCanvasMeta();
    });
    bindValue("backgroundMode", () => "solid", (value) => state.background.mode = value, "change");
    bindValue("gradientAngle", () => 0, (value) => state.background.angle = value, "input", () => $("gradientAngleValue").textContent = `${$("gradientAngle").value}°`);
    bindValue("patternType", () => "dots", (value) => state.background.pattern = value, "change");
    bindValue("patternScale", () => 48, (value) => state.background.scale = value, "input", () => $("patternScaleValue").textContent = $("patternScale").value);
    bindSegmented("posterBorderEnabled", (value) => { state.posterBorder.enabled = value === "on"; });
    bindValue("posterBorderWidth", () => 0, (value) => state.posterBorder.width = value, "input", () => $("posterBorderWidthValue").textContent = $("posterBorderWidth").value);
    bindValue("posterBorderRadius", () => 0, (value) => state.posterBorder.radius = value, "input", () => $("posterBorderRadiusValue").textContent = $("posterBorderRadius").value);
    $("jpgQuality").addEventListener("input", () => { state.jpgQuality = Number($("jpgQuality").value) / 100; $("jpgQualityValue").textContent = `${$("jpgQuality").value}%`; });
    $("showRegions").addEventListener("change", () => { state.showRegions = $("showRegions").checked; queueRender(); });

    $("resetBtn").addEventListener("click", () => {
      state = deepClone(initialState);
      itemNumericDefaults.clear();
      textNumericDefaults.clear();
      transformTarget = null;
      applyTemplate("street-alert", { preserveTexts: false });
      initializeHistory();
      toast("처음 상태로 되돌렸습니다.");
    });
    [["exportPngBtn", "png"], ["exportPngBtn2", "png"], ["exportJpgBtn", "jpg"], ["exportJpgBtn2", "jpg"]].forEach(([id, type]) => {
      const button = $(id);
      if (button) button.addEventListener("click", () => exportImage(type));
    });
  }

  function changeOrientation(next) {
    if (next === state.orientation) return;
    const old = dimensions();
    state.orientation = next;
    const fresh = dimensions();
    const sx = fresh.trimW / old.trimW; const sy = fresh.trimH / old.trimH;
    state.regions.forEach((r)=>{
      r.x*=sx;r.y*=sy;r.w*=sx;r.h*=sy;r.padding*=Math.min(sx,sy);
      if(r.layoutBase){r.layoutBase.x*=sx;r.layoutBase.y*=sy;r.layoutBase.w*=sx;r.layoutBase.h*=sy;}
      if(r.layoutManualDelta){r.layoutManualDelta.x*=sx;r.layoutManualDelta.y*=sy;r.layoutManualDelta.w*=sx;r.layoutManualDelta.h*=sy;}
    });
    state.elements.forEach((e)=>{e.x*=sx;e.y*=sy;e.w*=sx;e.h*=sy;});
    state.texts.forEach((t)=>{if(t.manualX!=null)t.manualX*=sx;if(t.manualY!=null)t.manualY*=sy;});
    updateCanvasMeta(); updateRegionControls(); updateElementControls(); queueRender();
  }

  function elementGeometry(element) {
    if (!element || element.type !== "band") return element;
    const { trimW } = dimensions();
    if ((element.bandScope || "canvas") === "region") {
      const region = state.regions.find((item) => item.id === element.bandRegionId && item.acceptText) || state.regions.find((item) => item.acceptText && item.shape !== "line");
      if (region) {
        const position = clamp(Number(element.bandPosition) || .5, 0, 1);
        return {
          ...element,
          x: region.x,
          y: region.y + region.h * position - element.h / 2,
          w: region.w,
          h: element.h,
          clipRegion: region
        };
      }
    }
    return { ...element, x: 0, w: trimW, y: element.y, h: element.h, clipRegion: null };
  }

  function rotatePoint(point, center, degrees) {
    const angle = (degrees || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = point.x - center.x, dy = point.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  }

  function localPoint(point, item) {
    const center = { x: item.x + item.w / 2, y: item.y + item.h / 2 };
    return rotatePoint(point, center, -(item.rotation || 0));
  }

  function pointInItem(point, item, padding = 0) {
    const local = localPoint(point, item);
    return local.x >= item.x - padding && local.x <= item.x + item.w + padding && local.y >= item.y - padding && local.y <= item.y + item.h + padding;
  }

  function clipItemPath(c, item) {
    const center = { x:item.x+item.w/2, y:item.y+item.h/2 };
    const angle = (item.rotation||0)*Math.PI/180;
    c.translate(center.x,center.y);c.rotate(angle);c.translate(-center.x,-center.y);
    shapePath(c,item);c.clip();
    c.translate(center.x,center.y);c.rotate(-angle);c.translate(-center.x,-center.y);
  }

  function itemHandlePoints(item) {
    const center = { x: item.x + item.w / 2, y: item.y + item.h / 2 };
    const raw = {
      nw: { x: item.x, y: item.y },
      ne: { x: item.x + item.w, y: item.y },
      se: { x: item.x + item.w, y: item.y + item.h },
      sw: { x: item.x, y: item.y + item.h },
      rotate: { x: item.x + item.w / 2, y: item.y - Math.max(58, Math.min(92, item.h * .18)) }
    };
    return Object.fromEntries(Object.entries(raw).map(([key, point]) => [key, rotatePoint(point, center, item.rotation || 0)]));
  }

  function transformHandleAt(point, item) {
    const handles = itemHandlePoints(item);
    const radius = 30;
    for (const key of ["rotate", "nw", "ne", "se", "sw"]) {
      if (Math.hypot(point.x - handles[key].x, point.y - handles[key].y) <= radius) return key;
    }
    return pointInItem(point, item, 6) ? "move" : null;
  }

  function roundedRectPath(c, x, y, w, h, radius) {
    const r = clamp(radius || 0, 0, Math.min(w,h)/2);
    c.beginPath();
    if (typeof c.roundRect === "function") c.roundRect(x,y,w,h,r);
    else {
      c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
      c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
      c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
    }
  }

  function burstPath(c, x, y, w, h, points = 22) {
    const cx=x+w/2, cy=y+h/2, rx=w/2, ry=h/2;
    c.beginPath();
    for(let i=0;i<points*2;i++){
      const a=-Math.PI/2+i*Math.PI/points;
      const scale=i%2===0?1:.72;
      const px=cx+Math.cos(a)*rx*scale, py=cy+Math.sin(a)*ry*scale;
      if(i===0)c.moveTo(px,py);else c.lineTo(px,py);
    }
    c.closePath();
  }

  function heartPath(c, x, y, w, h) {
    c.beginPath();
    c.moveTo(x+w/2,y+h*.92);
    c.bezierCurveTo(x+w*.08,y+h*.62,x,y+h*.34,x+w*.24,y+h*.18);
    c.bezierCurveTo(x+w*.40,y+h*.07,x+w*.49,y+h*.19,x+w*.5,y+h*.30);
    c.bezierCurveTo(x+w*.51,y+h*.19,x+w*.60,y+h*.07,x+w*.76,y+h*.18);
    c.bezierCurveTo(x+w,y+h*.34,x+w*.92,y+h*.62,x+w/2,y+h*.92);
    c.closePath();
  }

  function shapePath(c, item) {
    if(item.shape === "ellipse" || item.type === "circle") { c.beginPath(); c.ellipse(item.x+item.w/2,item.y+item.h/2,item.w/2,item.h/2,0,0,Math.PI*2); }
    else if(item.shape === "burst" || item.type === "burst") burstPath(c,item.x,item.y,item.w,item.h);
    else if(item.type === "heart") heartPath(c,item.x,item.y,item.w,item.h);
    else roundedRectPath(c,item.x,item.y,item.w,item.h,item.radius||0);
  }

  function withItemTransform(c, item, callback) {
    c.save();
    const cx=item.x+item.w/2, cy=item.y+item.h/2;
    c.translate(cx,cy); c.rotate((item.rotation||0)*Math.PI/180); c.translate(-cx,-cy);
    callback(); c.restore();
  }

  function makeBackgroundFill(c, x, y, w, h) {
    const bg=state.background;
    if(bg.mode === "gradient" || bg.mode === "gradientPattern") {
      const a=(bg.angle||0)*Math.PI/180;
      const cx=x+w/2, cy=y+h/2, len=Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a));
      const dx=Math.cos(a)*len/2, dy=Math.sin(a)*len/2;
      const g=c.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);
      g.addColorStop(0,bg.c1); g.addColorStop(1,bg.c2); return g;
    }
    return bg.c1;
  }

  function drawPattern(c, x, y, w, h) {
    const bg=state.background;
    if(!(bg.mode === "pattern" || bg.mode === "gradientPattern")) return;
    const s=Math.max(8,bg.scale||48);
    c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();
    c.strokeStyle=bg.patternColor; c.fillStyle=bg.patternColor; c.globalAlpha=.28;
    c.lineWidth=Math.max(2,s*.07);
    if(bg.pattern === "stripes") {
      for(let i=-h;i<w+h;i+=s){c.beginPath();c.moveTo(x+i,y);c.lineTo(x+i-h,y+h);c.stroke();}
    } else if(bg.pattern === "dots") {
      for(let yy=y+s/2;yy<y+h;yy+=s)for(let xx=x+s/2;xx<x+w;xx+=s){c.beginPath();c.arc(xx,yy,s*.12,0,Math.PI*2);c.fill();}
    } else if(bg.pattern === "checker") {
      for(let yy=y;yy<y+h;yy+=s)for(let xx=x;xx<x+w;xx+=s)if(((xx-x)/s+(yy-y)/s)%2===0)c.fillRect(xx,yy,s,s);
    } else if(bg.pattern === "grid") {
      for(let xx=x;xx<=x+w;xx+=s){c.beginPath();c.moveTo(xx,y);c.lineTo(xx,y+h);c.stroke();}
      for(let yy=y;yy<=y+h;yy+=s){c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke();}
    } else if(bg.pattern === "stars") {
      c.font=`${Math.round(s*.45)}px sans-serif`; c.textAlign="center"; c.textBaseline="middle";
      for(let yy=y+s/2;yy<y+h;yy+=s)for(let xx=x+s/2;xx<x+w;xx+=s)c.fillText("✦",xx,yy);
    }
    c.restore();
  }

  function drawFlatShapeShadow(c, item) {
    if (item.effect !== "shadow") return;
    const offset = clamp(Number(item.effectSize) || 0, 0, 100) * .55;
    const shadowColor = resolveColor(item, "effectColor") || "#111111";
    c.save();
    c.shadowColor = "transparent";
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
    c.translate(offset, offset);
    shapePath(c, item);
    if (item.fillNone && item.type !== "image") {
      c.strokeStyle = shadowColor;
      c.lineWidth = Math.max(3, Number(item.strokeWidth) || Number(item.effectSize) * .28 || 3);
      c.stroke();
    } else {
      c.fillStyle = shadowColor;
      c.fill();
    }
    c.restore();
  }

  function applyShapeEffect(c, item) {
    if (item.effect === "glow") {
      c.shadowColor = resolveColor(item, "effectColor") || "#ffffff";
      c.shadowBlur = item.effectSize;
      c.shadowOffsetX = 0;
      c.shadowOffsetY = 0;
    }
  }

  function drawShapeExtrusion(c, item) {
    if (item.effect !== "extrude") return;
    const depth = clamp(Number(item.effectSize) || 16, 3, 70);
    const step = depth > 34 ? 2 : 1;
    const sideColor = resolveColor(item, "effectColor") || "#111111";
    c.shadowColor = "transparent";
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;

    // Build a solid, flat-color extrusion only. No drop shadow, blur, or
    // depth-dependent color mixing, so the side face stays crisp and uniform.
    for (let offset = depth; offset >= 1; offset -= step) {
      c.save();
      c.translate(offset * .58, offset * .58);
      shapePath(c, item);
      c.fillStyle = sideColor;
      c.fill();
      if (!item.strokeNone && item.strokeWidth > 0) {
        shapePath(c, item);
        c.strokeStyle = sideColor;
        c.lineWidth = Math.max(1, item.strokeWidth * .45);
        c.stroke();
      }
      c.restore();
    }
  }

  function drawRegion(c, region) {
    withItemTransform(c, region, () => {
      c.save();
      if (region.effect === "extrude") drawShapeExtrusion(c, region);
      drawFlatShapeShadow(c, region);
      applyShapeEffect(c, region);
      if (region.shape === "line") {
        if (!region.fillNone) {
          c.fillStyle = resolveColor(region, "fill");
          roundedRectPath(c, region.x, region.y, region.w, Math.max(2, region.h), region.radius);
          c.fill();
        }
      } else {
        if (region.effect === "hollow") {
          c.save();
          c.translate(region.effectSize * .45, region.effectSize * .45);
          shapePath(c, region);
          c.strokeStyle = resolveColor(region, "effectColor");
          c.lineWidth = Math.max(3, region.effectSize * .28);
          c.stroke();
          c.restore();
        }
        shapePath(c, region);
        if (!region.fillNone) { c.fillStyle = resolveColor(region, "fill"); c.fill(); }
        if (!region.strokeNone && region.strokeWidth > 0) {
          shapePath(c, region);
          c.strokeStyle = resolveColor(region, "stroke");
          c.lineWidth = region.strokeWidth;
          c.stroke();
        }
      }
      c.restore();
    });
  }

  function getImage(src) {
    if(!src) return null;
    if(imageCache.has(src)) return imageCache.get(src);
    const img=new Image(); img.onload=()=>queueRender(); img.src=src; imageCache.set(src,img); return img;
  }

  function drawElement(c, element) {
    const item = elementGeometry(element);
    c.save();
    if (item.clipRegion) clipItemPath(c, item.clipRegion);
    withItemTransform(c, item, () => {
      c.save();
      if (item.effect === "extrude") drawShapeExtrusion(c, item);
      drawFlatShapeShadow(c, item);
      applyShapeEffect(c, item);
      if (item.effect === "hollow") {
        c.save();
        c.translate(item.effectSize * .45, item.effectSize * .45);
        shapePath(c, item);
        c.strokeStyle = resolveColor(item, "effectColor");
        c.lineWidth = Math.max(3, item.effectSize * .28);
        c.stroke();
        c.restore();
      }
      if (item.type === "image") {
        shapePath(c, item);
        c.clip();
        if (!item.fillNone) { c.fillStyle = item.fill; c.fillRect(item.x, item.y, item.w, item.h); }
        const img = getImage(item.imageSrc);
        if (img?.complete && img.naturalWidth) {
          const ir = img.naturalWidth / img.naturalHeight, er = item.w / item.h;
          let dw, dh, dx, dy;
          if ((item.imageFit || "contain") === "contain") {
            if (ir > er) { dw = item.w; dh = dw / ir; dx = item.x; dy = item.y + (item.h - dh) / 2; }
            else { dh = item.h; dw = dh * ir; dy = item.y; dx = item.x + (item.w - dw) / 2; }
          } else {
            if (ir > er) { dh = item.h; dw = dh * ir; dy = item.y; dx = item.x + (item.w - dw) / 2; }
            else { dw = item.w; dh = dw / ir; dx = item.x; dy = item.y + (item.h - dh) / 2; }
          }
          c.drawImage(img, dx, dy, dw, dh);
        }
        c.restore();
        c.save();
        if (!item.strokeNone && item.strokeWidth > 0) {
          shapePath(c, item); c.strokeStyle = item.stroke; c.lineWidth = item.strokeWidth; c.stroke();
        }
      } else {
        shapePath(c, item);
        if (!item.fillNone) { c.fillStyle = item.fill; c.fill(); }
        if (!item.strokeNone && item.strokeWidth > 0) {
          shapePath(c, item); c.strokeStyle = item.stroke; c.lineWidth = item.strokeWidth; c.stroke();
        }
      }
      c.shadowColor = "transparent";
      if (item.label) {
        c.fillStyle = item.labelColor || "#111111";
        c.font = `700 ${item.labelSize || 64}px ${fontFamilies.dotum}`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        const maxW = item.w * .82;
        const measured = c.measureText(item.label).width;
        const sx = Math.min(1, maxW / Math.max(1, measured));
        c.save();
        c.translate(item.x + item.w / 2, item.y + item.h / 2);
        c.scale(sx, 1);
        c.fillText(item.label, 0, 0);
        c.restore();
      }
      c.restore();
    });
    c.restore();
  }

  function drawBaseScene(c) {
    const { trimW:W,trimH:H,bleed,fullW,fullH}=dimensions();
    c.save(); c.clearRect(0,0,fullW,fullH);
    c.fillStyle=makeBackgroundFill(c,0,0,fullW,fullH); c.fillRect(0,0,fullW,fullH); drawPattern(c,0,0,fullW,fullH);
    c.translate(bleed,bleed);
    c.beginPath();c.rect(0,0,W,H);c.clip();
    state.regions.forEach((r)=>drawRegion(c,r));
    state.elements.forEach((e)=>drawElement(c,e));
    if(state.posterBorder.enabled && state.posterBorder.width>0){
      c.save(); c.strokeStyle=state.posterBorder.color;c.lineWidth=state.posterBorder.width;
      roundedRectPath(c,state.posterBorder.width/2,state.posterBorder.width/2,W-state.posterBorder.width,H-state.posterBorder.width,state.posterBorder.radius);
      c.stroke(); c.restore();
    }
    c.restore();
  }

  function decoratedLine(text, raw, lineStart) {
    let body=[];
    [...raw].forEach((ch,i)=>body.push({ch,index:lineStart+i}));

    const insertBetweenWords=(items,symbol)=>{
      const out=[];
      items.forEach((item)=>{
        if(/\s/.test(item.ch)) out.push({ch:` ${symbol} `,index:null});
        else out.push(item);
      });
      return out;
    };
    const insertBetweenCharacters=(items,symbol)=>{
      const out=[];
      items.forEach((item,index)=>{
        out.push(item);
        const next=items[index+1];
        if(next && !/\s/.test(item.ch) && !/\s/.test(next.ch)) out.push({ch:symbol,index:null});
      });
      return out;
    };
    const applySelectedUnicode=(items,range)=>{
      const symbol=String(range.customUnicode||range.symbol||"★");
      const start=Math.max(0,Number(range.start)||0),end=Math.max(start+1,Number(range.end)||start+1);
      if((range.placement||"word")==="char"){
        const out=[];
        items.forEach((item,index)=>{
          out.push(item);
          const next=items[index+1];
          const inside=item.index!=null&&next?.index!=null&&item.index>=start&&next.index<end;
          if(inside&&!/\s/.test(item.ch)&&!/\s/.test(next.ch))out.push({ch:symbol,index:null});
        });
        return out;
      }
      return items.map((item)=>item.index!=null&&item.index>=start&&item.index<end&&/\s/.test(item.ch)
        ?{ch:` ${symbol} `,index:null}
        :item);
    };

    (text.rangeUnicodes||[]).forEach((range)=>{body=applySelectedUnicode(body,range);});

    const wordSymbols={slash:"/",dot:"·",star:"★",heart:"♥",block:"■",bullet:"•"};
    const characterSymbols={slashChar:"/",dotChar:"·",starChar:"★",heartChar:"♥",blockChar:"■",bulletChar:"•"};
    if(wordSymbols[text.unicodeStyle]) body=insertBetweenWords(body,wordSymbols[text.unicodeStyle]);
    else if(characterSymbols[text.unicodeStyle]) body=insertBetweenCharacters(body,characterSymbols[text.unicodeStyle]);
    else if(text.unicodeStyle==="custom") body=(text.unicodePlacement||"word")==="char"
      ? insertBetweenCharacters(body,text.customUnicode||"★")
      : insertBetweenWords(body,text.customUnicode||"★");
    else if(text.unicodeStyle==="wrapQuote") body=[{ch:"『",index:null},...body,{ch:"』",index:null}];
    else if(text.unicodeStyle==="wrapPhone") body=[{ch:"☎ ",index:null},...body,{ch:" ☎",index:null}];
    else if(text.unicodeStyle==="wrapCard") body=[{ch:"♠ ",index:null},...body,{ch:" ♠",index:null}];
    else if(text.unicodeStyle==="glitch") {
      const marks=["@","*","●","/","₩"];
      // 문장을 다시 그릴 때마다 기호가 흔들리지 않도록 텍스트별 시드를 쓰되,
      // 고정 순환 대신 각 삽입 지점의 기호 순서를 의사난수로 섞습니다.
      const seedSource=`${text.id||""}|${raw}|${text.unicodeRandomSeed||""}`;
      let seed=2166136261;
      for(const ch of seedSource){
        seed^=ch.codePointAt(0);
        seed=Math.imul(seed,16777619)>>>0;
      }
      const random=()=>{
        seed=(seed+0x6D2B79F5)>>>0;
        let value=seed;
        value=Math.imul(value^(value>>>15),value|1);
        value^=value+Math.imul(value^(value>>>7),value|61);
        return ((value^(value>>>14))>>>0)/4294967296;
      };
      const out=[];
      let count=0;
      let previous=-1;
      body.forEach((item)=>{
        out.push(item);
        if(!item.ch.trim() || ++count%3!==0)return;
        let index=Math.floor(random()*marks.length);
        if(marks.length>1 && index===previous)index=(index+1+Math.floor(random()*(marks.length-1)))%marks.length;
        previous=index;
        out.push({ch:marks[index],index:null});
      });
      body=out;
    }
    if(text.prefixEnabled && raw.trim()) body=[{ch:`${text.prefixSymbol||"•"}${" ".repeat(Math.max(1,Math.round((text.prefixGap||12)/10)))}`,index:null},...body];
    return body;
  }

  function setTextFont(c,text,fontSize){
    c.font=`${text.italic?"italic ":""}${text.bold?700:500} ${fontSize}px ${fontFamilies[text.fontFamily]||fontFamilies.dotum}`;
  }

  function tokenWidth(c,tokens,letterSpacing){
    let w=0, chars=0;
    tokens.forEach((t)=>{for(const ch of t.ch){w+=c.measureText(ch).width;chars++;}});
    return Math.max(0,w+Math.max(0,chars-1)*letterSpacing);
  }

  function colorAtIndex(text,index,base){
    if(index==null)return base;
    for(let i=text.rangeColors.length-1;i>=0;i--){const r=text.rangeColors[i];if(index>=r.start&&index<r.end)return r.color;}
    return base;
  }

  function sampleSceneColor(x,y){
    const {bleed,fullW,fullH}=dimensions();
    const px=clamp(Math.round(x+bleed),0,fullW-1),py=clamp(Math.round(y+bleed),0,fullH-1);
    try{const d=sceneCtx.getImageData(px,py,1,1).data;return rgbToHex({r:d[0],g:d[1],b:d[2]});}catch{return state.background.c1;}
  }

  function regionContentBox(region){
    let pad=Math.max(0,region.padding||0);
    if(region.shape==="ellipse") pad += Math.min(region.w,region.h)*.10;
    if(region.shape==="burst") pad += Math.min(region.w,region.h)*.14;
    return {x:region.x+pad,y:region.y+pad,w:Math.max(10,region.w-pad*2),h:Math.max(10,region.h-pad*2)};
  }

  function obstacleRects(){
    return state.elements.filter((element) => element.affectFlow).map((element) => {
      const item = elementGeometry(element);
      const margin = element.flowMargin || 0;
      return { x:item.x-margin, y:item.y-margin, w:item.w+margin*2, h:item.h+margin*2, id:element.id };
    }).filter((rect) => rect.w > 0 && rect.h > 0);
  }

  function subtractIntervals(intervals,cutStart,cutEnd){
    const out=[];
    intervals.forEach(([a,b])=>{
      if(cutEnd<=a||cutStart>=b)out.push([a,b]);
      else{if(cutStart>a)out.push([a,Math.max(a,cutStart)]);if(cutEnd<b)out.push([Math.min(b,cutEnd),b]);}
    });
    return out.filter(([a,b])=>b-a>12);
  }

  function availableIntervals(box,y,h,obstacles){
    let intervals=[[box.x,box.x+box.w]];
    obstacles.forEach((o)=>{if(y+h>o.y&&y<o.y+o.h)intervals=subtractIntervals(intervals,o.x,o.x+o.w);});
    return intervals;
  }

  function findPlacement(box,y,h,desiredW,obstacles){
    let probe=clamp(y,box.y,Math.max(box.y,box.y+box.h-h));
    for(let loops=0;loops<80;loops++){
      const intervals=availableIntervals(box,probe,h,obstacles).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
      if(intervals.length){
        const interval=intervals[0];
        return {x:interval[0],y:probe,w:interval[1]-interval[0],fit:Math.min(1,(interval[1]-interval[0])/Math.max(1,desiredW))};
      }
      const next=obstacles.filter((o)=>probe+h>o.y&&probe<o.y+o.h).reduce((m,o)=>Math.max(m,o.y+o.h+4),probe+8);
      if(next+h>box.y+box.h)break; probe=next;
    }
    return {x:box.x,y:clamp(probe,box.y,Math.max(box.y,box.y+box.h-h)),w:box.w,fit:Math.min(1,box.w/Math.max(1,desiredW))};
  }

  function flattenTokens(tokens){
    const chars=[];
    tokens.forEach((token)=>{ for(const ch of token.ch) chars.push({ch,index:token.index}); });
    return chars;
  }

  function wrapDecoratedLine(c,text,raw,lineStart,maxWidth){
    const chars=flattenTokens(decoratedLine(text,raw,lineStart));
    if(!chars.length)return [{raw:"",tokens:[],width:0}];
    const limit=Math.max(20,maxWidth/Math.max(.2,text.scaleX));
    const lines=[];
    let current=[]; let width=0; let lastBreak=-1;

    const recalc=()=>tokenWidth(c,current,text.letterSpacing);
    const pushLine=(items)=>{
      const trimmed=[...items];
      while(trimmed.length&&/^\s$/.test(trimmed[0].ch))trimmed.shift();
      while(trimmed.length&&/^\s$/.test(trimmed.at(-1).ch))trimmed.pop();
      lines.push({raw:trimmed.map((x)=>x.ch).join(""),tokens:trimmed,width:tokenWidth(c,trimmed,text.letterSpacing)});
    };

    chars.forEach((item)=>{
      const cw=c.measureText(item.ch).width+(current.length?text.letterSpacing:0);
      if(current.length&&width+cw>limit){
        if(lastBreak>=0){
          const head=current.slice(0,lastBreak+1);
          const tail=current.slice(lastBreak+1);
          pushLine(head);
          current=tail;
          width=recalc();
        }else{
          pushLine(current);
          current=[]; width=0;
        }
        lastBreak=-1;
        current.forEach((x,i)=>{if(/\s/.test(x.ch))lastBreak=i;});
      }
      current.push(item);
      width+=c.measureText(item.ch).width+(current.length>1?text.letterSpacing:0);
      if(/\s/.test(item.ch))lastBreak=current.length-1;
    });
    if(current.length||!lines.length)pushLine(current);
    return lines;
  }

  function layoutTextLines(c,text,fontSize,maxWidth,options={}){
    setTextFont(c,text,fontSize);
    let charStart=0;
    const lines=[];
    const forceNoWrap = options.forceNoWrap ?? Boolean(text.autoNoWrap || text.autoLayoutNoWrap);
    text.text.split("\n").forEach((raw)=>{
      if (forceNoWrap) {
        const tokens = decoratedLine(text,raw,charStart);
        lines.push({ raw, tokens, width:tokenWidth(c,flattenTokens(tokens),text.letterSpacing) });
      } else {
        lines.push(...wrapDecoratedLine(c,text,raw,charStart,maxWidth));
      }
      charStart+=raw.length+1;
    });
    return lines;
  }

  function buildLayout(c){
    const fragments=[];
    const obstacles=obstacleRects();
    let overflow=false;
    const {trimH}=dimensions();

    state.regions.filter((r)=>r.acceptText&&r.shape!=="line").forEach((region)=>{
      const box=regionContentBox(region);
      const texts=state.texts.filter((t)=>t.regionId===region.id).sort((a,b)=>a.order-b.order);
      if(!texts.length)return;

      let commonScale=1;
      let estimated=[];
      for(let pass=0;pass<3;pass++){
        estimated=texts.map((text)=>{
          const fontSize=Math.max(12,text.fontSize*commonScale);
          const lines=layoutTextLines(c,text,fontSize,box.w);
          const lineH=fontSize*text.lineHeight;
          const h=Math.max(lineH,lines.length*lineH);
          return {text,fontSize,lines,lineH,h};
        });
        const total=estimated.reduce((sum,item)=>sum+item.h+item.text.gap*commonScale,0)-texts.at(-1).gap*commonScale;
        if(total<=box.h+1)break;
        commonScale*=clamp(box.h/Math.max(1,total),.55,.98);
      }
      commonScale=Math.max(.28,commonScale);
      estimated=texts.map((text)=>{
        const fontSize=Math.max(12,text.fontSize*commonScale);
        const lines=layoutTextLines(c,text,fontSize,box.w);
        const lineH=fontSize*text.lineHeight;
        return {text,fontSize,lines,lineH,h:Math.max(lineH,lines.length*lineH)};
      });

      const groupHeight=estimated.reduce((sum,item)=>sum+item.h+item.text.gap*commonScale,0)-texts.at(-1).gap*commonScale;
      const centerSingle=texts.length===1&&(region.shape!=="rect"||region.radius>55||region.h<trimH*.34);
      const verticalAlign = region.textVAlign || (centerSingle ? "center" : "top");
      let cursorY = verticalAlign === "center"
        ? box.y + Math.max(0, (box.h - groupHeight) / 2)
        : verticalAlign === "bottom"
          ? box.y + Math.max(0, box.h - groupHeight)
          : box.y;

      estimated.forEach((estimate)=>{
        const {text,fontSize,lineH}=estimate;
        let lines=estimate.lines;
        let blockH=estimate.h;
        let desiredW=Math.max(1,...lines.map((l)=>l.width*text.scaleX));
        let place;

        if(text.manualX!=null&&text.manualY!=null){
          const y=clamp(text.manualY,box.y,Math.max(box.y,box.y+box.h-blockH));
          const intervals=availableIntervals(box,y,blockH,obstacles);
          const preferred=clamp(text.manualX,box.x,box.x+box.w-20);
          const interval=intervals.find(([a,b])=>preferred>=a&&preferred<=b)||intervals[0]||[box.x,box.x+box.w];
          const placedX=clamp(preferred,interval[0],Math.max(interval[0],interval[1]-20));
          const availableW=Math.max(20,interval[1]-placedX);
          lines=layoutTextLines(c,text,fontSize,availableW);
          blockH=Math.max(lineH,lines.length*lineH);
          desiredW=Math.max(1,...lines.map((l)=>l.width*text.scaleX));
          place={x:placedX,y:clamp(y,box.y,Math.max(box.y,box.y+box.h-blockH)),w:availableW,fit:Math.min(1,availableW/desiredW)};
        }else{
          place=findPlacement(box,cursorY,blockH,desiredW,obstacles);
          lines=layoutTextLines(c,text,fontSize,place.w);
          blockH=Math.max(lineH,lines.length*lineH);
          desiredW=Math.max(1,...lines.map((l)=>l.width*text.scaleX));
          place=findPlacement(box,place.y,blockH,desiredW,obstacles);
          cursorY=place.y+blockH+text.gap*commonScale;
        }

        if(place.y+blockH>box.y+box.h+1)overflow=true;
        fragments.push({text,region,lines,fontSize,lineH,x:place.x,y:place.y,w:place.w,h:blockH,fit:Math.max(.55,place.fit),box});
      });
    });
    return {fragments,overflow};
  }


  function drawTokenLine(c,fragment,line,lineIndex,baseColor,resolvedEffectColor=null){
    const {text,fontSize,lineH}=fragment;
    setTextFont(c,text,fontSize);
    const sx=Math.max(.2,text.scaleX*fragment.fit);
    const unscaledW=line.width;
    const scaledW=unscaledW*sx;
    let startX=fragment.x;
    if(text.align==="center")startX=fragment.x+(fragment.w-scaledW)/2;
    if(text.align==="right")startX=fragment.x+fragment.w-scaledW;
    const y=fragment.y+lineIndex*lineH+fontSize*.82;
    c.save(); c.translate(startX,y); c.scale(sx,1); c.textAlign="left"; c.textBaseline="alphabetic";
    // Text shadow and extrusion are always rendered as crisp, flat copies.
    // Clear any inherited Canvas shadow state so extrusion never gains a drop shadow.
    c.shadowColor="transparent";
    c.shadowBlur=0;
    c.shadowOffsetX=0;
    c.shadowOffsetY=0;

    const drawGlyphs=(offsetX=0,offsetY=0,colorOverride=null,stroke=false,strokeWidth=0)=>{
      let pen=0;
      for(const token of line.tokens){
        for(const ch of token.ch){
          const color=colorOverride||colorAtIndex(text,token.index,baseColor);
          if(stroke){
            c.strokeStyle=color;
            c.lineWidth=strokeWidth;
            c.lineJoin="round";
            c.strokeText(ch,pen+offsetX,offsetY);
          }else{
            c.fillStyle=color;
            c.fillText(ch,pen+offsetX,offsetY);
          }
          pen+=c.measureText(ch).width+text.letterSpacing;
        }
      }
      return Math.max(0,pen-text.letterSpacing);
    };

    const effect=text.effect;
    const thickness=clamp(Number(text.outlineWidth)||0,0,48);
    if(effect==="extrude"){
      const depth=clamp(thickness||8,3,38);
      const sideColor=text.effectColor||"#111111";
      const step=depth>24?2:1;
      // Flat-color 3D side face only: no shadow, blur, or gradient shading.
      for(let offset=depth;offset>=1;offset-=step){
        drawGlyphs(offset*.58,offset*.58,sideColor);
      }
    }else if(effect==="shadow"){
      const offset=thickness*1.4;
      drawGlyphs(offset,offset,text.effectColor||"#111111");
    }else if(effect==="hollow"){
      drawGlyphs(thickness*1.35,thickness*1.35,text.effectColor,true,Math.max(2,thickness));
    }
    if(effect==="outline") drawGlyphs(0,0,text.effectColor,true,Math.max(0,thickness*2));
    const drawW=drawGlyphs();

    c.shadowColor="transparent";
    c.strokeStyle=baseColor;c.lineWidth=Math.max(1,fontSize*.045);
    if(text.underline){c.beginPath();c.moveTo(0,fontSize*.12);c.lineTo(drawW,fontSize*.12);c.stroke();}
    if(text.strike){c.beginPath();c.moveTo(0,-fontSize*.31);c.lineTo(drawW,-fontSize*.31);c.stroke();}
    c.restore();
  }

  function clipToRegion(c,region){
    c.save();
    shapePath(c,region); c.clip();
  }

  function drawTexts(c,fragments){
    fragments.forEach((fragment)=>{
      const bg=sampleSceneColor(fragment.x+fragment.w/2,fragment.y+fragment.h/2);
      const base=fragment.text.colorMode==="auto"?contrastText(bg):fragment.text.color;
      c.save(); clipItemPath(c,fragment.region);
      fragment.lines.forEach((line,i)=>drawTokenLine(c,fragment,line,i,base));
      c.restore();
    });
  }

  function drawTransformHandles(c, item) {
    const handles = itemHandlePoints(item);
    const center = { x:item.x+item.w/2, y:item.y+item.h/2 };
    const topMid = rotatePoint({ x:item.x+item.w/2, y:item.y }, center, item.rotation||0);
    c.save();
    c.strokeStyle="#ffe600";
    c.fillStyle="#ffe600";
    c.lineWidth=4;
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(handles.nw.x,handles.nw.y);
    c.lineTo(handles.ne.x,handles.ne.y);
    c.lineTo(handles.se.x,handles.se.y);
    c.lineTo(handles.sw.x,handles.sw.y);
    c.closePath();
    c.stroke();
    c.beginPath();c.moveTo(topMid.x,topMid.y);c.lineTo(handles.rotate.x,handles.rotate.y);c.stroke();
    for(const key of ["nw","ne","se","sw"]){
      const point=handles[key];
      c.fillRect(point.x-13,point.y-13,26,26);
      c.strokeStyle="#111111";c.lineWidth=2;c.strokeRect(point.x-13,point.y-13,26,26);c.strokeStyle="#ffe600";c.lineWidth=4;
    }
    c.beginPath();c.arc(handles.rotate.x,handles.rotate.y,16,0,Math.PI*2);c.fill();
    c.strokeStyle="#111111";c.lineWidth=2;c.stroke();
    c.fillStyle="#111111";c.font=`700 18px ${fontFamilies.dotum}`;c.textAlign="center";c.textBaseline="middle";c.fillText("↻",handles.rotate.x,handles.rotate.y+1);
    c.restore();
  }

  function drawGuides(c,fragments){
    const {bleed}=dimensions();
    c.save();c.translate(bleed,bleed);
    state.regions.forEach((region)=>{
      const selected=region.id===state.selectedRegionId;
      const active=transformTarget?.kind==="region"&&transformTarget.id===region.id;
      if(!state.showRegions&&!selected&&!active)return;
      c.save();
      if(!active){
        c.setLineDash(selected?[10,7]:[6,8]);
        c.lineWidth=selected?2.5:1.25;
        c.strokeStyle=selected?"#f4e900":"rgba(255,255,255,.22)";
        withItemTransform(c,region,()=>{shapePath(c,region);c.stroke();});
      }
      if(selected&&region.acceptText){
        const box=regionContentBox(region);
        c.setLineDash([5,7]);c.strokeStyle="rgba(91,240,255,.52)";c.lineWidth=1.5;c.strokeRect(box.x,box.y,box.w,box.h);
      }
      if(active)drawTransformHandles(c,region);
      c.restore();
    });
    state.elements.forEach((element)=>{
      const selected=element.id===state.selectedElementId;
      const active=transformTarget?.kind==="element"&&transformTarget.id===element.id;
      if(!selected&&!active)return;
      const item=elementGeometry(element);
      c.save();
      if(!active){
        c.strokeStyle="#f4e900";c.lineWidth=3;c.setLineDash([12,7]);
        withItemTransform(c,item,()=>{shapePath(c,item);c.stroke();});
      }else drawTransformHandles(c,item);
      c.restore();
    });
    fragments.forEach((fragment)=>{
      if(fragment.text.id!==state.selectedTextId)return;
      c.save();c.strokeStyle="#67e8a5";c.lineWidth=3;c.setLineDash([8,6]);c.strokeRect(fragment.x,fragment.y,fragment.w,fragment.h);c.restore();
    });
    if(bleed>0&&state.showRegions){
      c.save();c.strokeStyle="rgba(255,255,255,.8)";c.lineWidth=2;c.setLineDash([16,10]);c.strokeRect(0,0,dimensions().trimW,dimensions().trimH);c.restore();
    }
    c.restore();
  }

  function renderTo(targetCtx,{guides=false,recordHits=false}={}){
    drawBaseScene(sceneCtx);
    const layout=buildLayout(sceneCtx);
    targetCtx.clearRect(0,0,canvas.width,canvas.height);
    targetCtx.drawImage(sceneCanvas,0,0);
    const {bleed,trimW,trimH}=dimensions();
    targetCtx.save();targetCtx.translate(bleed,bleed);targetCtx.beginPath();targetCtx.rect(0,0,trimW,trimH);targetCtx.clip();drawTexts(targetCtx,layout.fragments);targetCtx.restore();
    if(guides)drawGuides(targetCtx,layout.fragments);
    if(recordHits){
      layoutFragments=orderedTextFragments(layout.fragments).map((f)=>({id:f.text.id,regionId:f.region.id,x:f.x,y:f.y,w:f.w,h:f.h}));
      regionHitBoxes=state.regions.map((r)=>({id:r.id,x:r.x,y:r.y,w:r.w,h:r.h}));
      elementHitBoxes=state.elements.map((e)=>{const g=elementGeometry(e);return {id:e.id,x:g.x,y:g.y,w:g.w,h:g.h};});
      $("layoutStatus").textContent=layout.overflow?"일부 문장이 영역 한계에 가까워요":"문장 수정 시 글자 맞춤 · 영역 재배치는 버튼에서만";
      $("layoutStatus").dataset.state=layout.overflow?"warning":"ready";
    }
  }

  function render(){renderQueued=false;updateCanvasMeta();renderTo(ctx,{guides:true,recordHits:true});}
  function queueRender(){markHistoryDirty(false);schedulePersistState();if(renderQueued)return;renderQueued=true;requestAnimationFrame(render);}

  function canvasPoint(event){
    const rect=canvas.getBoundingClientRect();
    const {bleed}=dimensions();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width-bleed,y:(event.clientY-rect.top)*canvas.height/rect.height-bleed};
  }
  const contains=(b,p,pad=0)=>p.x>=b.x-pad&&p.x<=b.x+b.w+pad&&p.y>=b.y-pad&&p.y<=b.y+b.h+pad;
  function hitText(p,exclude=null){return [...layoutFragments].reverse().find((b)=>b.id!==exclude&&contains(b,p))||null;}
  function hitElement(p){
    const element=[...state.elements].reverse().find((item)=>pointInItem(p,elementGeometry(item),2));
    return element?{id:element.id,...elementGeometry(element)}:null;
  }
  function hitRegion(p,acceptOnly=false){
    const region=[...state.regions].reverse().find((item)=>pointInItem(p,item,2)&&(!acceptOnly||item.acceptText));
    return region?{id:region.id,x:region.x,y:region.y,w:region.w,h:region.h}:null;
  }

  function openToolTab(name){
    const tab=document.querySelector(`.tool-tab[data-tool-tab="${name}"]`);if(!tab)return;
    document.querySelectorAll(".tool-tab").forEach((x)=>x.classList.toggle("active",x===tab));
    document.querySelectorAll(".tool-pane").forEach((pane)=>pane.classList.toggle("active",pane.dataset.toolPane===name));
  }

  function transformSource(kind,id){
    return kind==="region"?state.regions.find((item)=>item.id===id):state.elements.find((item)=>item.id===id);
  }

  function transformGeometry(kind,id){
    const source=transformSource(kind,id);
    return kind==="element"?elementGeometry(source):source;
  }

  function activateTransform(kind,id,{announce=false}={}){
    const source=transformSource(kind,id);
    if(!source)return;
    transformTarget={kind,id};
    if(kind==="region"){
      state.selectedRegionId=id;state.selectedElementId=null;openToolTab("regions");renderRegionList();renderTextList({bringSelectedRegionIntoView:true});
    }else{
      state.selectedElementId=id;state.selectedRegionId=null;openToolTab("elements");
    }
    updateRegionControls();updateElementControls();queueRender();
    if(announce)toast("이동·크기·회전 핸들을 열었습니다.");
  }

  function toggleTransform(kind,id){
    if(!id)return toast("먼저 캔버스에서 항목을 선택하세요.");
    if(transformTarget?.kind===kind&&transformTarget.id===id){
      transformTarget=null;
      updateRegionControls();updateElementControls();queueRender();
      return;
    }
    activateTransform(kind,id,{announce:true});
  }

  function clearLongPress(){
    clearTimeout(longPressTimer);longPressTimer=null;pendingLongPress=null;
  }

  function armLongPress(kind,id,event,point){
    if(event.pointerType==="mouse")return;
    clearLongPress();
    pendingLongPress={kind,id,pointerId:event.pointerId,start:point,fired:false};
    longPressTimer=setTimeout(()=>{
      if(!pendingLongPress)return;
      pendingLongPress.fired=true;
      activateTransform(kind,id,{announce:false});
      if(navigator.vibrate)navigator.vibrate(24);
      toast("핸들이 열렸습니다. 이제 끌어서 조작하세요.");
    },540);
  }

  function beginTransformDrag(event,point,handle){
    if(!transformTarget)return false;
    const {kind,id}=transformTarget;
    const source=transformSource(kind,id);
    const geometry=transformGeometry(kind,id);
    if(!source||!geometry)return false;
    const center={x:geometry.x+geometry.w/2,y:geometry.y+geometry.h/2};
    beginHistoryInteraction();
    dragState={
      type:"transform",kind,id,handle,start:point,
      orig:deepClone(source),geometry:{x:geometry.x,y:geometry.y,w:geometry.w,h:geometry.h,rotation:geometry.rotation||0},
      center,startAngle:Math.atan2(point.y-center.y,point.x-center.x),moved:false,
      textPositions:kind==="region"?state.texts.filter((text)=>text.regionId===id&&text.manualX!=null&&text.manualY!=null).map((text)=>({id:text.id,x:text.manualX,y:text.manualY})):[]
    };
    canvas.setPointerCapture(event.pointerId);
    return true;
  }

  function rectOverlapArea(x, y, w, h, W, H) {
    const left = Math.max(0, x);
    const top = Math.max(0, y);
    const right = Math.min(W, x + w);
    const bottom = Math.min(H, y + h);
    return Math.max(0, right - left) * Math.max(0, bottom - top);
  }

  function overlapLength(position, size, boundary) {
    return Math.max(0, Math.min(boundary, position + size) - Math.max(0, position));
  }

  // 사진은 대지 밖으로 충분히 이동할 수 있게 하되, 사진 면적의 최소 5%는
  // 대지 위에 남겨 둡니다. 사진이 지나치게 커서 5%가 대지 전체보다 큰
  // 경우에는 가능한 최대 교차 면적을 기준으로 제한합니다.
  function clampImageToMinimumOverlap(x,y,w,h,W,H,minimumRatio=.05){
    return constrainRectToArtboard(x,y,w,h,W,H,minimumRatio);
  }


  function resizeFromHandle(drag,point){
    const source=transformSource(drag.kind,drag.id);
    if(!source)return;
    const {trimW:W,trimH:H}=dimensions();
    const dx=point.x-drag.start.x,dy=point.y-drag.start.y;
    if(drag.kind==="element"&&source.type==="image"){
      const original=drag.geometry;
      const opposite={nw:{x:original.x+original.w,y:original.y+original.h},ne:{x:original.x,y:original.y+original.h},se:{x:original.x,y:original.y},sw:{x:original.x+original.w,y:original.y}}[drag.handle];
      if(!opposite)return;
      const targetW=Math.abs(point.x-opposite.x),targetH=Math.abs(point.y-opposite.y);
      const diagonal=Math.hypot(original.w,original.h)||1;
      const scale=clamp(Math.hypot(targetW,targetH)/diagonal,Math.max(24/original.w,24/original.h),6);
      const w=original.w*scale,h=original.h*scale;
      const x=drag.handle.includes("w")?opposite.x-w:opposite.x;
      const y=drag.handle.includes("n")?opposite.y-h:opposite.y;
      const constrained = clampImageToMinimumOverlap(x, y, w, h, W, H, .05);
      source.x = constrained.x;
      source.y = constrained.y;
      source.w=w;source.h=h;source.imageFit="contain";
      return;
    }
    if(drag.kind==="element"&&source.type==="band"){
      const north=drag.handle==="nw"||drag.handle==="ne";
      if(source.bandScope==="region"){
        source.h=clamp(drag.orig.h+(north?-dy*2:dy*2),18,H);
      }else{
        if(north){source.y=drag.orig.y+dy;source.h=clamp(drag.orig.h-dy,18,H);}
        else source.h=clamp(drag.orig.h+dy,18,H);
      }
      return;
    }
    const original=drag.geometry;
    const center={x:original.x+original.w/2,y:original.y+original.h/2};
    const local=rotatePoint(point,center,-(original.rotation||0));
    const opposite={
      nw:{x:original.x+original.w,y:original.y+original.h},
      ne:{x:original.x,y:original.y+original.h},
      se:{x:original.x,y:original.y},
      sw:{x:original.x+original.w,y:original.y}
    }[drag.handle];
    if(!opposite)return;
    let x=Math.min(local.x,opposite.x),y=Math.min(local.y,opposite.y);
    let w=Math.abs(local.x-opposite.x),h=Math.abs(local.y-opposite.y);
    const minW=source.shape==="line"?40:32,minH=source.shape==="line"?2:26;
    if(w<minW){if(local.x<opposite.x)x=opposite.x-minW;w=minW;}
    if(h<minH){if(local.y<opposite.y)y=opposite.y-minH;h=minH;}
    const constrained=constrainRectToArtboard(x,y,w,h,W,H,.05);source.x=constrained.x;source.y=constrained.y;source.w=w;source.h=h;
  }

  canvas.addEventListener("pointerdown",(event)=>{
    const point=canvasPoint(event);
    if(transformTarget){
      const item=transformGeometry(transformTarget.kind,transformTarget.id);
      const handle=item?transformHandleAt(point,item):null;
      if(handle&&beginTransformDrag(event,point,handle)){
        event.preventDefault();
        return;
      }
    }

    const textHit=hitText(point);
    if(textHit){
      clearLongPress();
      const text=state.texts.find((item)=>item.id===textHit.id);if(!text)return;
      transformTarget=null;
      state.selectedTextId=text.id;state.selectedElementId=null;state.selectedRegionId=null;
      beginHistoryInteraction();
      dragState={type:"text",id:text.id,start:point,orig:{regionId:text.regionId,order:text.order,manualX:text.manualX,manualY:text.manualY,regionLocked:text.regionLocked},baseX:text.manualX??textHit.x,baseY:text.manualY??textHit.y,moved:false};
      canvas.setPointerCapture(event.pointerId);
      renderTextList();updateElementControls();updateRegionControls();queueRender();return;
    }

    const elementHit=hitElement(point);
    if(elementHit){
      const element=state.elements.find((item)=>item.id===elementHit.id);if(!element)return;
      if(!(transformTarget?.kind==="element"&&transformTarget.id===element.id))transformTarget=null;
      state.selectedElementId=element.id;state.selectedRegionId=null;
      openToolTab("elements");updateElementControls();updateRegionControls();renderRegionList();queueRender();
      armLongPress("element",element.id,event,point);
      try{canvas.setPointerCapture(event.pointerId);}catch{}
      return;
    }

    const regionHit=hitRegion(point);
    if(regionHit){
      const region=state.regions.find((item)=>item.id===regionHit.id);if(!region)return;
      if(!(transformTarget?.kind==="region"&&transformTarget.id===region.id))transformTarget=null;
      state.selectedRegionId=region.id;state.selectedElementId=null;
      openToolTab("regions");renderRegionList();renderTextList({bringSelectedRegionIntoView:true});updateRegionControls();updateElementControls();queueRender();
      armLongPress("region",region.id,event,point);
      try{canvas.setPointerCapture(event.pointerId);}catch{}
      return;
    }

    clearLongPress();transformTarget=null;state.selectedElementId=null;state.selectedRegionId=null;
    updateElementControls();updateRegionControls();renderRegionList();queueRender();
  });

  canvas.addEventListener("pointermove",(event)=>{
    const point=canvasPoint(event);
    if(pendingLongPress&&!pendingLongPress.fired){
      if(Math.hypot(point.x-pendingLongPress.start.x,point.y-pendingLongPress.start.y)>14)clearLongPress();
    }
    if(!dragState)return;
    const dx=point.x-dragState.start.x,dy=point.y-dragState.start.y;
    if(Math.abs(dx)+Math.abs(dy)>3)dragState.moved=true;
    const {trimW:W,trimH:H}=dimensions();
    if(dragState.type==="text"){
      const text=state.texts.find((item)=>item.id===dragState.id);if(!text)return;
      const region=state.regions.find((item)=>item.id===text.regionId);if(!region)return;
      const box=regionContentBox(region);
      text.manualX=clamp(dragState.baseX+dx,box.x,box.x+box.w-20);
      text.manualY=clamp(dragState.baseY+dy,box.y,box.y+box.h-20);
      text.regionLocked=true;
    }else if(dragState.type==="transform"){
      const source=transformSource(dragState.kind,dragState.id);if(!source)return;
      if(dragState.handle==="move"){
        if(dragState.kind==="element"&&source.type==="band"){
          if(source.bandScope==="region"){
            const region=state.regions.find((item)=>item.id===source.bandRegionId);
            if(region)source.bandPosition=clamp((dragState.geometry.y+dragState.geometry.h/2+dy-region.y)/Math.max(1,region.h),0,1);
          }else source.y=clamp(dragState.orig.y+dy,-source.h*.7,H-source.h*.3);
        }else{
          if (dragState.kind === "element" && source.type === "image") {
            const constrained = clampImageToMinimumOverlap(
              dragState.orig.x + dx, dragState.orig.y + dy,
              dragState.orig.w, dragState.orig.h, W, H, .05
            );
            source.x = constrained.x;
            source.y = constrained.y;
          } else {
            const constrained=constrainRectToArtboard(dragState.orig.x+dx,dragState.orig.y+dy,dragState.orig.w,dragState.orig.h,W,H,.05);
            source.x=constrained.x;source.y=constrained.y;
          }
          if(dragState.kind==="region"){
            dragState.textPositions.forEach((saved)=>{
              const text=state.texts.find((item)=>item.id===saved.id);
              if(text){text.manualX=saved.x+dx;text.manualY=saved.y+dy;}
            });
          }
        }
      }else if(dragState.handle==="rotate"){
        const angle=Math.atan2(point.y-dragState.center.y,point.x-dragState.center.x);
        source.rotation=Math.round(dragState.orig.rotation+(angle-dragState.startAngle)*180/Math.PI);
      }else resizeFromHandle(dragState,point);
      if(dragState.kind==="region"){
        if(dragState.handle!=="rotate") captureRegionManualDelta(source,state.regionGapReduction);
        autoStyleAssignedTexts({force:false});
        renderRegionList();
      }
      updateRegionControls();updateElementControls();
    }
    queueRender();
  });

  function finishPointer(event){
    const point=canvasPoint(event);
    const pending=pendingLongPress;
    clearLongPress();
    if(!dragState){
      try{canvas.releasePointerCapture(event.pointerId);}catch{}
      return;
    }
    if(dragState.type==="text"){
      const a=state.texts.find((item)=>item.id===dragState.id);
      const target=a?hitText(point,a.id):null;
      if(a&&dragState.moved&&target){
        const b=state.texts.find((item)=>item.id===target.id);
        if(b){
          const bPos={regionId:b.regionId,order:b.order,manualX:b.manualX,manualY:b.manualY,regionLocked:b.regionLocked};
          a.regionId=bPos.regionId;a.order=bPos.order;a.manualX=bPos.manualX;a.manualY=bPos.manualY;a.regionLocked=true;
          b.regionId=dragState.orig.regionId;b.order=dragState.orig.order;b.manualX=dragState.orig.manualX;b.manualY=dragState.orig.manualY;b.regionLocked=true;
          toast("두 문장의 위치를 바꿨습니다.");
        }
      }else if(a&&dragState.moved){
        const regionHit=hitRegion(point,true);
        if(regionHit&&regionHit.id!==a.regionId){
          a.regionId=regionHit.id;
          a.order=state.texts.filter((text)=>text.regionId===regionHit.id&&text.id!==a.id).length;
          const region=state.regions.find((item)=>item.id===regionHit.id),box=regionContentBox(region);
          a.manualX=clamp(point.x,box.x,box.x+box.w-20);a.manualY=clamp(point.y,box.y,box.y+box.h-20);a.regionLocked=true;
          toast(`“${region.name}” 영역으로 옮겼습니다.`);
        }
      }
      normalizeTextOrders();renderTextList();
    }
    try{canvas.releasePointerCapture(event.pointerId);}catch{}
    dragState=null;renderRegionList();updateRegionControls();updateElementControls();queueRender();endHistoryInteraction({commit:true});
  }

  canvas.addEventListener("pointerup",finishPointer);
  canvas.addEventListener("pointercancel",finishPointer);
  canvas.addEventListener("dblclick",(event)=>{
    const point=canvasPoint(event);
    const elementHit=hitElement(point);
    if(elementHit){event.preventDefault();activateTransform("element",elementHit.id,{announce:false});return;}
    const regionHit=hitRegion(point);
    if(regionHit){event.preventDefault();activateTransform("region",regionHit.id,{announce:false});}
  });
  canvas.addEventListener("contextmenu",(event)=>event.preventDefault());

  function renderUnicodeGrid(category="전체",query=""){
    const categories=$("unicodeCategories");categories.replaceChildren();
    ["전체",...SYMBOLS.map((x)=>x.cat)].forEach((cat)=>{
      const b=document.createElement("button");b.type="button";b.className=`category-button${cat===category?" active":""}`;b.textContent=cat;
      b.addEventListener("click",()=>renderUnicodeGrid(cat,$("unicodeSearch").value.trim()));categories.append(b);
    });
    const q=query.toLowerCase();
    const aliases={"별":"음악·별","전화":"기본","하트":"기본","원":"기본","사각":"기본","화살":"화살표","경고":"주의","돈":"돈·숫자","카드":"카드"};
    const wanted=aliases[q]||category;
    let chars=[];
    SYMBOLS.forEach((group)=>{if(wanted==="전체"||group.cat===wanted||group.cat.toLowerCase().includes(q))chars.push(...group.chars);});
    if(q&&q.length===1)chars.unshift(q);
    chars=[...new Set(chars)];
    const grid=$("unicodeGrid");grid.replaceChildren();
    chars.forEach((char)=>{
      const b=document.createElement("button");b.type="button";b.className="unicode-button";b.textContent=char;b.title=`${char} U+${char.codePointAt(0).toString(16).toUpperCase()}`;
      b.addEventListener("click",()=>{if(unicodeTarget)unicodeTarget(char);$("unicodeDialog").close();});grid.append(b);
    });
  }

  $("unicodeSearch").addEventListener("input",()=>renderUnicodeGrid("전체",$("unicodeSearch").value.trim()));
  $("unicodeCloseBtn").addEventListener("click",()=>$("unicodeDialog").close());
  $("unicodeCodepointApply").addEventListener("click",()=>{
    const raw=$("unicodeCodepoint").value.trim();let char="";
    const match=raw.match(/^(?:U\+)?([0-9A-F]{2,6})$/i);
    if(match){try{char=String.fromCodePoint(parseInt(match[1],16));}catch{}}
    else char=[...raw][0]||"";
    if(!char)return toast("유니코드 또는 기호를 입력하세요.");
    if(unicodeTarget)unicodeTarget(char);$("unicodeDialog").close();
  });

  function exportImage(type){
    const {fullW,fullH}=dimensions();
    const out=document.createElement("canvas");out.width=fullW;out.height=fullH;
    const outCtx=out.getContext("2d");renderTo(outCtx,{guides:false,recordHits:false});
    const mime=type==="jpg"?"image/jpeg":"image/png";
    const quality=type==="jpg"?state.jpgQuality:undefined;
    const link=document.createElement("a");
    link.download=`otter-jjirasi-v23-${state.orientation}-${Date.now()}.${type}`;
    link.href=out.toDataURL(mime,quality);link.click();
    toast(`${type.toUpperCase()} 파일을 저장했습니다.`);
  }

  function setupColorFields(){
    createColorField("palettePrimaryField",()=>state.palette.primary,(v)=>{state.palette.primary=v;if(state.background.mode==="solid"){state.background.c1=paletteColor("primary",state.palette);state.background.c2=state.background.c1;}},{allowNone:false,onCommit:()=>{autoStyleAssignedTexts({force:false});renderTextList();renderRegionList();renderTemplateGrid();}});
    createColorField("paletteSecondaryField",()=>state.palette.secondary,(v)=>{state.palette.secondary=v;if(state.background.mode==="solid"){state.background.c1=paletteColor("primary",state.palette);state.background.c2=state.background.c1;}},{allowNone:false,onCommit:()=>{autoStyleAssignedTexts({force:false});renderTextList();renderRegionList();renderTemplateGrid();}});
    createColorField("paletteTertiaryField",()=>state.palette.tertiary,(v)=>{state.palette.tertiary=v;state.background.patternColor=v;if(state.background.mode==="solid"){state.background.c1=paletteColor("primary",state.palette);state.background.c2=state.background.c1;}},{allowNone:false,onCommit:()=>{autoStyleAssignedTexts({force:false});renderTextList();renderRegionList();renderTemplateGrid();}});
    createColorField("regionFillField",()=>{const r=selectedRegion();return !r||r.fillNone?"none":resolveColor(r,"fill");},(v)=>{const r=selectedRegion();if(!r)return;if(v==="none")r.fillNone=true;else{r.fillNone=false;r.fill=v;r.fillRole=null;}renderRegionList();});
    createColorField("regionStrokeField",()=>{const r=selectedRegion();return !r||r.strokeNone?"none":resolveColor(r,"stroke");},(v)=>{const r=selectedRegion();if(!r)return;if(v==="none")r.strokeNone=true;else{r.strokeNone=false;r.stroke=v;r.strokeRole=null;}});
    createColorField("regionEffectColorField",()=>{const r=selectedRegion();return r?resolveColor(r,"effectColor"):"#111111";},(v)=>{const r=selectedRegion();if(r){r.effectColor=v;r.effectColorRole=null;}},{allowNone:false});
    createColorField("elementFillField",()=>{const e=selectedElement();return !e||e.fillNone?"none":e.fill;},(v)=>{const e=selectedElement();if(!e)return;if(v==="none")e.fillNone=true;else{e.fillNone=false;e.fill=v;}});
    createColorField("elementStrokeField",()=>{const e=selectedElement();return !e||e.strokeNone?"none":e.stroke;},(v)=>{const e=selectedElement();if(!e)return;if(v==="none")e.strokeNone=true;else{e.strokeNone=false;e.stroke=v;}});
    createColorField("elementEffectColorField",()=>selectedElement()?.effectColor||"#111111",(v)=>{const e=selectedElement();if(e)e.effectColor=v;},{allowNone:false});
    createColorField("elementLabelColorField",()=>selectedElement()?.labelColor||"#111111",(v)=>{const e=selectedElement();if(e)e.labelColor=v;},{allowNone:false});
    createColorField("backgroundColor1Field",()=>state.background.c1,(v)=>{state.background.c1=v;state.background.paletteRole=null;},{allowNone:false});
    createColorField("backgroundColor2Field",()=>state.background.c2,(v)=>{state.background.c2=v;state.background.paletteRole=null;},{allowNone:false});
    createColorField("patternColorField",()=>state.background.patternColor,(v)=>state.background.patternColor=v,{allowNone:false});
    createColorField("posterBorderColorField",()=>state.posterBorder.color,(v)=>state.posterBorder.color=v,{allowNone:false});
  }


  // ---------------------------------------------------------------------------
  // v16 · reference-led poster editor overhaul
  // ---------------------------------------------------------------------------

  const ARTBOARD_PRESETS = {
    flyer: { widthMm: 180, heightMm: 100, label: "전단 180 × 100 mm" },
    a6: { widthMm: 148, heightMm: 105, label: "A6 148 × 105 mm" },
    a5: { widthMm: 210, heightMm: 148, label: "A5 210 × 148 mm" },
    card: { widthMm: 90, heightMm: 50, label: "카드 90 × 50 mm" },
    square: { widthMm: 120, heightMm: 120, label: "정사각 120 × 120 mm" }
  };

  const EFFECT_ORDER = ["extrude", "shadow", "hollow", "outline"];

  function normalizeEffects(item) {
    if (!item) return [];
    const fromArray = Array.isArray(item.effects) ? item.effects : [];
    const legacy = item.effect && item.effect !== "none" ? [item.effect] : [];
    item.effects = [...new Set([...fromArray, ...legacy].filter((effect) => EFFECT_TYPES.includes(effect)))];
    item.effect = item.effects[0] || "none";
    return item.effects;
  }

  function activeEffects(item) {
    const effects = normalizeEffects(item);
    return EFFECT_ORDER.filter((effect) => effects.includes(effect));
  }

  function hasEffect(item, effect) {
    return activeEffects(item).includes(effect);
  }

  function toggleEffect(item, effect) {
    if (!item || !EFFECT_TYPES.includes(effect)) return;
    const current = normalizeEffects(item);
    item.effects = current.includes(effect) ? current.filter((value) => value !== effect) : [...current, effect];
    item.effect = item.effects[0] || "none";
  }

function ensureStateCompatibility() {
    state.schemaVersion = 22;
    state.theme ||= "light";
    state.artboard ||= { preset: "flyer", widthMm: 180, heightMm: 100 };
    state.artboard.widthMm = clamp(Number(state.artboard.widthMm) || 180, 50, 420);
    state.artboard.heightMm = clamp(Number(state.artboard.heightMm) || 100, 50, 420);
    state.orientation = state.artboard.heightMm > state.artboard.widthMm ? "portrait" : "landscape";
    state.pageMargin = clamp(Number(state.pageMargin) || 28, 0, 120);
    state.regionGapX = clamp(Number.isFinite(Number(state.regionGapX)) ? Number(state.regionGapX) : 0, 0, 100);
    state.regionGapY = clamp(Number.isFinite(Number(state.regionGapY)) ? Number(state.regionGapY) : 0, 0, 100);
    state.activeTool ||= "templates";
    state.previewZoom = clamp(Number(state.previewZoom) || 1, .2, 3);
    state.previewFit = state.previewFit !== false;
    if (!state.previewBackgroundMode) {
      const legacy = String(state.previewBackground || "").toLowerCase();
      state.previewBackgroundMode = legacy === "#ffffff" ? "white" : (legacy === "#111111" || legacy === "#000000" || legacy === "#1b1f25" ? "black" : "transparent");
    }
    state.previewBackgroundMode = normalizedPreviewBackgroundMode(state.previewBackgroundMode);
    state.palette ||= {};
    state.palette.primary ||= "#ffd400";
    state.palette.secondary ||= "#111111";
    state.palette.tertiary ||= "#e62d20";
    if (typeof state.palette.secondaryEnabled !== "boolean") state.palette.secondaryEnabled = true;
    if (typeof state.palette.tertiaryEnabled !== "boolean") state.palette.tertiaryEnabled = true;
    if (typeof state.palette.useBackground !== "boolean") state.palette.useBackground = true;
    if (typeof state.palette.useWhite !== "boolean") state.palette.useWhite = true;
    if (typeof state.palette.useBlack !== "boolean") state.palette.useBlack = true;
    state.palette.paperMix = clamp(Number(state.palette.paperMix) || 78, 0, 96);
    state.palette.roleOrder = paletteRoleOrder(state.palette);
    if(state.background&&state.background.paletteRole===undefined){
      const savedTemplate=templateSpecs.find((template)=>template.id===state.templateId);
      state.background.paletteRole=savedTemplate?.bg?.role || (state.templateId===CUSTOM_TEMPLATE_ID?"primary":null);
    }
    state.regions ||= [];
    state.elements ||= [];
    state.texts ||= [];
    state.regions.forEach((region) => {
      normalizeEffects(region);
      region.textVAlign = "center";
      if (typeof region.acceptText !== "boolean") region.acceptText = true;
      if (typeof region.clipText !== "boolean") region.clipText = false;
      if (!Number.isFinite(Number(region.padding))) region.padding = 20;
      if (!Number.isFinite(Number(region.effectSize))) region.effectSize = 18;
      if (!region.layoutNorm && region.layoutBase) {
        const { trimW, trimH } = dimensions();
        region.layoutNorm = {
          x: region.layoutBase.x / trimW,
          y: region.layoutBase.y / trimH,
          w: region.layoutBase.w / trimW,
          h: region.layoutBase.h / trimH
        };
      }
    });
    state.elements.forEach((element) => {
      normalizeEffects(element);
      element.clipRegionId ||= null;
      element.alphaBounds ||= null;
      if (element.type === "image") element.imageFit = "contain";
      if (typeof element.affectFlow !== "boolean") element.affectFlow = true;
    });
    state.texts.forEach((text) => {
      normalizeEffects(text);
      if (text.fontFamily === "gulim" || !fontFamilies[text.fontFamily]) text.fontFamily = "dotum";
      text.fontWeight = clamp(Number(text.fontWeight) || (text.bold ? 760 : 520), 100, 900);
      text.scaleX = clamp(Number(text.scaleX) || 1, .45, 1.65);
      text.scaleY = clamp(Number(text.scaleY) || 1, .45, 1.65);
      if (typeof text.autoNoWrap !== "boolean") text.autoNoWrap = false;
      const savedRole = text.roleHint || text.role || text.autoRole || "body";
      if (text.sample && !["tag","footer"].includes(savedRole)) text.autoNoWrap = false;
      text.rangeColors ||= [];
      text.rangeBackgrounds ||= [];
      text.rangeUnicodes ||= [];
      if (!['word', 'char'].includes(text.unicodePlacement)) text.unicodePlacement = 'word';
      text.manualScale = clamp(Number(text.manualScale) || 1, .35, 3);
      if (!text.styleMode) text.styleMode = "auto";
      if (typeof text.manualProtected !== "boolean") {
        text.manualProtected = Boolean(text.styleMode === "manual" || text.regionLocked || text.manualX != null || text.manualY != null || Math.abs(text.manualScale - 1) > .001);
      }
      if (!Number.isFinite(Number(text.gap))) text.gap = 4;
    });
  }

  function VRegion(name, x, y, w, h, options = {}) {
    return R(name, x, y, w, h, {
      radius: 0,
      padding: 18,
      textVAlign: "center",
      ...options
    });
  }

  function normalizeTemplateRegionGroup(regions, margin = .04) {
    if (!Array.isArray(regions) || !regions.length) return regions;
    const minX = Math.min(...regions.map((region) => region.x));
    const minY = Math.min(...regions.map((region) => region.y));
    const maxX = Math.max(...regions.map((region) => region.x + region.w));
    const maxY = Math.max(...regions.map((region) => region.y + region.h));
    const spanX = Math.max(.01, maxX - minX);
    const spanY = Math.max(.01, maxY - minY);
    const targetSpan = 1 - margin * 2;
    regions.forEach((region) => {
      region.x = margin + ((region.x - minX) / spanX) * targetSpan;
      region.y = margin + ((region.y - minY) / spanY) * targetSpan;
      region.w = (region.w / spanX) * targetSpan;
      region.h = (region.h / spanY) * targetSpan;
      region.x = Math.round(region.x * 1000) / 1000;
      region.y = Math.round(region.y * 1000) / 1000;
      region.w = Math.round(region.w * 1000) / 1000;
      region.h = Math.round(region.h * 1000) / 1000;
    });
    return regions;
  }

  function buildPortraitRegions(style = "stack") {
    const layouts = {
      stack: [
        VRegion("속보 표식", .035, .035, .235, .090, { fillRole:"tertiary", radius:14, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("기관 안내", .290, .035, .675, .090, { fillRole:"secondary", radius:0, textPreset:"microCenter", textRoles:["micro"] }),
        VRegion("큰 제목", .035, .145, .930, .225, { fillNone:true, padding:2, emphasis:1.48, overflowAllowance:.03, textPreset:"hero", textRoles:["headline"] }),
        VRegion("핵심 목록", .035, .390, .930, .250, { fillRole:"paper", radius:20, textPreset:"bulletDense", textRoles:["bullet"] }),
        VRegion("짧은 강조", .035, .660, .570, .125, { fillRole:"tertiary", radius:16, textPreset:"bodyDisplay", textRoles:["callout"] }),
        VRegion("수치", .625, .660, .340, .125, { fillRole:"secondary", radius:12, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("연락처", .035, .805, .930, .090, { fillRole:"primary", radius:0, textPreset:"hotline", textRoles:["footer"] }),
        VRegion("주의 문구", .035, .915, .930, .050, { fillNone:true, padding:1, textPreset:"microCenter", textRoles:["micro"] })
      ],
      rail: [
        VRegion("왼쪽 판", .035, .035, .235, .930, { fillRole:"secondary", radius:16, acceptText:false }),
        VRegion("속보 표식", .055, .060, .195, .145, { fillRole:"tertiary", radius:14, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("주의 문구", .055, .735, .195, .190, { fillNone:true, padding:4, textPreset:"microCenter", textRoles:["micro"] }),
        VRegion("큰 제목", .295, .035, .670, .230, { fillNone:true, padding:2, emphasis:1.52, overflowAllowance:.03, textPreset:"hero", textRoles:["headline"] }),
        VRegion("기관 안내", .295, .285, .670, .080, { fillRole:"secondary", radius:0, textPreset:"microCenter", textRoles:["micro"] }),
        VRegion("핵심 목록", .295, .385, .400, .300, { fillRole:"paper", radius:18, textPreset:"bulletDense", textRoles:["bullet"] }),
        VRegion("짧은 강조", .715, .385, .250, .175, { fillRole:"tertiary", radius:16, textPreset:"bodyDisplay", textRoles:["callout"] }),
        VRegion("수치", .715, .580, .250, .105, { fillRole:"primary", radius:12, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("연락처", .295, .705, .670, .105, { fillRole:"tertiary", radius:0, textPreset:"hotline", textRoles:["footer"] }),
        VRegion("하단 메모", .295, .830, .670, .080, { fillNone:true, padding:1, textPreset:"microCenter", textRoles:["micro"] })
      ],
      columns: [
        VRegion("속보 표식", .035, .035, .220, .090, { fillRole:"tertiary", radius:14, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("기관 안내", .275, .035, .690, .090, { fillRole:"secondary", radius:0, textPreset:"microCenter", textRoles:["micro"] }),
        VRegion("큰 제목", .035, .145, .930, .225, { fillNone:true, padding:2, emphasis:1.50, overflowAllowance:.03, textPreset:"hero", textRoles:["headline"] }),
        VRegion("핵심 목록", .035, .390, .455, .300, { fillRole:"paper", radius:18, textPreset:"bulletDense", textRoles:["bullet"] }),
        VRegion("짧은 강조", .510, .390, .455, .175, { fillRole:"tertiary", radius:16, textPreset:"bodyDisplay", textRoles:["callout"] }),
        VRegion("수치", .510, .585, .455, .105, { fillRole:"secondary", radius:12, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("연락처", .035, .710, .930, .100, { fillRole:"primary", radius:0, textPreset:"hotline", textRoles:["footer"] }),
        VRegion("주의 문구", .035, .830, .930, .080, { fillNone:true, padding:1, textPreset:"microCenter", textRoles:["micro"] })
      ],
      type: [
        VRegion("속보 표식", .035, .035, .185, .090, { fillRole:"tertiary", radius:18, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("기관 안내", .240, .035, .725, .090, { fillNone:true, padding:1, textPreset:"microCenter", textRoles:["micro"] }),
        VRegion("큰 제목", .035, .145, .930, .300, { fillNone:true, padding:0, emphasis:1.66, overflowAllowance:.04, textPreset:"hero", textRoles:["headline"] }),
        VRegion("핵심 목록", .035, .475, .500, .245, { fillNone:true, padding:3, textPreset:"bulletDense", textRoles:["bullet"] }),
        VRegion("짧은 강조", .565, .475, .400, .130, { fillRole:"paper", radius:20, textPreset:"bodyDisplay", textRoles:["callout"] }),
        VRegion("수치", .565, .625, .400, .095, { fillNone:true, padding:1, textPreset:"badge", textRoles:["tag"] }),
        VRegion("연락처", .285, .760, .680, .095, { fillNone:true, padding:1, textPreset:"hotline", textRoles:["footer"] }),
        VRegion("주의 문구", .035, .760, .220, .095, { fillNone:true, padding:1, textPreset:"micro", textRoles:["micro"] })
      ],
      photo: [
        VRegion("사진 자리", .035, .035, .930, .280, { fillRole:"secondary", radius:20, acceptText:false }),
        VRegion("속보 표식", .055, .055, .210, .090, { fillRole:"tertiary", radius:14, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("큰 제목", .035, .335, .930, .185, { fillNone:true, padding:2, emphasis:1.42, overflowAllowance:.03, textPreset:"hero", textRoles:["headline"] }),
        VRegion("기관 안내", .035, .540, .930, .070, { fillRole:"secondary", radius:0, textPreset:"microCenter", textRoles:["micro"] }),
        VRegion("핵심 목록", .035, .630, .530, .215, { fillRole:"paper", radius:18, textPreset:"bulletDense", textRoles:["bullet"] }),
        VRegion("짧은 강조", .585, .630, .380, .125, { fillRole:"tertiary", radius:16, textPreset:"bodyDisplay", textRoles:["callout"] }),
        VRegion("수치", .585, .775, .380, .070, { fillRole:"primary", radius:12, textPreset:"badgeOutline", textRoles:["tag"] }),
        VRegion("연락처", .035, .865, .930, .070, { fillRole:"tertiary", radius:0, textPreset:"hotline", textRoles:["footer"] }),
        VRegion("주의 문구", .035, .945, .930, .020, { fillNone:true, padding:0, textPreset:"microCenter", textRoles:["micro"] })
      ]
    };
    const selected = layouts[style] || layouts.stack;
    return normalizeTemplateRegionGroup(selected, .04);
  }

  function buildV16Templates() {
    const templates = [
      {
        id:"dense-left-rail", name:"세로 속보판", caption:"왼쪽 표찰과 오른쪽 기사칸을 같은 기준선에 맞춘 고밀도 구성", portraitStyle:"rail",
        bg:{role:"primary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("왼쪽 검정판", .030,.030,.205,.940,{fillRole:"secondary",acceptText:false,radius:14}),
          VRegion("속보 표식", .048,.055,.169,.185,{fillRole:"tertiary",radius:12,padding:16,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("주의 문구", .050,.720,.165,.215,{fillNone:true,padding:4,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("큰 제목", .255,.030,.715,.255,{fillNone:true,padding:0,emphasis:1.60,overflowAllowance:.035,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내", .255,.300,.715,.075,{fillRole:"tertiary",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록", .255,.390,.415,.335,{fillRole:"paper",radius:16,padding:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조", .685,.390,.285,.205,{fillRole:"tertiary",radius:14,padding:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치", .685,.610,.285,.115,{fillRole:"secondary",radius:10,padding:10,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("연락처", .255,.740,.715,.125,{fillRole:"tertiary",radius:0,padding:8,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("하단 메모", .255,.880,.715,.055,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[1,3,4,5,6,7,8,2]
      },
      {
        id:"news-deck", name:"상단 뉴스판", caption:"상단 표식과 기관 띠, 큰 제목, 같은 높이의 3칸 정보판", portraitStyle:"stack",
        bg:{role:"paper"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("속보 표식",.030,.030,.175,.145,{fillRole:"tertiary",radius:0,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("기관 안내",.220,.030,.750,.145,{fillRole:"secondary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("큰 제목",.030,.195,.940,.240,{fillNone:true,padding:0,emphasis:1.58,overflowAllowance:.03,textPreset:"hero",textRoles:["headline"]}),
          VRegion("핵심 목록",.030,.455,.420,.310,{fillRole:"primary",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.465,.455,.270,.310,{fillRole:"secondary",radius:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.750,.455,.220,.145,{fillRole:"tertiary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("연락처",.750,.615,.220,.150,{fillRole:"primary",radius:0,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.785,.940,.085,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[0,2,1,3,4,5,6,7]
      },
      {
        id:"phone-bottom", name:"전화번호 하단형", caption:"큰 제목과 정보칸을 위에 모으고 연락처를 전폭으로 붙인 구성", portraitStyle:"stack",
        bg:{role:"secondary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("속보 표식",.030,.030,.180,.230,{shape:"burst",fillRole:"tertiary",padding:22,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("큰 제목",.230,.030,.740,.230,{fillNone:true,padding:0,emphasis:1.56,overflowAllowance:.03,textPreset:"heroOutline",textRoles:["headline"]}),
          VRegion("기관 안내",.030,.280,.940,.075,{fillRole:"primary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.375,.500,.315,{fillRole:"paper",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.545,.375,.425,.185,{fillRole:"tertiary",radius:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.545,.575,.425,.115,{fillRole:"primary",radius:10,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("연락처",.030,.710,.940,.140,{fillRole:"tertiary",radius:0,textPreset:"hotlineOutline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.870,.940,.070,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[0,1,2,3,4,5,6,7]
      },
      {
        id:"no-band-hero", name:"무띠 대형문자", caption:"가로띠 없이 큰 제목과 원형 표식, 두 덩어리 본문만으로 구성", portraitStyle:"type",
        bg:{role:"primary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("속보 표식",.030,.030,.155,.155,{shape:"ellipse",fillRole:"tertiary",padding:18,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("큰 제목",.205,.030,.765,.310,{fillNone:true,padding:0,emphasis:1.72,overflowAllowance:.04,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내",.030,.360,.940,.070,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.455,.485,.275,{fillNone:true,padding:2,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.545,.455,.425,.145,{fillRole:"paper",radius:18,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.610,.620,.295,.095,{fillNone:true,padding:0,textPreset:"badge",textRoles:["tag"]}),
          VRegion("연락처",.315,.765,.655,.105,{fillNone:true,padding:0,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.765,.245,.105,{fillNone:true,padding:0,textPreset:"micro",textRoles:["micro"]})
        ], textSlots:[0,1,2,3,4,5,6,7]
      },
      {
        id:"rounded-notice", name:"둥근 공지판", caption:"모서리가 둥근 두 개의 주요 판과 작은 표식을 섞은 구성", portraitStyle:"stack",
        bg:{role:"tertiary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("큰 제목",.030,.030,.650,.245,{fillRole:"paper",radius:24,padding:18,textPreset:"hero",textRoles:["headline"]}),
          VRegion("속보 표식",.710,.030,.260,.245,{shape:"ellipse",fillRole:"primary",padding:22,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("기관 안내",.030,.295,.940,.075,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.390,.440,.320,{fillRole:"secondary",radius:18,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.490,.390,.480,.185,{fillRole:"paper",radius:18,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.590,.595,.380,.115,{fillRole:"primary",radius:16,textPreset:"badge",textRoles:["tag"]}),
          VRegion("연락처",.030,.735,.555,.115,{fillNone:true,padding:0,textPreset:"hotlineOutline",textRoles:["footer"]}),
          VRegion("주의 문구",.615,.735,.355,.115,{fillNone:true,padding:1,textPreset:"micro",textRoles:["micro"]})
        ], textSlots:[1,0,2,3,4,5,6,7]
      },
      {
        id:"three-column-ads", name:"삼단 광고칸", caption:"같은 높이와 같은 간격의 세 칸을 중심에 배치한 전형적 광고형", portraitStyle:"columns",
        bg:{role:"paper"}, border:{enabled:true,color:"#111111",width:6,radius:8},
        regions:[
          VRegion("큰 제목",.030,.030,.940,.225,{fillRole:"primary",radius:14,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내",.030,.275,.940,.075,{fillRole:"secondary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("속보 표식",.030,.370,.295,.330,{fillRole:"tertiary",radius:16,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("핵심 목록",.352,.370,.296,.330,{fillRole:"paper",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.675,.370,.295,.205,{fillRole:"secondary",radius:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.675,.595,.295,.105,{fillRole:"tertiary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("연락처",.030,.725,.940,.120,{fillRole:"primary",radius:0,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.865,.940,.070,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[2,0,1,3,4,5,6,7]
      },
      {
        id:"vertical-ticket", name:"세로 표찰 기사형", caption:"세로 표찰과 기사 본문을 분리하되 모든 행의 끝선을 맞춘 구성", portraitStyle:"rail",
        bg:{role:"paper"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("왼쪽 표찰판",.030,.030,.190,.910,{fillRole:"tertiary",radius:12,acceptText:false}),
          VRegion("속보 표식",.050,.055,.150,.260,{fillNone:true,padding:2,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("주의 문구",.050,.700,.150,.205,{fillNone:true,padding:2,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("큰 제목",.240,.030,.730,.260,{fillNone:true,padding:0,emphasis:1.58,overflowAllowance:.035,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내",.240,.310,.730,.075,{fillRole:"secondary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.240,.405,.430,.315,{fillRole:"primary",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.690,.405,.280,.185,{fillRole:"secondary",radius:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.690,.610,.280,.110,{fillRole:"tertiary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("연락처",.240,.740,.730,.130,{fillRole:"tertiary",radius:0,textPreset:"hotline",textRoles:["footer"]})
        ], textSlots:[1,3,4,5,6,7,8,2]
      },
      {
        id:"center-burst", name:"중앙 폭발표식", caption:"같은 높이의 왼쪽 본문·중앙 표식·오른쪽 강조칸을 둔 구성", portraitStyle:"columns",
        bg:{role:"primary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("큰 제목",.030,.030,.940,.230,{fillNone:true,padding:0,emphasis:1.56,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내",.030,.280,.940,.075,{fillRole:"secondary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.375,.300,.330,{fillRole:"paper",radius:14,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("속보 표식",.350,.375,.300,.330,{shape:"burst",fillRole:"tertiary",padding:34,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("짧은 강조",.670,.375,.300,.195,{fillRole:"secondary",radius:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.670,.590,.300,.115,{fillRole:"paper",radius:12,textPreset:"badge",textRoles:["tag"]}),
          VRegion("연락처",.030,.725,.940,.120,{fillRole:"tertiary",radius:0,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.865,.940,.070,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[3,0,1,2,4,5,6,7]
      },
      {
        id:"photo-column", name:"사진 기사형", caption:"사진칸과 오른쪽 텍스트 그리드의 위·아래 기준선을 맞춘 구성", portraitStyle:"photo",
        bg:{role:"paper"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("사진 자리",.030,.030,.335,.910,{fillRole:"secondary",radius:18,acceptText:false}),
          VRegion("속보 표식",.385,.030,.165,.150,{fillRole:"tertiary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("큰 제목",.570,.030,.400,.245,{fillNone:true,padding:0,emphasis:1.48,overflowAllowance:.03,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내",.385,.295,.585,.075,{fillRole:"secondary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.385,.390,.345,.315,{fillRole:"primary",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.750,.390,.220,.185,{fillRole:"tertiary",radius:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.750,.595,.220,.110,{fillRole:"secondary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("연락처",.385,.725,.585,.120,{fillRole:"tertiary",radius:0,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("주의 문구",.385,.865,.585,.075,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[1,2,3,4,5,6,7,8]
      },
      {
        id:"coupon-stack", name:"붙은 쿠폰판", caption:"일부 상하 블록을 붙이고 나머지 간격은 같은 값으로 유지한 쿠폰형", portraitStyle:"stack",
        bg:{role:"paper"}, border:{enabled:true,color:"#111111",width:6,radius:10},
        regions:[
          VRegion("속보 표식",.030,.030,.180,.150,{fillRole:"tertiary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("큰 제목",.230,.030,.740,.230,{fillRole:"primary",radius:14,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내",.030,.280,.940,.070,{fillRole:"secondary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.370,.430,.330,{fillRole:"paper",radius:14,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.480,.370,.260,.200,{fillRole:"tertiary",radius:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.760,.370,.210,.200,{fillRole:"primary",radius:14,textPreset:"badge",textRoles:["tag"]}),
          VRegion("연락처",.480,.570,.490,.130,{fillRole:"secondary",radius:0,touchY:true,textPreset:"hotlineOutline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.720,.940,.105,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[0,1,2,3,4,5,6,7]
      },
      {
        id:"split-article", name:"이단 기사형", caption:"왼쪽 긴 본문과 오른쪽 강조·수치칸을 같은 하단선에 맞춘 구성", portraitStyle:"columns",
        bg:{role:"paper"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("속보 표식",.030,.030,.170,.145,{fillRole:"tertiary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("큰 제목",.220,.030,.750,.240,{fillNone:true,padding:0,emphasis:1.58,textPreset:"hero",textRoles:["headline"]}),
          VRegion("기관 안내",.030,.290,.940,.075,{fillRole:"secondary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.385,.535,.330,{fillRole:"primary",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.585,.385,.385,.195,{fillRole:"tertiary",radius:14,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.585,.600,.385,.115,{fillRole:"secondary",radius:12,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("연락처",.030,.735,.940,.120,{fillRole:"primary",radius:0,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.875,.940,.065,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[0,1,2,3,4,5,6,7]
      },
      {
        id:"bare-type", name:"무테 타이포형", caption:"카드 없이 큰 글자·작은 안내·원형 도장만으로 밀도를 만든 구성", portraitStyle:"type",
        bg:{role:"primary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("큰 제목",.030,.030,.940,.330,{fillNone:true,padding:0,emphasis:1.78,overflowAllowance:.04,textPreset:"hero",textRoles:["headline"]}),
          VRegion("속보 표식",.030,.385,.135,.135,{shape:"ellipse",fillRole:"tertiary",padding:16,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("기관 안내",.185,.395,.785,.075,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.545,.470,.240,{fillNone:true,padding:0,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.535,.520,.435,.145,{fillNone:true,padding:0,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.635,.680,.235,.090,{fillNone:true,padding:0,textPreset:"badge",textRoles:["tag"]}),
          VRegion("연락처",.315,.815,.655,.095,{fillNone:true,padding:0,textPreset:"hotline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.815,.245,.095,{fillNone:true,padding:0,textPreset:"micro",textRoles:["micro"]})
        ], textSlots:[1,0,2,3,4,5,6,7]
      },
      {
        id:"corner-stamp", name:"모서리 도장형", caption:"큰 제목과 도장을 같은 상단선에 놓고 아래 정보칸을 정렬한 구성", portraitStyle:"rail",
        bg:{role:"tertiary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("큰 제목",.030,.030,.665,.255,{fillRole:"paper",radius:22,padding:16,textPreset:"hero",textRoles:["headline"]}),
          VRegion("속보 표식",.720,.030,.250,.220,{shape:"ellipse",fillRole:"primary",padding:22,textPreset:"badge",textRoles:["tag"]}),
          VRegion("기관 안내",.720,.270,.250,.085,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.375,.500,.330,{fillRole:"secondary",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.550,.375,.420,.195,{fillRole:"paper",radius:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.650,.590,.320,.115,{fillRole:"primary",radius:14,textPreset:"badge",textRoles:["tag"]}),
          VRegion("연락처",.030,.730,.600,.120,{fillNone:true,padding:0,textPreset:"hotlineOutline",textRoles:["footer"]}),
          VRegion("주의 문구",.650,.730,.320,.120,{fillNone:true,padding:1,textPreset:"micro",textRoles:["micro"]})
        ], textSlots:[1,0,2,3,4,5,6,7]
      },
      {
        id:"black-red-split", name:"검정 빨강 분할", caption:"검정 바탕 위에 빨강·크림 판을 같은 그리드로 놓은 강한 대비형", portraitStyle:"stack",
        bg:{role:"secondary"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("큰 제목",.030,.030,.605,.260,{fillRole:"paper",radius:20,padding:16,textPreset:"hero",textRoles:["headline"]}),
          VRegion("속보 표식",.655,.030,.315,.260,{fillRole:"tertiary",radius:16,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("기관 안내",.030,.310,.940,.075,{fillRole:"primary",radius:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.405,.450,.310,{fillRole:"primary",radius:16,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.500,.405,.470,.185,{fillRole:"tertiary",radius:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.500,.610,.470,.105,{fillRole:"paper",radius:12,textPreset:"badge",textRoles:["tag"]}),
          VRegion("연락처",.030,.735,.940,.130,{fillRole:"tertiary",radius:0,textPreset:"hotlineOutline",textRoles:["footer"]}),
          VRegion("주의 문구",.030,.885,.940,.055,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
        ], textSlots:[1,0,2,3,4,5,6,7]
      },
      {
        id:"soft-grid", name:"둥근 비대칭 그리드", caption:"둥근 판의 비율은 다르지만 같은 줄의 높이와 간격을 지킨 구성", portraitStyle:"columns",
        bg:{role:"paper"}, border:{enabled:false,width:0,radius:0},
        regions:[
          VRegion("큰 제목",.030,.030,.670,.245,{fillRole:"primary",radius:22,textPreset:"hero",textRoles:["headline"]}),
          VRegion("속보 표식",.725,.030,.245,.185,{shape:"ellipse",fillRole:"tertiary",padding:20,textPreset:"badgeOutline",textRoles:["tag"]}),
          VRegion("기관 안내",.725,.230,.245,.045,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("핵심 목록",.030,.295,.390,.350,{fillRole:"secondary",radius:18,textPreset:"bulletDense",textRoles:["bullet"]}),
          VRegion("짧은 강조",.440,.295,.530,.205,{fillRole:"tertiary",radius:18,textPreset:"bodyDisplay",textRoles:["callout"]}),
          VRegion("수치",.440,.520,.250,.125,{fillRole:"paper",radius:18,textPreset:"badge",textRoles:["tag"]}),
          VRegion("주의 문구",.710,.520,.260,.125,{fillRole:"primary",radius:18,textPreset:"microCenter",textRoles:["micro"]}),
          VRegion("연락처",.030,.670,.940,.135,{fillRole:"tertiary",radius:0,textPreset:"hotline",textRoles:["footer"]})
        ], textSlots:[1,0,2,3,4,5,7,6]
      }
    ];
    templates.forEach((spec) => {
      spec.regions = normalizeTemplateRegionGroup(spec.regions, .04);
      spec.portraitRegions = buildPortraitRegions(spec.portraitStyle);
      spec.textSlotsPortrait = spec.portraitStyle === "rail" ? [1,3,4,5,6,7,8,2] : spec.portraitStyle === "photo" ? [1,2,3,4,5,6,7,8] : [0,2,1,3,4,5,6,7];
    });
    return templates;
  }

  const V16_TEMPLATES = buildV16Templates();


  // v23: portrait layouts keep the same centered inner-grid rules. The template itself
  // contains a narrow baseline gap; the gap sliders only add extra spacing.
  function buildV22Portrait(style="stack"){
    const g=.014,gy=.012,G=(n,x,y,w,h,o={})=>VRegion(n,x,y,w,h,{gridV21:true,...o});
    const common={
      stack:[
        G("속보 표식",0,0,.23,.09,{fillRole:"tertiary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("기관 안내",.23+g,0,.77-g,.09,{fillRole:"secondary",textPreset:"microCenter",textRoles:["micro"]}),
        G("큰 제목",0,.102,1,.23,{fillNone:true,padding:1,emphasis:1.58,textPreset:"hero",textRoles:["headline"]}),
        G("핵심 목록",0,.344,1,.255,{fillRole:"paper",radius:18,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",0,.611,.60,.145,{fillRole:"tertiary",radius:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.60+g,.611,.40-g,.145,{fillRole:"secondary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",0,.768,1,.13,{fillRole:"primary",textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",0,.910,1,.09,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
      ],
      rail:[
        G("왼쪽 판",0,0,.25,1,{fillRole:"secondary",radius:16,acceptText:false}),
        G("속보 표식",.018,.025,.214,.16,{fillRole:"tertiary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("주의 문구",.018,.72,.214,.245,{fillNone:true,padding:3,textPreset:"microCenter",textRoles:["micro"]}),
        G("큰 제목",.25+g,0,.75-g,.235,{fillNone:true,padding:1,emphasis:1.58,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",.25+g,.247,.75-g,.085,{fillRole:"secondary",textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.25+g,.344,.45,.30,{fillRole:"paper",radius:18,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.70+g*2,.344,.30-g*2,.18,{fillRole:"tertiary",radius:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.70+g*2,.536,.30-g*2,.108,{fillRole:"primary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",.25+g,.656,.75-g,.17,{fillRole:"tertiary",textPreset:"hotline",textRoles:["footer"]}),
        G("하단 메모",.25+g,.838,.75-g,.162,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
      ],
      columns:[
        G("속보 표식",0,0,.22,.09,{fillRole:"tertiary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("기관 안내",.22+g,0,.78-g,.09,{fillRole:"secondary",textPreset:"microCenter",textRoles:["micro"]}),
        G("큰 제목",0,.102,1,.225,{fillNone:true,padding:1,emphasis:1.58,textPreset:"hero",textRoles:["headline"]}),
        G("핵심 목록",0,.339,.49,.32,{fillRole:"paper",radius:18,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.49+g,.339,.51-g,.19,{fillRole:"tertiary",radius:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.49+g,.541,.51-g,.118,{fillRole:"secondary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",0,.671,1,.145,{fillRole:"primary",textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",0,.828,1,.172,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]})
      ],
      type:[
        G("속보 표식",0,0,.19,.09,{fillRole:"tertiary",radius:18,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("기관 안내",.19+g,0,.81-g,.09,{fillNone:true,padding:1,textPreset:"microCenter",textRoles:["micro"]}),
        G("큰 제목",0,.102,1,.305,{fillNone:true,padding:0,emphasis:1.78,textPreset:"hero",textRoles:["headline"]}),
        G("핵심 목록",0,.419,.53,.255,{fillNone:true,padding:1,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.53+g,.419,.47-g,.145,{fillRole:"paper",radius:20,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.53+g,.576,.47-g,.098,{fillNone:true,padding:1,textPreset:"badge",textRoles:["tag"]}),
        G("주의 문구",0,.686,.25,.14,{fillNone:true,padding:1,textPreset:"micro",textRoles:["micro"]}),
        G("연락처",.25+g,.686,.75-g,.14,{fillNone:true,padding:1,textPreset:"hotline",textRoles:["footer"]})
      ],
      photo:[
        G("사진 자리",0,0,1,.27,{fillRole:"secondary",radius:20,acceptText:false}),
        G("속보 표식",.018,.02,.22,.09,{fillRole:"tertiary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("큰 제목",0,.282,1,.19,{fillNone:true,padding:1,emphasis:1.50,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",0,.484,1,.075,{fillRole:"secondary",textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",0,.571,.56,.225,{fillRole:"paper",radius:18,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.56+g,.571,.44-g,.135,{fillRole:"tertiary",radius:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.56+g,.718,.44-g,.078,{fillRole:"primary",radius:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",0,.808,1,.105,{fillRole:"tertiary",textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",0,.925,1,.075,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]})
      ]
    };
    return (common[style]||common.stack).map(r=>({...r}));
  }

  function buildV22Templates(){
    const G=(name,x,y,w,h,options={})=>VRegion(name,x,y,w,h,{templateV22:true,...options});
    const slotMap=(regions)=>[
      "속보 표식","큰 제목","기관 안내","핵심 목록","짧은 강조","수치","연락처","주의 문구"
    ].map((name)=>Math.max(0,regions.findIndex((region)=>region.name===name)));
    const portrait=(style)=>buildV22Portrait(style);
    const make=(id,name,caption,bgRole,regions,portraitStyle="stack",border={enabled:false,width:0,radius:0})=>{
      const normalizedRegions=normalizeTemplateRegionGroup(regions,.018);
      const portraitRegions=normalizeTemplateRegionGroup(portrait(portraitStyle),.026);
      return {
        id,name,caption,portraitStyle,bg:{role:bgRole},border,
        regions:normalizedRegions,textSlots:slotMap(normalizedRegions),portraitRegions,textSlotsPortrait:slotMap(portraitRegions)
      };
    };
    const templates=[];

    // 1. 여러 색 띠가 맞물린 쿠폰형.
    templates.push(make(
      "banded-coupon","띠형 쿠폰 모듈","전폭 색 띠와 작은 정보칸을 붙여 인쇄 광고처럼 압축한 구성","secondary",[
        G("상단 띠",.020,.025,.960,.180,{fillRole:"primary",radius:0,acceptText:false}),
        G("속보 표식",.035,.050,.160,.130,{shape:"ellipse",fillRole:"tertiary",padding:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("큰 제목",.210,.035,.750,.155,{fillNone:true,padding:0,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",.020,.220,.960,.080,{fillRole:"tertiary",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.020,.315,.520,.300,{fillRole:"paper",radius:0,padding:14,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.555,.315,.425,.145,{fillRole:"primary",radius:0,padding:12,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.555,.475,.425,.140,{fillRole:"tertiary",radius:0,padding:12,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",.020,.630,.960,.200,{fillRole:"primary",radius:0,padding:12,textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",.020,.845,.960,.110,{fillRole:"paperHard",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]})
      ],"stack",{enabled:true,color:"#111111",width:5,radius:0}
    ));

    // 2. 검정 반전과 전화번호 하단.
    templates.push(make(
      "black-hotline","검정 반전 전화판","검정 바탕과 원색 헤드라인, 하단 전화번호를 크게 강조한 구성","secondary",[
        G("속보 표식",.030,.035,.175,.170,{fillRole:"tertiary",radius:18,padding:18,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("큰 제목",.225,.025,.745,.250,{fillNone:true,padding:0,emphasis:1.82,textPreset:"heroOutline",textRoles:["headline"]}),
        G("기관 안내",.030,.290,.940,.080,{fillRole:"primary",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.030,.395,.560,.290,{fillRole:"paper",radius:18,padding:18,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.610,.395,.360,.180,{fillRole:"tertiary",radius:16,padding:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.610,.590,.360,.095,{fillNone:true,padding:0,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",.000,.720,1.000,.190,{fillRole:"primary",radius:0,padding:12,emphasis:1.45,textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",.030,.925,.940,.045,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]})
      ],"stack"
    ));

    // 3. 왼쪽 사진, 오른쪽 기사. 사용자가 만든 18.1 레이아웃의 장점을 살리되 배지·제목·기사 덩어리의 위계를 더 강하게 조정.
    templates.push(make(
      "photo-left-story","사진 좌측 기사판","왼쪽 세로 사진과 오른쪽 고밀도 기사·연락처를 한 판처럼 맞물린 구성","paper",[
        G("사진 자리",.020,.030,.345,.925,{fillRole:"secondary",radius:18,acceptText:false}),
        G("속보 그림자",.395,.040,.185,.190,{shape:"burst",fillRole:"secondary",acceptText:false,effect:"extrude",effectColorRole:"secondary",effectSize:12}),
        G("속보 표식",.390,.030,.185,.185,{shape:"burst",fillRole:"tertiary",strokeRole:"paper",strokeWidth:3,strokeNone:false,padding:22,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.28,outlineWidth:3}}),
        G("큰 제목",.540,.025,.440,.245,{fillNone:true,padding:0,emphasis:1.90,overflowAllowance:.025,textPreset:"heroOutline",textRoles:["headline"],textStyle:{fontFamily:"chosunKg",fontScale:1.36,lineHeight:.79,scaleX:.98,letterSpacing:-5,outlineWidth:3}}),
        G("기관 안내",.390,.285,.590,.080,{fillRole:"secondary",radius:0,padding:7,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontScale:1.06}}),
        G("핵심 목록",.390,.380,.355,.335,{fillRole:"primary",radius:16,padding:16,textPreset:"bulletDense",textRoles:["bullet"],textStyle:{fontScale:1.12,lineHeight:.92}}),
        G("짧은 강조",.760,.380,.220,.185,{fillRole:"tertiary",radius:12,padding:12,textPreset:"bodyDisplay",textRoles:["callout"],textStyle:{fontFamily:"chosunKg",fontScale:1.17,lineHeight:.84}}),
        G("수치",.760,.575,.220,.140,{fillRole:"secondary",radius:0,padding:10,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.18,outlineWidth:3}}),
        G("연락처",.390,.730,.590,.130,{fillRole:"tertiary",radius:0,padding:8,emphasis:1.30,textPreset:"hotline",textRoles:["footer"],textStyle:{fontFamily:"chosunKg",fontScale:1.26,lineHeight:.82,scaleX:.95}}),
        G("주의 문구",.390,.875,.590,.065,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontScale:1.02}})
      ],"photo"
    ));

    // 4. 오른쪽 타원 배지 네 단.
    templates.push(make(
      "oval-stack","우측 타원 배지","왼쪽 기사판과 오른쪽 타원 배지를 세로로 반복한 구성","primary",[
        G("큰 제목",.025,.025,.710,.250,{fillRole:"paper",radius:18,padding:12,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",.025,.290,.710,.075,{fillRole:"secondary",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.025,.380,.710,.310,{fillRole:"paper",radius:0,padding:16,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.025,.705,.710,.105,{fillNone:true,padding:0,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("연락처",.025,.825,.710,.085,{fillNone:true,padding:0,textPreset:"hotlineOutline",textRoles:["footer"]}),
        G("속보 표식",.765,.040,.210,.150,{shape:"ellipse",fillRole:"tertiary",padding:18,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("타원 장식",.765,.250,.210,.150,{shape:"ellipse",fillRole:"paperHard",acceptText:false,effect:"extrude",effectColorRole:"secondary",effectSize:12}),
        G("수치",.765,.460,.210,.150,{shape:"ellipse",fillRole:"tertiary",padding:16,textPreset:"badge",textRoles:["tag"]}),
        G("주의 문구",.765,.670,.210,.190,{shape:"ellipse",fillRole:"primarySoft",padding:18,textPreset:"microCenter",textRoles:["micro"]})
      ],"columns"
    ));

    // 5. 세로 표찰과 기사판.
    templates.push(make(
      "vertical-ticket-story","세로 표찰 기사","왼쪽 세로 표찰과 오른쪽 기사판을 빈틈 없이 이어 붙인 구성","primary",[
        G("왼쪽 표찰",.020,.025,.220,.930,{fillRole:"secondary",radius:16,acceptText:false}),
        G("속보 표식",.045,.050,.170,.160,{fillRole:"tertiary",radius:14,padding:16,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("수치",.045,.245,.170,.230,{fillNone:true,padding:0,textPreset:"heroOutline",textRoles:["tag"]}),
        G("주의 문구",.045,.700,.170,.210,{fillNone:true,padding:4,textPreset:"microCenter",textRoles:["micro"]}),
        G("큰 제목",.255,.025,.725,.260,{fillRole:"paper",radius:18,padding:12,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",.255,.300,.725,.075,{fillRole:"tertiary",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.255,.390,.440,.330,{fillRole:"paper",radius:0,padding:16,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.710,.390,.270,.330,{fillRole:"tertiary",radius:16,padding:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("연락처",.255,.740,.725,.150,{fillRole:"secondary",radius:0,padding:10,textPreset:"hotlineOutline",textRoles:["footer"]})
      ],"rail"
    ));

    // 6. 카드 없이 글자와 원형 도형만 충돌시키는 무테형.
    templates.push(make(
      "bare-collision-type","무테 충돌 타이포","카드 없이 큰 글자와 원형 도형, 작은 주석을 화면에 직접 배치한 구성","primary",[
        G("원형 장식",.790,.025,.185,.260,{shape:"ellipse",fillRole:"tertiary",acceptText:false}),
        G("속보 표식",.025,.035,.180,.120,{fillNone:true,padding:0,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("큰 제목",.105,.030,.800,.320,{fillNone:true,padding:0,emphasis:2.10,overflowAllowance:.04,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",.160,.360,.720,.075,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.025,.455,.430,.300,{fillNone:true,padding:0,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.500,.455,.455,.180,{fillNone:true,padding:0,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.620,.645,.230,.100,{fillNone:true,padding:0,textPreset:"badge",textRoles:["tag"]}),
        G("연락처",.350,.760,.625,.145,{fillNone:true,padding:0,emphasis:1.35,textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",.025,.790,.285,.110,{fillNone:true,padding:0,textPreset:"micro",textRoles:["micro"]})
      ],"type"
    ));

    // 7. 상단 띠와 같은 높이의 세 기사칸.
    templates.push(make(
      "top-band-three","상단 띠·삼단 기사","전폭 상단 띠 아래 같은 높이의 세 기사칸과 하단 전화판을 둔 구성","paper",[
        G("속보 표식",.020,.025,.170,.155,{fillRole:"tertiary",radius:14,padding:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("큰 제목",.205,.025,.775,.220,{fillNone:true,padding:0,emphasis:1.70,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",.020,.260,.960,.080,{fillRole:"secondary",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.020,.355,.380,.350,{fillRole:"primary",radius:16,padding:16,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.415,.355,.275,.350,{fillRole:"tertiary",radius:16,padding:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.705,.355,.275,.350,{fillRole:"secondary",radius:16,padding:16,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",.020,.720,.700,.175,{fillRole:"tertiary",radius:0,padding:10,textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",.735,.720,.245,.175,{fillNone:true,padding:2,textPreset:"microCenter",textRoles:["micro"]})
      ],"columns"
    ));

    // 8. 중앙 큰 숫자/짧은 문구판.
    templates.push(make(
      "center-symbol-panel","중앙 심볼판","좌우 기사 사이 중앙 큰 표식과 상하 대문구를 배치한 구성","secondary",[
        G("큰 제목",.020,.025,.960,.210,{fillNone:true,padding:0,emphasis:1.95,textPreset:"heroOutline",textRoles:["headline"]}),
        G("핵심 목록",.020,.260,.280,.420,{fillNone:true,padding:0,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("속보 표식",.330,.265,.340,.390,{shape:"burst",fillRole:"paper",strokeRole:"tertiary",strokeWidth:4,strokeNone:false,padding:36,textPreset:"badge",textRoles:["tag"]}),
        G("짧은 강조",.700,.260,.280,.420,{fillNone:true,padding:0,textPreset:"heroOutline",textRoles:["callout"]}),
        G("기관 안내",.020,.700,.280,.080,{fillNone:true,padding:0,textPreset:"micro",textRoles:["micro"]}),
        G("수치",.700,.700,.280,.080,{fillNone:true,padding:0,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",.255,.700,.490,.180,{fillNone:true,padding:0,textPreset:"hotlineOutline",textRoles:["footer"]}),
        G("주의 문구",.020,.900,.960,.055,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]})
      ],"type"
    ));

    // 9. 두 개의 큰 판과 작은 줄을 붙인 대조형.
    templates.push(make(
      "split-contrast","좌우 대조판","왼쪽 큰 기사판과 오른쪽 강조·수치판을 같은 높이로 맞춘 구성","primary",[
        G("속보 표식",.020,.025,.170,.120,{fillRole:"tertiary",radius:16,padding:14,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("기관 안내",.205,.025,.775,.120,{fillRole:"secondary",radius:0,padding:8,textPreset:"microCenter",textRoles:["micro"]}),
        G("큰 제목",.020,.160,.960,.245,{fillNone:true,padding:0,emphasis:1.80,textPreset:"hero",textRoles:["headline"]}),
        G("핵심 목록",.020,.420,.575,.355,{fillRole:"paper",radius:18,padding:18,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.610,.420,.370,.220,{fillRole:"tertiary",radius:18,padding:16,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.610,.655,.370,.120,{fillRole:"secondary",radius:14,padding:12,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",.020,.790,.960,.115,{fillRole:"tertiary",radius:0,padding:8,textPreset:"hotline",textRoles:["footer"]}),
        G("주의 문구",.020,.920,.960,.040,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]})
      ],"columns"
    ));

    // 10. 소형 광고 카드처럼 여러 정보가 한 판에 밀집된 형태.
    templates.push(make(
      "compact-ad-card","소형 광고 밀집판","두꺼운 외곽선 안에 제목·목록·강조·전화번호를 촘촘히 넣은 구성","primary",[
        G("속보 표식",.030,.035,.175,.175,{shape:"burst",fillRole:"tertiary",padding:20,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("큰 제목",.220,.030,.750,.210,{fillRole:"paper",radius:12,padding:10,textPreset:"hero",textRoles:["headline"]}),
        G("기관 안내",.030,.255,.940,.070,{fillRole:"secondary",radius:0,padding:6,textPreset:"microCenter",textRoles:["micro"]}),
        G("핵심 목록",.030,.340,.940,.245,{fillRole:"paperHard",radius:10,padding:14,textPreset:"bulletDense",textRoles:["bullet"]}),
        G("짧은 강조",.030,.600,.540,.155,{fillRole:"tertiary",radius:10,padding:12,textPreset:"bodyDisplay",textRoles:["callout"]}),
        G("수치",.585,.600,.385,.155,{fillRole:"secondary",radius:10,padding:12,textPreset:"badgeOutline",textRoles:["tag"]}),
        G("연락처",.030,.770,.940,.120,{fillRole:"primaryDeep",radius:0,padding:8,textPreset:"hotlineOutline",textRoles:["footer"]}),
        G("주의 문구",.030,.900,.940,.060,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"]})
      ],"stack",{enabled:true,color:"#111111",width:7,radius:10}
    ));

    // 11. 상단과 하단의 명암을 강하게 반전하고, 속보 표식과 전화번호가 제목을 보조하도록 밀도를 높인다.
    templates.push(make(
      "headline-right-block","상하 반전 광고판","검정 대제목판과 적색 정보판을 붙이고 속보 도장·기사·전화번호의 크기 대비를 강하게 만든 구성","secondary",[
        G("상단 배경",.010,.012,.980,.360,{fillRole:"secondary",acceptText:false,radius:0,touchX:true}),
        G("속보 표식",.028,.038,.185,.190,{shape:"ellipse",fillRole:"tertiary",strokeRole:"paper",strokeWidth:3,strokeNone:false,padding:16,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.62,lineHeight:.66,scaleX:1.00,outlineWidth:3,colorRole:"paper"}}),
        G("큰 제목",.225,.030,.745,.270,{fillNone:true,padding:0,emphasis:2.45,overflowAllowance:.035,textPreset:"heroOutline",textRoles:["headline"],textStyle:{fontFamily:"chosunKg",fontScale:1.56,lineHeight:.72,scaleX:1.00,letterSpacing:-8,outlineWidth:3,colorRole:"paper"}}),
        G("기관 안내",.000,.360,1.000,.065,{fillRole:"primary",radius:0,padding:5,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.10,colorRole:"secondary"}}),
        G("하단 배경",.010,.438,.980,.542,{fillRole:"tertiary",acceptText:false,radius:0,touchX:true}),
        G("핵심 목록",.030,.470,.600,.265,{fillRole:"paper",radius:8,padding:12,textPreset:"bulletDense",textRoles:["bullet"],textStyle:{fontFamily:"dotum",fontScale:1.24,lineHeight:.88,scaleX:.99}}),
        G("짧은 강조",.650,.470,.320,.265,{fillRole:"secondary",radius:8,padding:13,textPreset:"bodyDisplay",textRoles:["callout"],textStyle:{fontFamily:"chosunKg",fontScale:1.48,lineHeight:.72,scaleX:1.00,colorRole:"paper"}}),
        G("수치",.030,.755,.255,.105,{fillRole:"primary",radius:0,padding:7,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.45,lineHeight:.70,outlineWidth:3,colorRole:"secondary"}}),
        G("연락처",.300,.742,.670,.135,{fillNone:true,padding:0,emphasis:1.72,textPreset:"hotlineOutline",textRoles:["footer"],textStyle:{fontFamily:"chosunKg",fontScale:1.48,lineHeight:.72,scaleX:1.00,outlineWidth:3}}),
        G("주의 문구",.030,.895,.940,.060,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.08}})
      ],"rail",{enabled:true,color:"#111111",width:5,radius:0}
    ));

    // 12. 제목을 넓게 쓰고 오른쪽 세로 간판에는 짧은 강조 문구를 크게 쌓는다. 의미 없는 장식 면은 두지 않는다.
    templates.push(make(
      "right-vertical-panel","우측 세로 간판","넓은 대제목과 검정 정보 띠, 왼쪽 기사칸, 오른쪽 세로 강조판을 한 덩어리로 결합한 구성","primary",[
        G("큰 제목",.020,.020,.735,.285,{fillNone:true,padding:0,emphasis:2.48,overflowAllowance:.035,textPreset:"heroOutline",textRoles:["headline"],textStyle:{fontFamily:"chosunKg",fontScale:1.58,lineHeight:.71,scaleX:1.00,letterSpacing:-8,outlineWidth:3}}),
        G("속보 표식",.785,.025,.185,.170,{shape:"burst",fillRole:"secondary",strokeRole:"paper",strokeWidth:3,strokeNone:false,padding:18,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.48,lineHeight:.68,outlineWidth:3,colorRole:"paper"}}),
        G("기관 안내",.000,.320,.755,.075,{fillRole:"secondary",radius:0,padding:6,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.10,colorRole:"paper"}}),
        G("핵심 목록",.020,.415,.565,.340,{fillRole:"paper",radius:8,padding:13,textPreset:"bulletDense",textRoles:["bullet"],textStyle:{fontFamily:"dotum",fontScale:1.25,lineHeight:.87,scaleX:.99}}),
        G("짧은 강조",.605,.220,.365,.535,{fillRole:"tertiary",radius:8,padding:12,textPreset:"bodyDisplay",textRoles:["callout"],textStyle:{fontFamily:"chosunLo",fontScale:1.70,lineHeight:.66,scaleX:1.00,verticalWhenNarrow:true}}),
        G("수치",.020,.775,.250,.090,{fillRole:"secondary",radius:0,padding:6,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.38,lineHeight:.70,colorRole:"paper"}}),
        G("주의 문구",.290,.775,.295,.090,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.04}}),
        G("연락처",.020,.885,.950,.090,{fillRole:"paperHard",radius:0,padding:4,emphasis:1.60,textPreset:"hotlineOutline",textRoles:["footer"],textStyle:{fontFamily:"chosunKg",fontScale:1.44,lineHeight:.72,outlineWidth:3}})
      ],"columns"
    ));

    // 13. 상단 제목판과 원형 도장을 이어 붙이고, 하단 전화번호는 대지를 가로지르는 가장 큰 활자로 둔다.
    templates.push(make(
      "bottom-giant-copy","하단 초대형 문구","상단 대제목, 왼쪽 원형 속보, 촘촘한 기사판, 하단 초대형 연락처가 연속되는 구성","primary",[
        G("상단 제목판",.018,.018,.964,.260,{fillRole:"paperHard",radius:13,acceptText:false}),
        G("큰 제목",.035,.032,.930,.225,{fillNone:true,padding:0,emphasis:2.40,textPreset:"hero",textRoles:["headline"],textStyle:{fontFamily:"chosunKg",fontScale:1.56,lineHeight:.72,scaleX:1.00,letterSpacing:-8}}),
        G("속보 표식",.030,.305,.285,.300,{shape:"ellipse",fillRole:"tertiary",strokeRole:"secondary",strokeWidth:3,strokeNone:false,padding:22,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.68,lineHeight:.65,outlineWidth:3}}),
        G("기관 안내",.335,.300,.635,.070,{fillRole:"secondary",radius:0,padding:5,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.08,colorRole:"paper"}}),
        G("핵심 목록",.335,.385,.635,.245,{fillRole:"paper",radius:0,padding:12,textPreset:"bulletDense",textRoles:["bullet"],textStyle:{fontFamily:"dotum",fontScale:1.24,lineHeight:.88}}),
        G("짧은 강조",.335,.645,.635,.085,{fillNone:true,padding:0,textPreset:"bodyDisplay",textRoles:["callout"],textStyle:{fontFamily:"batang",fontScale:1.42,lineHeight:.76}}),
        G("수치",.335,.742,.255,.075,{fillRole:"tertiary",radius:0,padding:5,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.30}}),
        G("주의 문구",.610,.742,.360,.075,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.03}}),
        G("연락처",.008,.825,.984,.150,{fillRole:"secondary",radius:0,padding:5,emphasis:2.10,overflowAllowance:.035,textPreset:"hotlineOutline",textRoles:["footer"],textStyle:{fontFamily:"chosunKg",fontScale:1.62,lineHeight:.68,scaleX:1.00,outlineWidth:3,colorRole:"paper"}})
      ],"type"
    ));

    // 14. 중앙 폭발표식을 기준으로 좌우 기사 밀도를 맞추고, 아래 연락처가 전체 구도를 단단히 받친다.
    templates.push(make(
      "center-burst-editorial","중앙 폭발 기사판","상단 대제목, 중앙 폭발표식, 좌우 기사, 하단 대형 연락처가 서로 맞물리는 구성","primary",[
        G("큰 제목",.025,.015,.950,.205,{fillNone:true,padding:0,emphasis:2.42,textPreset:"heroOutline",textRoles:["headline"],textStyle:{fontFamily:"chosunKg",fontScale:1.55,lineHeight:.71,scaleX:1.00,letterSpacing:-8,outlineWidth:3}}),
        G("기관 안내",.130,.225,.740,.065,{fillRole:"secondary",radius:0,padding:5,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.08,colorRole:"paper"}}),
        G("핵심 목록",.020,.310,.300,.410,{fillRole:"paper",radius:0,padding:12,textPreset:"bulletDense",textRoles:["bullet"],textStyle:{fontFamily:"dotum",fontScale:1.22,lineHeight:.87,scaleX:.99}}),
        G("속보 표식",.340,.300,.320,.420,{shape:"burst",fillRole:"paperHard",strokeRole:"secondary",strokeWidth:4,strokeNone:false,padding:30,textPreset:"badge",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.80,lineHeight:.62}}),
        G("짧은 강조",.680,.310,.300,.285,{fillRole:"tertiary",radius:0,padding:12,textPreset:"heroOutline",textRoles:["callout"],textStyle:{fontFamily:"chosunLo",fontScale:1.55,lineHeight:.67,scaleX:.98,outlineWidth:3,verticalWhenNarrow:true}}),
        G("수치",.680,.610,.300,.110,{fillRole:"secondary",radius:0,padding:8,textPreset:"badgeOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:1.38,colorRole:"paper"}}),
        G("연락처",.220,.742,.560,.150,{fillNone:true,padding:0,emphasis:1.82,textPreset:"hotlineOutline",textRoles:["footer"],textStyle:{fontFamily:"chosunKg",fontScale:1.50,lineHeight:.70,outlineWidth:3}}),
        G("주의 문구",.100,.915,.800,.045,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.04}})
      ],"type"
    ));

    // 15. 검정 세로 표찰과 중앙 기사판, 오른쪽 입체 타원을 한 판처럼 이어 짧은 문구도 크게 보이게 한다.
    templates.push(make(
      "left-vertical-type","세로 표식·타원판","왼쪽 검정 세로 표찰, 중앙 기사판, 오른쪽 입체 타원을 촘촘하게 쌓은 구성","primary",[
        G("왼쪽 표찰 배경",.015,.020,.180,.920,{fillRole:"secondary",radius:0,acceptText:false}),
        G("속보 표식",.030,.040,.150,.670,{fillNone:true,padding:0,emphasis:2.55,textPreset:"heroOutline",textRoles:["tag"],textStyle:{fontFamily:"chosunLo",fontScale:2.05,lineHeight:.61,scaleX:1.00,outlineWidth:3,colorRole:"paper",verticalWhenNarrow:true}}),
        G("주의 문구",.035,.735,.140,.170,{fillNone:true,padding:0,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.08,colorRole:"paper"}}),
        G("큰 제목",.215,.020,.565,.245,{fillRole:"paperHard",radius:9,padding:8,textPreset:"hero",textRoles:["headline"],textStyle:{fontFamily:"chosunKg",fontScale:1.54,lineHeight:.72,scaleX:1.00}}),
        G("기관 안내",.215,.278,.565,.070,{fillRole:"secondary",radius:0,padding:5,textPreset:"microCenter",textRoles:["micro"],textStyle:{fontFamily:"dotum",fontScale:1.08,colorRole:"paper"}}),
        G("핵심 목록",.215,.360,.565,.300,{fillRole:"paper",radius:0,padding:12,textPreset:"bulletDense",textRoles:["bullet"],textStyle:{fontFamily:"dotum",fontScale:1.22,lineHeight:.88}}),
        G("짧은 강조",.215,.672,.565,.090,{fillNone:true,padding:0,textPreset:"bodyDisplay",textRoles:["callout"],textStyle:{fontFamily:"batang",fontScale:1.40,lineHeight:.76}}),
        G("연락처",.215,.775,.565,.110,{fillRole:"secondary",radius:0,padding:5,textPreset:"hotlineOutline",textRoles:["footer"],textStyle:{fontFamily:"chosunKg",fontScale:1.42,lineHeight:.72,outlineWidth:3,colorRole:"paper"}}),
        G("타원 장식1",.805,.025,.180,.155,{shape:"ellipse",fillRole:"tertiary",acceptText:false,effect:"extrude",effectColorRole:"secondary",effectSize:10}),
        G("타원 장식2",.805,.235,.180,.155,{shape:"ellipse",fillRole:"paperHard",acceptText:false,effect:"extrude",effectColorRole:"secondary",effectSize:10}),
        G("수치",.805,.445,.180,.190,{shape:"ellipse",fillRole:"tertiary",padding:12,textPreset:"badge",textRoles:["tag"],effect:"extrude",effectColorRole:"secondary",effectSize:10,textStyle:{fontFamily:"chosunLo",fontScale:1.52,lineHeight:.66,verticalWhenNarrow:true}}),
        G("타원 장식3",.805,.690,.180,.155,{shape:"ellipse",fillRole:"primarySoft",acceptText:false,effect:"extrude",effectColorRole:"secondary",effectSize:10})
      ],"rail"
    ));

    return templates;
  }
  const V22_TEMPLATES=buildV22Templates();
  const CUSTOM_TEMPLATE_ID="custom-blank";

  function getTemplateRegionSpecs(spec) {
    return state.orientation === "portrait" ? (spec.portraitRegions || buildPortraitRegions(spec.portraitStyle)) : spec.regions;
  }

  function templateTextSlots(spec) {
    return state.orientation === "portrait" ? (spec.textSlotsPortrait || spec.textSlots) : spec.textSlots;
  }

  function cloneTemplateRegion(spec, W, H) {
    const region = deepClone(spec);
    region.id = uid();
    region.x = Math.round(spec.x * W);
    region.y = Math.round(spec.y * H);
    region.w = Math.round(spec.w * W);
    region.h = Math.round(spec.h * H);
    const scale = Math.min(W / 1440, H / 800);
    region.radius = Math.round((Number(spec.radius) || 0) * clamp(scale, .65, 1.5));
    region.padding = Math.round((Number(spec.padding) || 0) * clamp(scale, .65, 1.5));
    region.textVAlign = "center";
    region.layoutNorm = { x:spec.x, y:spec.y, w:spec.w, h:spec.h };
    region.layoutBase = { x:region.x, y:region.y, w:region.w, h:region.h };
    region.layoutDetached = false;
    region.layoutManualDelta = null;
    region.baseRadius = Number(spec.radius) || 0;
    region.basePadding = Number(spec.padding) || 0;
    normalizeEffects(region);
    return region;
  }

  function regionBaseTarget(region) {
    const { trimW:W, trimH:H } = dimensions();
    const norm = region.layoutNorm || {x:(region.layoutBase?.x||region.x)/Math.max(1,W),y:(region.layoutBase?.y||region.y)/Math.max(1,H),w:(region.layoutBase?.w||region.w)/Math.max(1,W),h:(region.layoutBase?.h||region.h)/Math.max(1,H)};
    const margin=clamp(Number(state.pageMargin)||0,0,Math.min(W,H)*.20);
    const usableW=Math.max(80,W-margin*2),usableH=Math.max(80,H-margin*2);
    let x=margin+norm.x*usableW,y=margin+norm.y*usableH,w=norm.w*usableW,h=norm.h*usableH;
    const extraX=clamp(Number(state.regionGapX)||0,0,100),extraY=clamp(Number(state.regionGapY)||0,0,100);
    if(!region.touchX){x+=extraX/2;w-=extraX;}
    if(!region.touchY){y+=extraY/2;h-=extraY;}
    return {x,y,w:Math.max(20,w),h:Math.max(20,h)};
  }

  function reflowRegions({ preserveManual = true, adaptText = true } = {}) {
    const {trimW:W,trimH:H}=dimensions();
    const computed=state.regions.map(region=>({region,base:regionBaseTarget(region)}));
    if(computed.length){
      const minX=Math.min(...computed.map(v=>v.base.x)),minY=Math.min(...computed.map(v=>v.base.y));
      const maxX=Math.max(...computed.map(v=>v.base.x+v.base.w)),maxY=Math.max(...computed.map(v=>v.base.y+v.base.h));
      const shiftX=(W-(maxX-minX))/2-minX,shiftY=(H-(maxY-minY))/2-minY;
      computed.forEach(v=>{v.base.x+=shiftX;v.base.y+=shiftY;});
    }
    computed.forEach(({region,base})=>{
      region.layoutBase={x:Math.round(base.x),y:Math.round(base.y),w:Math.round(base.w),h:Math.round(base.h)};
      const d=preserveManual&&region.layoutDetached&&region.layoutManualDelta?region.layoutManualDelta:{x:0,y:0,w:0,h:0};
      region.x=Math.round(base.x+(Number(d.x)||0));region.y=Math.round(base.y+(Number(d.y)||0));
      region.w=Math.max(20,Math.round(base.w+(Number(d.w)||0)));region.h=Math.max(20,Math.round(base.h+(Number(d.h)||0)));
      const scale=Math.min(W/1440,H/800);region.radius=Math.round((Number(region.baseRadius??region.radius)||0)*clamp(scale,.65,1.5));region.padding=Math.round((Number(region.basePadding??region.padding)||0)*clamp(scale,.65,1.5));region.textVAlign="center";
    });
    if(adaptText)adaptRegionsToText();
    autoStyleAssignedTexts({force:false,skipAdapt:true});
  }

function adaptRegionsToText() {
    // 텍스트 길이 때문에 영역 좌표를 바꾸지 않는다. 템플릿 그리드와 수동 수정값을
    // 고정하고 글자 폭·높이·크기만 조절해 맞춘다.
    state.regions.forEach((region)=>{ region.textVAlign = "center"; });
  }

  function captureRegionManualDelta(region) {
    if (!region) return;
    const base = region.layoutBase || regionBaseTarget(region);
    region.layoutManualDelta = {
      x:(Number(region.x)||0)-base.x,
      y:(Number(region.y)||0)-base.y,
      w:(Number(region.w)||20)-base.w,
      h:(Number(region.h)||20)-base.h
    };
    region.layoutDetached = true;
  }

  function restoreRegionLayout(region) {
    if (!region) return;
    region.layoutDetached = false;
    region.layoutManualDelta = null;
    const target = regionBaseTarget(region);
    Object.assign(region, target, { layoutBase:{...target} });
    adaptRegionsToText();
  }

  function applyRegionGapReduction({ force = false } = {}) {
    if (force) state.regions.forEach((region) => { region.layoutDetached = false; region.layoutManualDelta = null; });
    reflowRegions({ preserveManual:!force });
  }

  function regionGapLabel() {
    return `${Math.round(Number(state.regionGapX)||0)} / ${Math.round(Number(state.regionGapY)||0)}px`;
  }

  function assignTextsToTemplate(spec, { restyle = false, preferSlots = true } = {}) {
    const regions = state.regions.filter((region) => region.acceptText && region.shape !== "line");
    const occupancy = new Map(regions.map((region) => [region.id, 0]));
    const slots = templateTextSlots(spec) || [];
    const overflow = [];
    state.texts.forEach((text,index) => {
      text.role = inferTextRole(text,index);
      text.autoRole = text.role;
      text.regionLocked = false;
      text.manualProtected = false;
      text.manualX = null;
      text.manualY = null;
      text.manualScale = 1;
      const slot = preferSlots ? slots[index] : null;
      const region = Number.isInteger(slot) ? state.regions[slot] : null;
      if (region?.acceptText && region.shape !== "line") {
        text.regionId = region.id;
        text.order = occupancy.get(region.id) || 0;
        occupancy.set(region.id,text.order+1);
      } else overflow.push({text,index,role:text.role,facts:textFacts(text)});
    });
    overflow.forEach(({text,role,facts}) => {
      let best = regions[0], score = -Infinity;
      regions.forEach((region) => {
        const candidate = regionTextScore(region,role,facts,occupancy.get(region.id)||0);
        if (candidate > score) { best=region; score=candidate; }
      });
      if (!best) return;
      text.regionId = best.id;
      text.order = occupancy.get(best.id)||0;
      occupancy.set(best.id,text.order+1);
    });
    normalizeTextOrders();
    adaptRegionsToText();
    autoStyleAssignedTexts({ force:restyle, skipAdapt:true });
  }

  function makeDefaultOtterTexts() {
    const sample=(copy,role,extra={})=>makeText(copy,{...ROLE_STYLE_DEFAULTS[role],role,roleHint:role,sample:true,unicodeStyle:"none",fontFamily:"dotum",...extra});
    return [
      sample("속보","tag",{autoNoWrap:false}),
      sample("수달이 돌 하나 주웠다고 지구가 잠깐 귀여워짐","headline",{autoNoWrap:false}),
      sample("★국가수달과몰입대책본부 발표｜심장 단속 실패｜조개 비축 권고★","micro",{autoNoWrap:false}),
      sample(`•배 위 조개 개봉 완료
•물 위 눕방·먹방 동시 진행
•앞발 두 개로 전국민 심장 관리
•반박 시 수달 영상 48개 제출`,"bullet",{autoNoWrap:false}),
      sample("무직인데 귀여움으로 매일 야근","callout",{autoNoWrap:false}),
      sample("입덕률 100.4%","tag",{autoNoWrap:false}),
      sample("☎ 수달 제보 02)770-수달수달 ☎","footer",{autoNoWrap:false}),
      sample("※주의: 한 번 보면 친구에게 보내고 다시 보게 됨·조약돌 수집 충동 동반","micro",{autoNoWrap:false})
    ];
  }

  function applyCustomBlank({ clearContent = true } = {}) {
    ensureStateCompatibility();
    state.templateId = CUSTOM_TEMPLATE_ID;
    const base = paletteColor("primary", state.palette);
    state.background = { mode:"solid", c1:base, c2:base, pattern:"none", patternColor:paletteColor("tertiary",state.palette), angle:0, scale:48, paletteRole:"primary" };
    state.posterBorder = { enabled:false, color:paletteColor("ink",state.palette), width:0, radius:0 };
    if (clearContent) {
      state.regions = [];
      state.elements = [];
      state.texts = [];
    }
    state.selectedTextId = null;
    state.selectedRegionId = null;
    state.selectedElementId = null;
    transformTarget = null;
    refreshAllUI();
    updatePreviewZoom();
    queueRender();
  }

  function applyTemplate(templateId, { preserveTexts = true } = {}) {
    ensureStateCompatibility();
    if (templateId === CUSTOM_TEMPLATE_ID) {
      applyCustomBlank({ clearContent: !preserveTexts });
      return;
    }
    const spec = templateSpecs.find((template) => template.id === templateId) || templateSpecs[0];
    const { trimW:W, trimH:H } = dimensions();
    state.templateId = spec.id;
    const bgColor = paletteColor(spec.bg?.role || "primary",state.palette);
    state.background = { mode:"solid", c1:bgColor, c2:bgColor, pattern:"none", patternColor:paletteColor("tertiary",state.palette), angle:0, scale:48, paletteRole:spec.bg?.role || "primary" };
    state.regions = getTemplateRegionSpecs(spec).map((region) => cloneTemplateRegion(region,W,H));
    state.posterBorder = spec.border ? {
      enabled:Boolean(spec.border.enabled), color:spec.border.color || paletteColor("ink",state.palette), width:Number(spec.border.width)||0, radius:Number(spec.border.radius)||0
    } : { enabled:false,color:paletteColor("ink",state.palette),width:0,radius:0 };
    state.selectedRegionId = null;
    state.selectedElementId = null;
    transformTarget = null;
    const resetTexts = !preserveTexts || !state.texts.length;
    if (resetTexts) state.texts = makeDefaultOtterTexts();
    reflowRegions({ preserveManual:false, adaptText:false });
    assignTextsToTemplate(spec,{restyle:resetTexts,preferSlots:true});
    if (!state.texts.some((text) => text.id === state.selectedTextId)) state.selectedTextId = resetTexts ? null : state.texts[0]?.id || null;
    refreshAllUI();
    updatePreviewZoom();
    queueRender();
  }

  function prepareV16() {
    templateSpecs.splice(0,templateSpecs.length,...V22_TEMPLATES);
    Object.entries(ROLE_STYLE_DEFAULTS).forEach(([role,style]) => {
      style.fontFamily = role === "headline" ? "chosunKg" : role === "callout" ? "batang" : role === "tag" ? "chosunLo" : role === "footer" ? "chosunKg" : "dotum";
      style.fontWeight = style.bold ? 760 : 520;
      style.effects = style.effect && style.effect !== "none" ? [style.effect] : [];
    });
    Object.entries(REGION_TEXT_PRESETS).forEach(([name,style]) => {
      if (!style.fontFamily || style.fontFamily === "pretendard") {
        style.fontFamily = name.startsWith("hero") ? "chosunKg" : name.startsWith("badge") ? "chosunLo" : name.startsWith("hotline") ? "chosunKg" : "dotum";
      }
      style.fontWeight = style.bold ? 760 : 520;
    });
    Object.assign(STATIC_NUMERIC_SPECS, {
      artboardWidthMm:{min:50,max:420,step:.5,reset:()=>globalNumericDefaults.artboardWidthMm},
      artboardHeightMm:{min:50,max:420,step:.5,reset:()=>globalNumericDefaults.artboardHeightMm},
      pageMargin:{min:0,max:120,step:1,reset:()=>globalNumericDefaults.pageMargin},
      regionGapX:{min:0,max:100,step:1,reset:()=>globalNumericDefaults.regionGapX},
      regionGapY:{min:0,max:100,step:1,reset:()=>globalNumericDefaults.regionGapY},
      palettePaperMix:{min:0,max:96,step:1,reset:()=>globalNumericDefaults.palettePaperMix}
    });
    ensureStateCompatibility();
    document.documentElement.dataset.theme = state.theme;
    document.body.dataset.theme = state.theme;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", state.theme === "light" ? "#ffffff" : "#0b0c10");
  }

  function applyRoleStyle(text, role) {
    const keep = {
      unicodeStyle:text.unicodeStyle,
      customUnicode:text.customUnicode,
      unicodePlacement:text.unicodePlacement || "word",
      prefixEnabled:text.prefixEnabled,
      prefixSymbol:text.prefixSymbol,
      prefixGap:text.prefixGap,
      rangeColors:text.rangeColors || [],
      rangeBackgrounds:text.rangeBackgrounds || [],
      fontWeight:text.fontWeight,
      manualScale:text.manualScale || 1
    };
    Object.assign(text,ROLE_STYLE_DEFAULTS[role] || ROLE_STYLE_DEFAULTS.body,keep);
    normalizeEffects(text);
  }

  function applyRegionAutoTextStyle(text, role, region) {
    const style = regionAutoTextStyle(region,role);
    text.autoFontCap = null;
    text.autoFontScale = 1;
    text.autoGapScale = 1;
    if (!style) return null;
    const special = new Set(["fontCap","fontScale","gapScale","colorRole","effectColorRole","accentWords"]);
    Object.entries(style).forEach(([key,value]) => {
      if (special.has(key) || value === undefined) return;
      if (key === "effect") {
        text.effects = value && value !== "none" ? [value] : [];
        text.effect = value || "none";
      } else text[key] = value;
    });
    text.autoFontCap = Number(style.fontCap)||null;
    text.autoFontScale = Number(style.fontScale)||1;
    text.autoGapScale = Number(style.gapScale)||1;
    if (style.colorRole) {
      const background=region.fillNone?state.background.c1:resolveColor(region,"fill");
      const candidate=paletteColor(style.colorRole,state.palette);
      const active=availablePalette(state.palette).colors;
      const isActive=active.some((color)=>color.toLowerCase()===String(candidate||"").toLowerCase());
      if(style.colorRole==="auto"||!isActive||contrastRatio(candidate,background)<2.65)text.colorMode="auto";
      else{text.colorMode="custom";text.color=candidate;}
    }
    if (style.effectColorRole) text.effectColor = paletteColor(style.effectColorRole,state.palette);
    normalizeEffects(text);
    return style;
  }

  function autoDecoration(text, role, region) {
    const facts = textFacts(text);
    const seed = hashString(String(text.id));
    const regionBg = region.fillNone ? state.background.c1 : resolveColor(region,"fill");
    const baseColor = contrastText(regionBg);
    const accent = bestAccentColor(regionBg,baseColor);
    const tallNarrow = region.h > region.w * 1.34 && facts.compact <= 18;
    if (role === "headline") text.fontFamily = seed % 4 === 0 ? "batang" : (seed % 3 === 0 ? "chosunLo" : "chosunKg");
    else if (role === "callout") text.fontFamily = seed % 2 ? "batang" : "chosunKg";
    else if (role === "tag") text.fontFamily = "chosunLo";
    else if (role === "footer") text.fontFamily = "chosunKg";
    else text.fontFamily = "dotum";
    // 모든 문장은 줄바꿈할 수 있다. 실제 자동 조판에서는 영역 비율과 글자 길이를 보고 한 줄 우선 여부만 계산한다.
    text.autoNoWrap = false;
    text.fontWeight = role === "micro" ? 580 : role === "bullet" ? 690 : 790;
    text.bold = role !== "micro";
    text.italic = false;
    text.underline = false;
    text.strike = false;
    text.colorMode = "auto";
    text.effectColor = accent;
    text.effects = [];
    text.effect = "none";
    text.prefixEnabled = false;
    text.prefixGap = 6;
    text.customUnicode = ["★","※","◆","☎"][seed%4];
    text.autoFontCap = null;
    text.autoFontScale = 1;
    text.autoGapScale = 1;
    text.manualScale = 1;

    if (role === "headline") {
      text.align = "left";
      text.lineHeight = facts.lines.length > 1 ? .86 : .82;
      text.scaleX = facts.compact < 20 ? 1.06 : .91;
      text.letterSpacing = facts.compact < 20 ? -2 : -5;
      text.unicodeStyle = "none";
      if (facts.compact <= 10 && seed%2===0) text.effects=["shadow"];
      text.outlineWidth = facts.compact <= 10 ? 4 : 0;
      text.fontWeight = 840;
    } else if (role === "callout") {
      text.align = region.w / Math.max(1,region.h) > 3.6 ? "left" : "center";
      text.lineHeight = .88;
      text.scaleX = facts.compact <= 12 ? 1.09 : .95;
      text.letterSpacing = facts.compact <= 12 ? -1 : -3;
      text.unicodeStyle = facts.compact <= 10 && seed%3===0 ? "wrapQuote" : "none";
      text.effects = facts.compact <= 12 ? (seed%2 ? ["outline"] : ["shadow","outline"]) : [];
      text.outlineWidth = facts.compact <= 12 ? 3 : 0;
      text.fontWeight = 820;
    } else if (role === "tag") {
      text.align = "center";
      text.lineHeight = .82;
      text.scaleX = facts.compact <= 6 ? 1.12 : .98;
      text.letterSpacing = -1;
      text.unicodeStyle = "none";
      text.effects = facts.compact <= 8 ? ["outline"] : [];
      text.outlineWidth = facts.compact <= 8 ? 2 : 0;
      text.fontWeight = 860;
    } else if (role === "bullet") {
      text.align = "left";
      text.lineHeight = .94;
      text.scaleX = .95;
      text.letterSpacing = -2;
      text.unicodeStyle = "none";
      text.prefixEnabled = !facts.hasBullet;
      text.prefixSymbol = ["•","■","★","♥"][seed%4];
      text.outlineWidth = 0;
      text.fontWeight = 720;
    } else if (role === "footer") {
      text.align = "center";
      text.lineHeight = .84;
      text.scaleX = .91;
      text.letterSpacing = -3;
      text.unicodeStyle = /☎|☏|✆/.test(facts.raw) ? "none" : "wrapPhone";
      text.outlineWidth = 0;
      text.fontWeight = 810;
    } else if (role === "micro") {
      text.align = region.w/Math.max(1,region.h)>3.7 ? "center" : "left";
      text.lineHeight = 1.00;
      text.scaleX = .90;
      text.letterSpacing = -1;
      text.unicodeStyle = "none";
      text.outlineWidth = 0;
      text.fontWeight = 570;
    } else {
      text.align = "left";
      text.lineHeight = facts.lines.length >= 3 ? .98 : .94;
      text.scaleX = .94;
      text.letterSpacing = -2;
      text.unicodeStyle = "none";
      text.outlineWidth = 0;
      text.fontWeight = 690;
    }

    if (tallNarrow) {
      text.align = "center";
      text.lineHeight = .86;
      text.scaleX = 1;
      text.scaleY = 1;
      text.letterSpacing = -2;
      text.autoNoWrap = false;
      text.fontFamily = role === "tag" ? "chosunLo" : "chosunKg";
    }
    const regionStyle = applyRegionAutoTextStyle(text,role,region);
    if (regionStyle?.verticalWhenNarrow && region.h > region.w * 1.12 && facts.compact <= 24) {
      text.autoNoWrap = false;
      text.align = "center";
      text.lineHeight = Math.max(.86,Math.min(text.lineHeight,.96));
      text.scaleX = Math.max(.94,text.scaleX);
    }
    text.rangeColors = [];
    text.rangeBackgrounds = [];
    const accentWords = regionStyle ? (regionStyle.accentWords ?? ["hero","heroShadow","heroOutline"].includes(region.textPreset)) : true;
    if (accentWords) setAutomaticAccentRanges(text,role,region,baseColor);
    setAutomaticAccentBackground(text,role,region);
    normalizeEffects(text);
    const finalTextColor=text.colorMode==="auto"?bestTextColorForEffects(regionBg,text):text.color;
    if(contrastRatio(finalTextColor,regionBg)<2.65&&activeEffects(text).length===0){
      text.effects=["outline"];
      text.effect="outline";
      text.outlineWidth=Math.max(2,Number(text.outlineWidth)||2);
    }
    if(activeEffects(text).length)text.effectColor=bestAutomaticEffectColor(regionBg,finalTextColor,text);
  }

  function setAutomaticAccentBackground(text,role,region){
    if (text.styleMode === "manual" || !["headline","callout","tag"].includes(role)) return;
    const templateStyles={
      "headline-right-block":{shape:"ellipse",word:/수달|돌|귀여움/},
      "right-vertical-panel":{shape:"rect",word:/돌|수달|귀여움/},
      "bottom-giant-copy":{shape:"ellipse",word:/수달|돌|귀여움/},
      "center-burst-editorial":{shape:"rect",word:/수달|돌|귀여움/},
      "left-vertical-type":{shape:"rect",word:/돌|수달|귀여움/},
      "photo-left-story":{shape:"rect",word:/수달|돌|귀여움/}
    };
    const preset=templateStyles[state.templateId];
    if(!preset||role!=="headline")return;
    const match=String(text.text||"").match(preset.word);
    if(!match||match.index==null)return;
    const fill=paletteColor(state.templateId==="headline-right-block"?"tertiary":"primary",state.palette);
    const color=bestTextColorForEffects(fill,text);
    const start=match.index,end=start+match[0].length;
    text.rangeBackgrounds.push({start,end,shape:preset.shape,fill,strokeEnabled:false,stroke:paletteColor("ink",state.palette),strokeWidth:0,paddingX:5,paddingY:2,radius:preset.shape==="rect"?4:20,scaleX:1.05,scaleY:1.03,rotation:0});
    text.rangeColors=text.rangeColors.filter((range)=>range.end<=start||range.start>=end);
    text.rangeColors.push({start,end,color});
  }

  function fitTextToRegion(c,text,box,targetHeight,role,emphasis=1){
    const AUTO_MIN_SCALE=.70;
    const caps={headline:430,callout:320,tag:280,bullet:220,footer:300,body:240,micro:112};
    const maxX={headline:1.10,callout:1.08,tag:1.12,bullet:1.03,footer:1.08,body:1.04,micro:1.03}[role]||1.05;
    const minSpacing={headline:-16,callout:-13,tag:-10,bullet:-10,footer:-14,body:-11,micro:-8}[role]??-10;
    const minLineHeight={headline:1.00,callout:1.00,tag:1.00,bullet:1.05,footer:1.00,body:1.04,micro:1.02}[role]||1.02;
    const fill={headline:.985,callout:.975,tag:.970,bullet:.980,footer:.980,body:.975,micro:.930}[role]||.97;
    const minFont=role==="micro"?10:14;
    const styleCap=Number(text.autoFontCap)||caps[role]||220;
    const styleScale=clamp(Number(text.autoFontScale)||1,.60,2.1);
    const cap=Math.max(minFont,Math.min(520,Math.max(styleCap*styleScale*clamp(emphasis,.72,1.72),box.h*1.34,box.w*.40)));
    const widthLimit=Math.max(20,box.w*fill);
    const heightLimit=Math.max(16,targetHeight*fill);
    const explicitLineCount=String(text.text||"").split("\n").length;
    const compactLength=[...String(text.text||"").replace(/\s+/g,"")].length;
    const aspect=box.w/Math.max(1,box.h);
    const baseScaleX=clamp(Number(text.scaleX)||1,AUTO_MIN_SCALE,maxX);
    const baseSpacing=clamp(Number(text.letterSpacing)||0,minSpacing,24);
    const baseLineHeight=clamp(Number(text.lineHeight)||1,minLineHeight,1.45);

    const measure=(size,sx,spacing,lineHeight,forceNoWrap)=>{
      const probe={...text,scaleX:sx,scaleY:1,letterSpacing:spacing,lineHeight,autoNoWrap:false,autoLayoutNoWrap:false};
      const lines=layoutTextLines(c,probe,size,widthLimit,{forceNoWrap});
      const widest=Math.max(1,...lines.map((line)=>line.width*sx));
      const rawH=Math.max(size*lineHeight,lines.length*size*lineHeight);
      return {lines,widest,rawH,fit:widest<=widthLimit+1&&rawH<=heightLimit+1};
    };

    const binaryLargest=(low,high,test,iterations=18)=>{
      let best=null;
      for(let i=0;i<iterations;i++){
        const mid=(low+high)/2;
        const result=test(mid);
        if(result){best={value:mid,result};low=mid;}else high=mid;
      }
      return best;
    };

    // One font size is tested in the requested priority order:
    // glyph width -> letter spacing -> line height. Wrapping is considered only by the outer solver.
    const fitAtSize=(size,forceNoWrap)=>{
      let result=measure(size,maxX,baseSpacing,baseLineHeight,forceNoWrap);
      if(result.fit)return {size,scaleX:maxX,letterSpacing:baseSpacing,lineHeight:baseLineHeight,...result,stage:"width"};

      result=measure(size,AUTO_MIN_SCALE,baseSpacing,baseLineHeight,forceNoWrap);
      if(result.fit){
        const found=binaryLargest(AUTO_MIN_SCALE,maxX,(sx)=>{
          const checked=measure(size,sx,baseSpacing,baseLineHeight,forceNoWrap);
          return checked.fit?checked:null;
        });
        const sx=found?.value??AUTO_MIN_SCALE;
        const checked=found?.result??result;
        return {size,scaleX:sx,letterSpacing:baseSpacing,lineHeight:baseLineHeight,...checked,stage:"width"};
      }

      result=measure(size,AUTO_MIN_SCALE,minSpacing,baseLineHeight,forceNoWrap);
      if(result.fit){
        const found=binaryLargest(minSpacing,baseSpacing,(spacing)=>{
          const checked=measure(size,AUTO_MIN_SCALE,spacing,baseLineHeight,forceNoWrap);
          return checked.fit?checked:null;
        });
        const spacing=found?.value??minSpacing;
        const checked=found?.result??result;
        return {size,scaleX:AUTO_MIN_SCALE,letterSpacing:spacing,lineHeight:baseLineHeight,...checked,stage:"spacing"};
      }

      result=measure(size,AUTO_MIN_SCALE,minSpacing,minLineHeight,forceNoWrap);
      if(result.fit){
        const found=binaryLargest(minLineHeight,baseLineHeight,(lineHeight)=>{
          const checked=measure(size,AUTO_MIN_SCALE,minSpacing,lineHeight,forceNoWrap);
          return checked.fit?checked:null;
        });
        const lineHeight=found?.value??minLineHeight;
        const checked=found?.result??result;
        return {size,scaleX:AUTO_MIN_SCALE,letterSpacing:minSpacing,lineHeight,...checked,stage:"lineHeight"};
      }
      return null;
    };

    const solve=(forceNoWrap)=>{
      let lo=minFont,hi=cap;
      let best=fitAtSize(minFont,forceNoWrap);
      for(let i=0;i<27;i++){
        const mid=(lo+hi)/2;
        const result=fitAtSize(mid,forceNoWrap);
        if(result){best=result;lo=mid;}else hi=mid;
      }
      if(!best){
        const fallback=measure(minFont,AUTO_MIN_SCALE,minSpacing,minLineHeight,forceNoWrap);
        best={size:minFont,scaleX:AUTO_MIN_SCALE,letterSpacing:minSpacing,lineHeight:minLineHeight,...fallback,stage:"fallback"};
      }
      const fontSize=Math.max(minFont,Math.floor(best.size));
      const finalMeasure=measure(fontSize,best.scaleX,best.letterSpacing,best.lineHeight,forceNoWrap);
      const horizontalFill=clamp(finalMeasure.widest/widthLimit,0,1.5);
      const verticalFill=clamp(finalMeasure.rawH/heightLimit,0,1.5);
      const density=horizontalFill*.48+verticalFill*.52;
      return {
        fontSize,
        scaleX:clamp(best.scaleX,AUTO_MIN_SCALE,maxX),
        scaleY:1,
        letterSpacing:clamp(best.letterSpacing,minSpacing,24),
        lineHeight:clamp(best.lineHeight,minLineHeight,1.45),
        lineCount:finalMeasure.lines.length,
        noWrap:forceNoWrap,
        density,
        horizontalFill,
        verticalFill,
        stage:best.stage
      };
    };

    const wrapped=solve(false);
    if(explicitLineCount>1||role==="bullet")return wrapped;
    const single=solve(true);
    if(wrapped.lineCount<=1)return single;

    const sizeGain=wrapped.fontSize/Math.max(1,single.fontSize);
    const densityGain=wrapped.density-single.density;
    const narrowShort=aspect<1.48&&compactLength<=26;
    const singleTiny=single.fontSize<Math.max(22,Math.min(heightLimit*.30,widthLimit*.085));
    const heavilyCompressed=single.scaleX<=AUTO_MIN_SCALE+.015||single.letterSpacing<=minSpacing+.5||single.lineHeight<=minLineHeight+.015;
    const wrappedReasonable=wrapped.lineCount<=Math.max(4,explicitLineCount+3);
    const chooseWrapped=(
      narrowShort&&wrappedReasonable&&sizeGain>=1.10&&densityGain>=-.03
    )||(
      singleTiny&&wrappedReasonable&&sizeGain>=1.16
    )||(
      heavilyCompressed&&wrappedReasonable&&sizeGain>=1.28&&densityGain>=.02
    )||(
      compactLength>42&&wrappedReasonable&&sizeGain>=1.42&&densityGain>=.08
    );
    return chooseWrapped?wrapped:single;
  }

function autoStyleAssignedTexts({ force = false, skipAdapt = false, regionIds = null } = {}) {
    if (!skipAdapt) adaptRegionsToText();
    const filter=regionIds?new Set(regionIds):null;
    const groups=new Map();
    state.texts.forEach((text,index)=>{
      if(filter&&!filter.has(text.regionId))return;
      text.autoRole=inferTextRole(text,index);
      if(!isTextManualProtected(text))text.role=text.autoRole;
      if(!groups.has(text.regionId))groups.set(text.regionId,[]);
      groups.get(text.regionId).push(text);
    });
    groups.forEach((texts,regionId)=>{
      const region=state.regions.find((item)=>item.id===regionId);
      if(!region)return;
      region.textVAlign="center";
      const box=regionContentBox(region);
      const styled=texts.filter((text)=>!isTextManualProtected(text)&&(force||text.styleMode!=="manual"));
      if(!styled.length)return;
      const weights=styled.map((text)=>{
        const role=text.autoRole||"body",facts=textFacts(text);
        const factor={headline:1.8,callout:1.25,tag:.95,bullet:1.18,footer:1.10,body:1.12,micro:.52}[role]||1;
        return clamp((facts.compact<=12?1.35:facts.compact<=28?1.12:1)*factor, .55, 2.3);
      });
      const total=weights.reduce((sum,value)=>sum+value,0)||1;
      const gapBudget=Math.max(0,styled.length-1)*3;
      styled.forEach((text,index)=>{
        const role=text.autoRole||"body";
        autoDecoration(text,role,region);
        const targetHeight=styled.length===1?box.h:Math.max(28,(box.h-gapBudget)*weights[index]/total);
        const facts=textFacts(text);
        const emphasis=(Number(region.emphasis)||1)*(facts.compact<=12?1.10:1);
        const fitted=fitTextToRegion(sceneCtx,text,box,targetHeight,role,emphasis);
        text.fontSize=fitted.fontSize;
        text.scaleX=fitted.scaleX;
        text.scaleY=fitted.scaleY;
        text.letterSpacing=fitted.letterSpacing;
        text.lineHeight=fitted.lineHeight;
        text.autoLayoutNoWrap=Boolean(fitted.noWrap);
        text.gap=Math.round(clamp(text.fontSize*.055*(Number(text.autoGapScale)||1),2,12));
      });
    });
  }

function autoArrangeTexts({ reassign = true, forceStyle = false, announce = false } = {}) {
    const regions=state.regions.filter((region)=>region.acceptText&&region.shape!=="line");
    if(!regions.length)return;
    const validIds=new Set(regions.map((region)=>region.id));
    const protectedTexts=state.texts.filter((text)=>isTextManualProtected(text)&&validIds.has(text.regionId));
    if(reassign){
      const occupancy=new Map(regions.map((region)=>[region.id,0]));
      protectedTexts
        .sort((a,b)=>(a.order||0)-(b.order||0))
        .forEach((text)=>{
          text.order=occupancy.get(text.regionId)||0;
          occupancy.set(text.regionId,text.order+1);
        });
      const ranked=state.texts.filter((text)=>!protectedTexts.includes(text)).map((text,index)=>{
        const role=inferTextRole(text,state.texts.indexOf(text));
        const facts=textFacts(text);
        const priority=({headline:210,footer:180,bullet:150,callout:140,tag:130,body:120,micro:85}[role]||100)+Math.min(facts.compact,60);
        return {text,index,role,facts,priority};
      }).sort((a,b)=>b.priority-a.priority);
      ranked.forEach(({text,role,facts})=>{
        let best=regions[0],bestScore=-Infinity;
        regions.forEach((region)=>{
          const score=regionTextScore(region,role,facts,occupancy.get(region.id)||0);
          if(score>bestScore){best=region;bestScore=score;}
        });
        text.regionId=best.id;
        text.order=occupancy.get(best.id)||0;
        text.manualX=null;
        text.manualY=null;
        text.manualScale=1;
        text.autoRole=role;
        text.regionLocked=false;
        text.manualProtected=false;
        text.styleMode="auto";
        occupancy.set(best.id,text.order+1);
      });
      normalizeTextOrders();
    }
    adaptRegionsToText();
    autoStyleAssignedTexts({force:forceStyle,skipAdapt:true});
    if(announce){
      const count=protectedTexts.length;
      toast(count?`자동 배치를 다시 계산했습니다. 수동 고정 ${count}개는 유지했습니다.`:"문장 길이·줄바꿈·영역 밀도를 다시 계산했습니다.");
    }
  }

  function effectLabel(value) {
    const values = Array.isArray(value) ? value : (value && value !== "none" ? [value] : []);
    if (!values.length) return "효과 없음";
    const labels={outline:"외곽선",shadow:"평면 그림자",hollow:"빈 그림자",extrude:"단색 입체"};
    return values.map((item)=>labels[item]||item).join(" + ");
  }

  function automaticTextCandidates(background) {
    const colors=availablePalette(state.palette).colors.slice();
    const unique=[];
    colors.forEach((color)=>{if(color&&!unique.some((item)=>item.toLowerCase()===color.toLowerCase()))unique.push(color);});
    if(!unique.length)unique.push(state.palette.primary||"#ffd400");
    return unique.sort((a,b)=>contrastRatio(b,background)-contrastRatio(a,background));
  }

  function bestTextColorForEffects(background,text) {
    const candidates=automaticTextCandidates(background);
    return candidates.map((color)=>({color,score:contrastRatio(color,background)})).sort((a,b)=>b.score-a.score)[0]?.color||state.palette.primary;
  }

  function bestAutomaticEffectColor(background,textColor,text) {
    const effects=activeEffects(text);
    if(!effects.length)return text.effectColor||bestAccentColor(background,textColor);
    if(effects.includes("shadow")&&luminance(background)<.13)return "#777777";
    const candidates=automaticTextCandidates(background)
      .concat(availablePalette(state.palette).colors)
      .filter((color,index,array)=>color&&array.findIndex((item)=>item.toLowerCase()===color.toLowerCase())===index)
      .filter((color)=>color.toLowerCase()!==String(textColor||"").toLowerCase());
    const ranked=candidates.map((color)=>{
      const againstText=contrastRatio(color,textColor);
      const againstBackground=contrastRatio(color,background);
      const score=againstText*1.35+againstBackground*.45;
      return {color,score,againstText,againstBackground};
    }).sort((a,b)=>b.score-a.score);
    const chosen=ranked.find((item)=>item.againstText>=2.2&&item.againstBackground>=1.35)||ranked[0];
    if(chosen)return chosen.color;
    return availablePalette(state.palette).colors.find((color)=>color.toLowerCase()!==String(textColor||"").toLowerCase())||textColor||state.palette.primary;
  }

  function resolvedShadowColor(color,background) {
    const raw=color||"#111111";
    if(luminance(background)<.13&&luminance(raw)<.24)return "#777777";
    return raw;
  }

  function heartPath(c,x,y,w,h){
    const top=y+h*.18;
    c.beginPath();
    c.moveTo(x+w*.50,y+h*.92);
    c.bezierCurveTo(x+w*.43,y+h*.82,x+w*.08,y+h*.62,x+w*.08,y+h*.34);
    c.bezierCurveTo(x+w*.08,y+h*.14,x+w*.31,y+h*.07,x+w*.50,y+h*.27);
    c.bezierCurveTo(x+w*.69,y+h*.07,x+w*.92,y+h*.14,x+w*.92,y+h*.34);
    c.bezierCurveTo(x+w*.92,y+h*.62,x+w*.57,y+h*.82,x+w*.50,y+h*.92);
    c.closePath();
  }

  function trianglePath(c,x,y,w,h){
    c.beginPath();
    c.moveTo(x+w*.5,y+h*.06);
    c.lineTo(x+w*.95,y+h*.92);
    c.lineTo(x+w*.05,y+h*.92);
    c.closePath();
  }

  function cloudPath(c,x,y,w,h){
    const cx=x+w*.5, base=y+h*.78;
    c.beginPath();
    c.moveTo(x+w*.15,base);
    c.bezierCurveTo(x+w*.02,base,x+w*.02,y+h*.53,x+w*.18,y+h*.49);
    c.bezierCurveTo(x+w*.17,y+h*.28,x+w*.39,y+h*.18,x+w*.53,y+h*.32);
    c.bezierCurveTo(x+w*.68,y+h*.12,x+w*.91,y+h*.25,x+w*.86,y+h*.49);
    c.bezierCurveTo(x+w*.99,y+h*.55,x+w*.96,base,x+w*.82,base);
    c.closePath();
  }

  function shapePath(c,item){
    if(item.shape==="ellipse"||item.type==="circle"){
      c.beginPath();c.ellipse(item.x+item.w/2,item.y+item.h/2,item.w/2,item.h/2,0,0,Math.PI*2);
    }else if(item.shape==="burst"||item.type==="burst")burstPath(c,item.x,item.y,item.w,item.h);
    else if(item.type==="heart")heartPath(c,item.x,item.y,item.w,item.h);
    else if(item.type==="triangle")trianglePath(c,item.x,item.y,item.w,item.h);
    else if(item.type==="cloud")cloudPath(c,item.x,item.y,item.w,item.h);
    else roundedRectPath(c,item.x,item.y,item.w,item.h,item.radius||0);
  }

  function drawShapeEffectLayers(c,item){
    const effects=activeEffects(item);
    const size=clamp(Number(item.effectSize)||0,0,100);
    const rawEffectColor=resolveColor(item,"effectColor")||item.effectColor||"#111111";
    const shadowSurface=(state.background?.mode==="solid"?state.background.c1:"#ffffff");
    const color=effects.includes("shadow")?resolvedShadowColor(rawEffectColor,shadowSurface):rawEffectColor;
    c.shadowColor="transparent";c.shadowBlur=0;c.shadowOffsetX=0;c.shadowOffsetY=0;
    if(effects.includes("extrude")){
      const depth=clamp(size||14,2,70),step=depth>34?2:1;
      for(let offset=depth;offset>=1;offset-=step){
        c.save();c.translate(offset*.58,offset*.58);shapePath(c,item);c.fillStyle=color;c.fill();c.restore();
      }
    }
    if(effects.includes("shadow")){
      const offset=Math.max(1,size*.32);
      c.save();c.translate(offset,offset);shapePath(c,item);
      if(item.fillNone){c.strokeStyle=color;c.lineWidth=Math.max(3,size*.28||3);c.stroke();}
      else{c.fillStyle=color;c.fill();}
      c.restore();
    }
    if(effects.includes("hollow")){
      const offset=Math.max(2,size*.45);
      c.save();c.translate(offset,offset);shapePath(c,item);c.strokeStyle=color;c.lineWidth=Math.max(3,size*.28||3);c.stroke();c.restore();
    }
  }

  function drawRegion(c,region){
    normalizeEffects(region);
    withItemTransform(c,region,()=>{
      c.save();
      drawShapeEffectLayers(c,region);
      if(region.shape==="line"){
        if(!region.fillNone){c.fillStyle=resolveColor(region,"fill");roundedRectPath(c,region.x,region.y,region.w,Math.max(2,region.h),region.radius);c.fill();}
      }else{
        shapePath(c,region);
        if(!region.fillNone){c.fillStyle=resolveColor(region,"fill");c.fill();}
        if(!region.strokeNone&&region.strokeWidth>0){shapePath(c,region);c.strokeStyle=resolveColor(region,"stroke");c.lineWidth=region.strokeWidth;c.stroke();}
      }
      c.restore();
    });
  }

  const imageLayerCache = new Map();

  function elementGeometry(element){
    if(!element)return null;
    let item=element;
    if(element.type==="band"){
      const {trimW}=dimensions();
      if((element.bandScope||"canvas")==="region"){
        const region=state.regions.find((candidate)=>candidate.id===element.bandRegionId&&candidate.acceptText)||state.regions.find((candidate)=>candidate.acceptText&&candidate.shape!=="line");
        if(region){
          const position=clamp(Number(element.bandPosition)||.5,0,1);
          item={...element,x:region.x,y:region.y+region.h*position-element.h/2,w:region.w,h:element.h,bandClipRegion:region};
        }else item={...element,x:0,w:trimW};
      }else item={...element,x:0,w:trimW,y:element.y,h:element.h};
    }else item={...element};
    const explicitClip=state.regions.find((region)=>region.id===element.clipRegionId);
    item.clipRegion=explicitClip||item.bandClipRegion||null;
    return item;
  }

  function imageDrawRect(img,item){
    const ir=img.naturalWidth/img.naturalHeight,er=item.w/item.h;
    let dw,dh,dx,dy;
    if((item.imageFit||"contain")==="contain"){
      if(ir>er){dw=item.w;dh=dw/ir;dx=0;dy=(item.h-dh)/2;}
      else{dh=item.h;dw=dh*ir;dy=0;dx=(item.w-dw)/2;}
    }else{
      if(ir>er){dh=item.h;dw=dh*ir;dy=0;dx=(item.w-dw)/2;}
      else{dw=item.w;dh=dw/ir;dx=0;dy=(item.h-dh)/2;}
    }
    return {dx,dy,dw,dh};
  }

  function getImageLayer(item){
    const img=getImage(item.imageSrc);
    if(!img?.complete||!img.naturalWidth)return null;
    const w=Math.max(1,Math.round(item.w)),h=Math.max(1,Math.round(item.h));
    const key=`${item.imageSrc}|${w}|${h}|${item.imageFit||"contain"}`;
    if(imageLayerCache.has(key))return imageLayerCache.get(key);
    const layer=document.createElement("canvas");layer.width=w;layer.height=h;
    const lc=layer.getContext("2d");
    const rect=imageDrawRect(img,{...item,w,h});
    lc.drawImage(img,rect.dx,rect.dy,rect.dw,rect.dh);
    imageLayerCache.set(key,layer);
    if(imageLayerCache.size>24)imageLayerCache.delete(imageLayerCache.keys().next().value);
    return layer;
  }

  function tintedAlphaLayer(source,color){
    const layer=document.createElement("canvas");layer.width=source.width;layer.height=source.height;
    const lc=layer.getContext("2d");
    lc.drawImage(source,0,0);
    lc.globalCompositeOperation="source-in";
    lc.fillStyle=color;lc.fillRect(0,0,layer.width,layer.height);
    return layer;
  }

  async function trimTransparentDataUrl(src){
    const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
    const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const c=canvas.getContext("2d",{willReadFrequently:true});c.drawImage(img,0,0);
    const data=c.getImageData(0,0,canvas.width,canvas.height).data;
    let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      if(data[(y*canvas.width+x)*4+3]>2){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    }
    if(maxX<minX||maxY<minY)return {src,width:img.naturalWidth,height:img.naturalHeight,trimmed:false};
    const w=maxX-minX+1,h=maxY-minY+1;
    if(w===canvas.width&&h===canvas.height)return {src,width:w,height:h,trimmed:false};
    const out=document.createElement("canvas");out.width=w;out.height=h;
    out.getContext("2d").drawImage(canvas,minX,minY,w,h,0,0,w,h);
    return {src:out.toDataURL("image/png"),width:w,height:h,trimmed:true};
  }

  function drawImageEffects(c,item,layer){
    const effects=activeEffects(item),size=clamp(Number(item.effectSize)||0,0,100);
    if(!effects.length)return;
    const rawEffectColor=item.effectColor||"#111111";
    const shadowSurface=(state.background?.mode==="solid"?state.background.c1:"#ffffff");
    const color=effects.includes("shadow")?resolvedShadowColor(rawEffectColor,shadowSurface):rawEffectColor;
    const tint=tintedAlphaLayer(layer,color);
    if(effects.includes("extrude")){
      const depth=clamp(size||14,2,70),step=depth>34?2:1;
      for(let offset=depth;offset>=1;offset-=step)c.drawImage(tint,item.x+offset*.58,item.y+offset*.58,item.w,item.h);
    }
    if(effects.includes("shadow")){
      const offset=Math.max(1,size*.32);c.drawImage(tint,item.x+offset,item.y+offset,item.w,item.h);
    }
    if(effects.includes("hollow")){
      const off=document.createElement("canvas");off.width=layer.width;off.height=layer.height;
      const oc=off.getContext("2d");
      oc.drawImage(tint,0,0);
      oc.globalCompositeOperation="destination-out";oc.drawImage(layer,0,0);
      const offset=Math.max(2,size*.45);c.drawImage(off,item.x+offset,item.y+offset,item.w,item.h);
    }
  }

  function drawElement(c,element){
    normalizeEffects(element);
    const item=elementGeometry(element);
    if(!item)return;
    c.save();
    if(item.clipRegion)clipItemPath(c,item.clipRegion);
    withItemTransform(c,item,()=>{
      c.save();c.shadowColor="transparent";c.shadowBlur=0;
      if(item.type==="image"){
        const layer=getImageLayer(item);
        if(layer){
          drawImageEffects(c,item,layer);
          c.save();shapePath(c,item);c.clip();
          if(!item.fillNone){c.fillStyle=item.fill;c.fillRect(item.x,item.y,item.w,item.h);}
          c.drawImage(layer,item.x,item.y,item.w,item.h);c.restore();
        }else if(!item.fillNone){shapePath(c,item);c.fillStyle=item.fill;c.fill();}
        if(!item.strokeNone&&item.strokeWidth>0){shapePath(c,item);c.strokeStyle=item.stroke;c.lineWidth=item.strokeWidth;c.stroke();}
      }else{
        drawShapeEffectLayers(c,item);
        shapePath(c,item);
        if(!item.fillNone){c.fillStyle=item.fill;c.fill();}
        if(!item.strokeNone&&item.strokeWidth>0){shapePath(c,item);c.strokeStyle=item.stroke;c.lineWidth=item.strokeWidth;c.stroke();}
      }
      if(item.label){
        c.fillStyle=item.labelColor||"#111111";
        c.font=`${Math.max(600,item.labelWeight||760)} ${item.labelSize||64}px ${fontFamilies.dotum}`;
        c.textAlign="center";c.textBaseline="middle";
        const maxW=item.w*.82,measured=c.measureText(item.label).width,sx=Math.min(1,maxW/Math.max(1,measured));
        c.save();c.translate(item.x+item.w/2,item.y+item.h/2);c.scale(sx,1);c.fillText(item.label,0,0);c.restore();
      }
      c.restore();
    });
    c.restore();
  }

function setTextFont(c,text,fontSize){
    const familyKey=fontFamilies[text.fontFamily]?text.fontFamily:"dotum";
    const weight=familyKey==="pretendard" ? clamp(Number(text.fontWeight)||(text.bold?760:520),100,900) : (text.bold?700:400);
    c.font=`${text.italic?"italic ":""}${weight} ${fontSize}px ${fontFamilies[familyKey]}`;
  }

  function regionContentBox(region){
    let pad=Math.max(0,Number(region.padding)||0);
    if(region.shape==="ellipse")pad+=Math.min(region.w,region.h)*.095;
    if(region.shape==="burst")pad+=Math.min(region.w,region.h)*.135;
    return {x:region.x+pad,y:region.y+pad,w:Math.max(10,region.w-pad*2),h:Math.max(10,region.h-pad*2)};
  }

  function obstacleRects(){
    return state.elements.filter((element)=>element.affectFlow).map((element)=>{
      const item=elementGeometry(element),margin=Number(element.flowMargin)||0;
      return {x:item.x-margin,y:item.y-margin,w:item.w+margin*2,h:item.h+margin*2,id:element.id};
    }).filter((rect)=>rect.w>0&&rect.h>0);
  }

function buildLayout(c){
    const AUTO_MIN_SCALE=.70;
    const fragments=[];
    let overflow=false;
    const regions=state.regions.filter((region)=>region.acceptText&&region.shape!=="line");

    for(const region of regions){
      const box=regionContentBox(region);
      const obstacles=obstacleRects(region.id);
      const texts=state.texts.filter((text)=>text.regionId===region.id).sort((a,b)=>a.order-b.order);
      if(!texts.length)continue;

      const estimateText=(text,fontScale=1,availableWidth=box.w)=>{
        const protectedText=isTextManualProtected(text);
        const minScale=protectedText?.45:AUTO_MIN_SCALE;
        const fontSize=Math.max(protectedText?8:10,(Number(text.fontSize)||12)*(Number(text.manualScale)||1)*fontScale);
        const scaleX=clamp(Number(text.scaleX)||1,minScale,1.65);
        const scaleY=protectedText?clamp(Number(text.scaleY)||1,.45,1.65):1;
        const safeLineHeight=protectedText?clamp(Number(text.lineHeight)||1,.72,2):Math.max(.90,Number(text.lineHeight)||1);
        const probe={...text,scaleX,scaleY,lineHeight:safeLineHeight};
        const lines=layoutTextLines(c,probe,fontSize,availableWidth);
        const lineH=Math.max(8,fontSize*safeLineHeight*scaleY);
        return {text,protectedText,minScale,fontSize,scaleX,scaleY,lines,lineH,h:Math.max(lineH,lines.length*lineH)};
      };

      let estimated=texts.map((text)=>estimateText(text));
      const totalHeight=()=>estimated.reduce((sum,item)=>sum+item.h+Math.max(0,Number(item.text.gap)||0),0)-Math.max(0,Number(texts.at(-1)?.gap)||0);
      let groupHeight=totalHeight();
      if(groupHeight>box.h){
        const fixedHeight=estimated.filter((item)=>item.protectedText).reduce((sum,item)=>sum+item.h+Math.max(0,Number(item.text.gap)||0),0);
        const autoHeight=Math.max(1,groupHeight-fixedHeight);
        const autoRoom=Math.max(1,box.h-fixedHeight);
        const fontFactor=clamp(autoRoom/autoHeight,.45,1);
        estimated=estimated.map((item)=>item.protectedText?item:estimateText(item.text,fontFactor));
        groupHeight=totalHeight();
      }

      let cursorY=box.y+Math.max(0,(box.h-groupHeight)/2);
      for(const baseEstimate of estimated){
        let estimate=baseEstimate;
        const {text,minScale}=estimate;
        let lines=estimate.lines;
        let lineH=estimate.lineH;
        let blockH=estimate.h;
        let desiredW=Math.max(1,...lines.map((line)=>line.width*estimate.scaleX));
        let place;
        if(text.manualX!=null&&text.manualY!=null){
          const y=clamp(text.manualY,box.y,Math.max(box.y,box.y+box.h-blockH));
          const intervals=availableIntervals(box,y,blockH,obstacles);
          const preferred=clamp(text.manualX,box.x,box.x+box.w-20);
          const interval=intervals.find(([a,b])=>preferred>=a&&preferred<=b)||intervals[0]||[box.x,box.x+box.w];
          const placedX=clamp(preferred,interval[0],Math.max(interval[0],interval[1]-20));
          place={x:placedX,y,w:Math.max(20,interval[1]-placedX)};
        }else{
          place=findPlacement(box,cursorY,blockH,desiredW,obstacles);
        }

        // Re-wrap for the actual available interval. Auto text reduces font size rather than crushing line height.
        for(let pass=0;pass<8;pass++){
          estimate=estimateText(text,estimate.fontSize/Math.max(1,(Number(text.fontSize)||12)*(Number(text.manualScale)||1)),place.w);
          lines=estimate.lines;lineH=estimate.lineH;blockH=estimate.h;desiredW=Math.max(1,...lines.map((line)=>line.width*estimate.scaleX));
          const verticalLimit=text.manualY!=null?box.y+box.h-place.y:box.y+box.h-place.y;
          if(estimate.protectedText||blockH<=verticalLimit+1)break;
          const factor=clamp(verticalLimit/Math.max(1,blockH),.72,.96);
          estimate={...estimate,fontSize:Math.max(10,estimate.fontSize*factor)};
          const safeLineHeight=Math.max(.90,Number(text.lineHeight)||1);
          const probe={...text,lineHeight:safeLineHeight,scaleY:1};
          lines=layoutTextLines(c,probe,estimate.fontSize,place.w);
          lineH=Math.max(8,estimate.fontSize*safeLineHeight);blockH=Math.max(lineH,lines.length*lineH);
          estimate={...estimate,lines,lineH,h:blockH,scaleY:1};
        }

        if(text.manualX==null||text.manualY==null){
          place=findPlacement(box,place.y,blockH,desiredW,obstacles);
          cursorY=place.y+blockH+Math.max(0,Number(text.gap)||0);
        }else{
          place.y=clamp(place.y,box.y,Math.max(box.y,box.y+box.h-blockH));
        }
        const widthRatio=Math.min(1,place.w/Math.max(1,desiredW));
        const scaleX=Math.max(minScale,Math.min(estimate.scaleX,Math.max(AUTO_MIN_SCALE,estimate.scaleX*widthRatio)));
        if(place.y+blockH>box.y+box.h+1||Math.max(...lines.map((line)=>line.width*scaleX))>place.w+1)overflow=true;
        fragments.push({text,region,lines,fontSize:estimate.fontSize,lineH,scaleX,scaleY:estimate.scaleY,x:place.x,y:place.y,w:place.w,h:blockH,fit:1,box});
      }
    }
    return {fragments,overflow};
  }


  function lineStartX(fragment,line){
    const minScale=isTextManualProtected(fragment.text)?.45:.70;
    const sx=clamp(Number(fragment.scaleX)||Number(fragment.text.scaleX)||1,minScale,1.65);
    const scaledW=line.width*sx;
    if(fragment.text.align==="center")return fragment.x+(fragment.w-scaledW)/2;
    if(fragment.text.align==="right")return fragment.x+fragment.w-scaledW;
    return fragment.x;
  }


  function textLineRuns(c,fragment,line){
    setTextFont(c,fragment.text,fragment.fontSize);
    const runs=[];let pen=0;
    for(const token of line.tokens){
      for(const ch of token.ch){
        const width=c.measureText(ch).width;
        runs.push({index:token.index,ch,x:pen,w:width});
        pen+=width+fragment.text.letterSpacing;
      }
    }
    return runs;
  }

  function drawRangeBackgroundShape(c,range,box){
    const cx=box.x+box.w/2,cy=box.y+box.h/2;
    c.save();c.translate(cx,cy);c.rotate((Number(range.rotation)||0)*Math.PI/180);c.scale(Number(range.scaleX)||1,Number(range.scaleY)||1);c.translate(-cx,-cy);
    const item={x:box.x,y:box.y,w:box.w,h:box.h,radius:Number(range.radius)||0,type:range.shape,shape:range.shape};
    if(range.shape==="circle"){
      c.beginPath();c.ellipse(cx,cy,box.w/2,box.h/2,0,0,Math.PI*2);
    }else if(range.shape==="ellipse"){
      c.beginPath();c.ellipse(cx,cy,box.w/2,box.h/2,0,0,Math.PI*2);
    }else if(range.shape==="heart")heartPath(c,box.x,box.y,box.w,box.h);
    else if(range.shape==="burst")burstPath(c,box.x,box.y,box.w,box.h,18);
    else roundedRectPath(c,box.x,box.y,box.w,box.h,Number(range.radius)||0);
    if(range.fill&&range.fill!=="none"){c.fillStyle=range.fill;c.fill();}
    if(range.strokeEnabled&&range.strokeWidth>0){
      if(range.shape==="circle"||range.shape==="ellipse"){c.beginPath();c.ellipse(cx,cy,box.w/2,box.h/2,0,0,Math.PI*2);}
      else if(range.shape==="heart")heartPath(c,box.x,box.y,box.w,box.h);
      else if(range.shape==="burst")burstPath(c,box.x,box.y,box.w,box.h,18);
      else roundedRectPath(c,box.x,box.y,box.w,box.h,Number(range.radius)||0);
      c.strokeStyle=range.stroke||"#111111";c.lineWidth=Number(range.strokeWidth)||2;c.stroke();
    }
    c.restore();
  }

  function drawTextRangeBackgrounds(c,fragment){
    const text=fragment.text,ranges=text.rangeBackgrounds||[];
    if(!ranges.length)return;
    const minScale=isTextManualProtected(text)?.45:.70;
    const sx=clamp(Number(fragment.scaleX)||Number(text.scaleX)||1,minScale,1.65);
    const sy=clamp(Number(fragment.scaleY)||Number(text.scaleY)||1,minScale,1.65);
    fragment.lines.forEach((line,lineIndex)=>{
      const runs=textLineRuns(c,fragment,line);
      const baseline=fragment.y+lineIndex*fragment.lineH+fragment.fontSize*.82*sy;
      const startX=lineStartX(fragment,line);
      ranges.forEach((range)=>{
        const selected=runs.filter((run)=>run.index!=null&&run.index>=range.start&&run.index<range.end);
        if(!selected.length)return;
        const padX=Number(range.paddingX)||0,padY=Number(range.paddingY)||0;
        if(range.shape==="circle"){
          selected.forEach((run)=>{
            const width=(run.w+padX*2)*sx,height=fragment.fontSize*sy+padY*2;
            const size=Math.max(width,height);
            drawRangeBackgroundShape(c,range,{x:startX+(run.x+run.w/2)*sx-size/2,y:baseline-fragment.fontSize*.82*sy-padY-(size-height)/2,w:size,h:size});
          });
        }else{
          const first=selected[0],last=selected.at(-1);
          const x=startX+first.x*sx-padX;
          const width=(last.x+last.w-first.x)*sx+padX*2;
          const height=fragment.fontSize*sy+padY*2;
          drawRangeBackgroundShape(c,range,{x,y:baseline-fragment.fontSize*.82*sy-padY,w:width,h:height});
        }
      });
    });
  }


  function drawTokenLine(c,fragment,line,lineIndex,baseColor,resolvedEffectColor=null){
    const {text,fontSize,lineH}=fragment;
    setTextFont(c,text,fontSize);
    const minScale=isTextManualProtected(text)?.45:.70;
    const sx=clamp(Number(fragment.scaleX)||Number(text.scaleX)||1,minScale,1.65);
    const sy=clamp(Number(fragment.scaleY)||Number(text.scaleY)||1,minScale,1.65);
    const startX=lineStartX(fragment,line),y=fragment.y+lineIndex*lineH+fontSize*.82*sy;
    c.save();c.translate(startX,y);c.scale(sx,sy);c.textAlign="left";c.textBaseline="alphabetic";
    c.shadowColor="transparent";c.shadowBlur=0;c.shadowOffsetX=0;c.shadowOffsetY=0;
    const drawGlyphs=(offsetX=0,offsetY=0,colorOverride=null,stroke=false,strokeWidth=0)=>{
      let pen=0;
      for(const token of line.tokens)for(const ch of token.ch){
        const color=colorOverride||colorAtIndex(text,token.index,baseColor);
        if(stroke){c.strokeStyle=color;c.lineWidth=strokeWidth;c.lineJoin="round";c.strokeText(ch,pen+offsetX,offsetY);}
        else{c.fillStyle=color;c.fillText(ch,pen+offsetX,offsetY);}
        pen+=c.measureText(ch).width+text.letterSpacing;
      }
      return Math.max(0,pen-text.letterSpacing);
    };
    const effects=activeEffects(text),thickness=clamp(Number(text.outlineWidth)||0,0,48),effectColor=resolvedEffectColor||text.effectColor||"#111111";
    if(effects.includes("extrude")){
      const depth=clamp(thickness||8,3,38),step=depth>24?2:1;
      for(let offset=depth;offset>=1;offset-=step)drawGlyphs(offset*.58,offset*.58,effectColor);
    }
    if(effects.includes("shadow")){const offset=Math.max(1,thickness*.72);drawGlyphs(offset,offset,effectColor);}
    if(effects.includes("hollow")){const offset=Math.max(2,thickness*1.30);drawGlyphs(offset,offset,effectColor,true,Math.max(2,thickness));}
    if(effects.includes("outline"))drawGlyphs(0,0,effectColor,true,Math.max(1,thickness*2));
    const drawW=drawGlyphs();
    c.strokeStyle=baseColor;c.lineWidth=Math.max(1,fontSize*.045);
    if(text.underline){c.beginPath();c.moveTo(0,fontSize*.12);c.lineTo(drawW,fontSize*.12);c.stroke();}
    if(text.strike){c.beginPath();c.moveTo(0,-fontSize*.31);c.lineTo(drawW,-fontSize*.31);c.stroke();}
    c.restore();
  }


  function clipTextToRegion(c,region){
    const allowance=Math.min(dimensions().trimW,dimensions().trimH)*clamp(Number(region.overflowAllowance)||0,0,.05);
    if(allowance>0&&region.shape==="rect"){
      roundedRectPath(c,region.x-allowance,region.y-allowance,region.w+allowance*2,region.h+allowance*2,(region.radius||0)+allowance*.25);c.clip();
    }else clipItemPath(c,region);
  }

  function orderedTextFragments(fragments){
    return [...fragments].sort((a,b)=>{
      const aSelectedText=a.text.id===state.selectedTextId?2:0;
      const bSelectedText=b.text.id===state.selectedTextId?2:0;
      const aSelectedRegion=a.region.id===state.selectedRegionId?1:0;
      const bSelectedRegion=b.region.id===state.selectedRegionId?1:0;
      return (aSelectedText+aSelectedRegion)-(bSelectedText+bSelectedRegion);
    });
  }

  function drawTexts(c,fragments){
    const ordered=orderedTextFragments(fragments);
    ordered.forEach((fragment)=>drawTextRangeBackgrounds(c,fragment));
    ordered.forEach((fragment)=>{
      const bg=sampleSceneColor(fragment.x+fragment.w/2,fragment.y+fragment.h/2);
      const base=fragment.text.colorMode==="auto"?bestTextColorForEffects(bg,fragment.text):fragment.text.color;
      const automaticEffect=fragment.text.colorMode==="auto"&&!isTextManualProtected(fragment.text);
      const effectColor=automaticEffect?bestAutomaticEffectColor(bg,base,fragment.text):resolvedShadowColor(fragment.text.effectColor,bg);
      c.save();if(fragment.region.clipText)clipTextToRegion(c,fragment.region);fragment.lines.forEach((line,index)=>drawTokenLine(c,fragment,line,index,base,effectColor));c.restore();
    });
  }

  function drawGuides(c,fragments){
    const {bleed}=dimensions();
    c.save();c.translate(bleed,bleed);
    state.regions.forEach((region,index)=>{
      const selected=region.id===state.selectedRegionId,active=transformTarget?.kind==="region"&&transformTarget.id===region.id;
      if(!state.showRegions&&!selected&&!active)return;
      c.save();
      if(!active){
        c.setLineDash(selected?[12,6]:[7,6]);c.lineWidth=selected?4:2.5;c.strokeStyle=selected?"#00ff9d":"#00d8ff";
        c.fillStyle=selected?"rgba(0,255,157,.10)":"rgba(0,216,255,.07)";
        withItemTransform(c,region,()=>{shapePath(c,region);c.fill();shapePath(c,region);c.stroke();});
        c.setLineDash([]);c.fillStyle="#081018";c.font=`700 20px ${fontFamilies.pretendard}`;c.textAlign="left";c.textBaseline="top";
        const label=`${index+1} ${region.name}`;const width=c.measureText(label).width+16;
        c.fillStyle=selected?"#00ff9d":"#00d8ff";c.fillRect(region.x+6,region.y+6,width,28);c.fillStyle="#071014";c.fillText(label,region.x+14,region.y+10);
      }
      if(selected&&region.acceptText){const box=regionContentBox(region);c.setLineDash([5,5]);c.strokeStyle="#ff4fd8";c.lineWidth=2;c.strokeRect(box.x,box.y,box.w,box.h);}
      if(active)drawTransformHandles(c,region);
      c.restore();
    });
    state.elements.forEach((element)=>{
      const selected=element.id===state.selectedElementId,active=transformTarget?.kind==="element"&&transformTarget.id===element.id;
      if(!selected&&!active)return;const item=elementGeometry(element);c.save();
      if(!active){c.strokeStyle="#ffe600";c.lineWidth=3;c.setLineDash([12,7]);withItemTransform(c,item,()=>{shapePath(c,item);c.stroke();});}else drawTransformHandles(c,item);c.restore();
    });
    fragments.forEach((fragment)=>{
      const selected=fragment.text.id===state.selectedTextId,active=transformTarget?.kind==="text"&&transformTarget.id===fragment.text.id;
      if(!selected&&!active)return;c.save();
      if(active)drawTextTransformHandles(c,fragment);
      else{c.strokeStyle="#67e8a5";c.fillStyle="rgba(103,232,165,.07)";c.lineWidth=3;c.setLineDash([8,6]);c.fillRect(fragment.x,fragment.y,fragment.w,fragment.h);c.strokeRect(fragment.x,fragment.y,fragment.w,fragment.h);}
      c.restore();
    });
    c.restore();
  }

  function drawTextTransformHandles(c,fragment){
    const item={x:fragment.x,y:fragment.y,w:fragment.w,h:fragment.h,rotation:0};
    const handles=itemHandlePoints(item);c.save();c.strokeStyle="#67e8a5";c.fillStyle="#67e8a5";c.lineWidth=4;c.setLineDash([]);c.strokeRect(item.x,item.y,item.w,item.h);
    for(const key of ["nw","ne","se","sw"]){const p=handles[key];c.fillRect(p.x-12,p.y-12,24,24);c.strokeStyle="#071014";c.lineWidth=2;c.strokeRect(p.x-12,p.y-12,24,24);c.strokeStyle="#67e8a5";c.lineWidth=4;}
    c.restore();
  }

  function textSettingsSection(title,description=""){
    const alwaysOpen=title==="배치 · 글꼴";
    const section=document.createElement(alwaysOpen?"section":"details");
    section.className=`text-settings-section${alwaysOpen?"":" collapsible-settings"}`;
    const head=document.createElement(alwaysOpen?"div":"summary");head.className="text-settings-section-head";
    const strong=document.createElement("strong");strong.textContent=title;head.append(strong);
    if(description){const small=document.createElement("small");small.textContent=description;head.append(small);}
    section.append(head);return section;
  }

  function makeEffectToggleGroup(text,onChange){
    const root=document.createElement("div");root.className="multi-toggle text-effect-stack";root.setAttribute("role","group");
    [["shadow","그림자"],["hollow","빈 그림자"],["extrude","입체"],["outline","외곽선"]].forEach(([effect,label])=>{
      const button=document.createElement("button");button.type="button";button.dataset.effect=effect;button.textContent=label;button.classList.toggle("active",hasEffect(text,effect));
      button.addEventListener("click",()=>{toggleEffect(text,effect);button.classList.toggle("active",hasEffect(text,effect));onChange();});root.append(button);
    });
    return root;
  }

  const pendingAutoTypographyRegions=new Set();
  let pendingAutoTypographyFrame=0;

  function scheduleAutoTypography(regionId){
    if(regionId)pendingAutoTypographyRegions.add(regionId);
    if(pendingAutoTypographyFrame)return;
    pendingAutoTypographyFrame=requestAnimationFrame(()=>{
      pendingAutoTypographyFrame=0;
      const regionIds=[...pendingAutoTypographyRegions];
      pendingAutoTypographyRegions.clear();
      if(regionIds.length)autoStyleAssignedTexts({force:false,skipAdapt:true,regionIds});
      queueRender();
    });
  }

  let activeDeleteConfirm=null;
  function closeDeleteConfirm(){
    activeDeleteConfirm?.remove();
    activeDeleteConfirm=null;
  }
  function openDeleteConfirm(anchor,onConfirm){
    closeDeleteConfirm();
    const pop=document.createElement("div");pop.className="delete-confirm-popover";pop.setAttribute("role","dialog");pop.setAttribute("aria-label","문장 삭제 확인");
    const message=document.createElement("strong");message.textContent="삭제하시겠습니까?";
    const actions=document.createElement("div");actions.className="delete-confirm-actions";
    const cancel=document.createElement("button");cancel.type="button";cancel.className="small-button";cancel.textContent="취소";
    const confirm=document.createElement("button");confirm.type="button";confirm.className="small-button button-danger";confirm.textContent="삭제";
    actions.append(cancel,confirm);pop.append(message,actions);document.body.append(pop);activeDeleteConfirm=pop;
    const rect=anchor.getBoundingClientRect(),popRect=pop.getBoundingClientRect();
    const left=clamp(rect.right-popRect.width,8,window.innerWidth-popRect.width-8);
    const below=rect.bottom+8;
    const top=below+popRect.height<=window.innerHeight-8?below:Math.max(8,rect.top-popRect.height-8);
    pop.style.left=`${left}px`;pop.style.top=`${top}px`;
    cancel.addEventListener("click",closeDeleteConfirm);
    confirm.addEventListener("click",()=>{closeDeleteConfirm();onConfirm();});
    setTimeout(()=>document.addEventListener("pointerdown",function outside(event){if(!activeDeleteConfirm){document.removeEventListener("pointerdown",outside,true);return;}if(activeDeleteConfirm.contains(event.target)||anchor.contains(event.target))return;closeDeleteConfirm();document.removeEventListener("pointerdown",outside,true);},true),0);
  }

  function renderTextList(options={}){
    const bringSelectedRegionIntoView=Boolean(options&&options.bringSelectedRegionIntoView);
    const bringSelectedTextIntoView=Boolean(options&&options.bringSelectedTextIntoView);
    ensureStateCompatibility();
    const list=$("textList");list.replaceChildren();
    const accepting=state.regions.filter((region)=>region.acceptText&&region.shape!=="line");
    const displayTexts=[...state.texts].sort((a,b)=>{
      const aSelectedText=state.selectedTextId===a.id?1:0;
      const bSelectedText=state.selectedTextId===b.id?1:0;
      if(aSelectedText!==bSelectedText)return bSelectedText-aSelectedText;
      const aSelectedRegion=state.selectedRegionId&&a.regionId===state.selectedRegionId?1:0;
      const bSelectedRegion=state.selectedRegionId&&b.regionId===state.selectedRegionId?1:0;
      if(aSelectedRegion!==bSelectedRegion)return bSelectedRegion-aSelectedRegion;
      return state.texts.indexOf(a)-state.texts.indexOf(b);
    });
    displayTexts.forEach((text,index)=>{
      normalizeEffects(text);
      const selected=state.selectedTextId===text.id;
      const card=document.createElement("article");
      const belongsToSelectedRegion=Boolean(state.selectedRegionId&&text.regionId===state.selectedRegionId);
      card.className=`text-card${selected?" active selected-text-priority":""}${belongsToSelectedRegion?" selected-region-priority":""}`;
      card.dataset.textId=text.id;card.dataset.regionId=text.regionId||"";card.dataset.auto=String(!isTextManualProtected(text));
      const head=document.createElement("div");head.className="text-card-head";
      const toolbar=document.createElement("div");toolbar.className="text-card-toolbar";
      const grip=document.createElement("div");grip.className="drag-grip";grip.innerHTML=`<b>${String(index+1).padStart(2,"0")}</b><small>${isTextManualProtected(text)?"LOCK":"AUTO"}</small>`;
      const textarea=document.createElement("textarea");textarea.className="text-input";textarea.value=text.text;textarea.rows=Math.max(1,Math.min(5,text.text.split("\n").length));
      let savedSelection={start:0,end:0};
      const rememberSelection=()=>{savedSelection={start:textarea.selectionStart??0,end:textarea.selectionEnd??0};activeTextarea=textarea;};
      const selectedRange=()=>{const current={start:textarea.selectionStart??0,end:textarea.selectionEnd??0};return current.start!==current.end?current:savedSelection;};
      const selectCard=()=>{
        const changed=state.selectedTextId!==text.id;
        state.selectedTextId=text.id;
        activeTextarea=textarea;
        list.querySelectorAll(".text-card").forEach((node)=>{
          const isSelected=node.dataset.textId===text.id;
          node.classList.toggle("active",isSelected);
          node.classList.toggle("selected-text-priority",isSelected);
        });
        if(changed&&list.firstElementChild!==card){
          list.prepend(card);
          Array.from(list.querySelectorAll(".text-card")).forEach((node,position)=>{
            const number=node.querySelector(".drag-grip b");
            if(number)number.textContent=String(position+1).padStart(2,"0");
          });
          list.scrollTop=0;
          card.classList.add("selected-text-arrived");
          window.setTimeout(()=>card.classList.remove("selected-text-arrived"),900);
        }
        queueRender();
      };
      textarea.addEventListener("focus",()=>{selectCard();rememberSelection();});textarea.addEventListener("click",()=>{selectCard();rememberSelection();});textarea.addEventListener("select",rememberSelection);textarea.addEventListener("keyup",rememberSelection);textarea.addEventListener("pointerup",rememberSelection);
      textarea.addEventListener("input",()=>{
        text.text=textarea.value;
        text.sample=false;
        textarea.rows=Math.max(1,Math.min(5,textarea.value.split("\n").length));
        if(!isTextManualProtected(text))scheduleAutoTypography(text.regionId);
        else queueRender();
      });
      textarea.addEventListener("blur",()=>{
        markHistoryDirty(true);
        queueRender();
      });
      const actions=document.createElement("div");actions.className="text-card-actions";
      const actionDefs=[["↑","위로",()=>moveTextInList(text.id,-1)],["↓","아래로",()=>moveTextInList(text.id,1)],["×","삭제",null]];
      actionDefs.forEach(([icon,title,handler])=>{
        const item=document.createElement("span");item.className="text-card-action";
        const name=document.createElement("span");name.className="text-card-action-label";name.textContent=title;
        const button=document.createElement("button");button.className="small-button";button.type="button";button.textContent=icon;button.title=title;button.setAttribute("aria-label",title);
        if(title==="삭제")button.addEventListener("click",()=>{
          if(state.texts.length===1)return toast("문장은 하나 이상 필요합니다.");
          openDeleteConfirm(button,()=>{state.texts=state.texts.filter((item)=>item.id!==text.id);state.selectedTextId=state.texts[Math.max(0,index-1)]?.id||null;normalizeTextOrders();renderTextList();queueRender();markHistoryDirty(true);});
        });else button.addEventListener("click",handler);
        item.append(name,button);actions.append(item);
      });
      toolbar.append(grip,actions);head.append(toolbar,textarea);head.addEventListener("pointerdown",(event)=>{if(event.target.closest("textarea,button,input,select"))return;selectCard();});card.append(head);

      const controls=document.createElement("div");controls.className="inline-text-controls";
      const top=document.createElement("div");top.className="text-style-heading";
      const title=document.createElement("div");title.innerHTML='<p class="control-title">선택 문장 꾸미기</p><small>자동 배치를 유지하거나, 이 문장만 직접 조절합니다.</small>';
      const mode=makeSegmentedControl([["auto","자동 글자 맞춤"],["manual","배치 고정"]],isTextManualProtected(text)?"manual":"auto",(value)=>{
        if(value==="auto"){
          resetTextManualAdjustments(text,{restyle:true});
          scheduleAutoTypography(text.regionId);
          toast("자동 글자 맞춤으로 전환했습니다.");
        }else markTextManual(text);
        renderTextList();queueRender();
      },"compact");
      const resetManual=document.createElement("button");
      resetManual.type="button";
      resetManual.className="button button-ghost text-manual-reset";
      resetManual.textContent="↺ 수동 조정 초기화";
      resetManual.disabled=!isTextManualProtected(text);
      resetManual.addEventListener("click",()=>{
        resetTextManualAdjustments(text,{restyle:true});
        renderTextList();queueRender();markHistoryDirty(true);
        toast("이 문장의 수동 위치·크기·꾸미기를 초기화했습니다.");
      });
      const modeTools=document.createElement("div");modeTools.className="text-mode-tools";modeTools.append(mode,resetManual);
      top.append(title,modeTools);controls.append(top);

      const manual=(action,{refresh=false}={})=>{
        if(text.styleMode!=="manual")captureTextNumericDefaults(text,true);
        markTextManual(text);action();normalizeEffects(text);card.dataset.auto="false";mode.querySelectorAll("button[data-value]").forEach((button)=>button.classList.toggle("active",button.dataset.value==="manual"));
        resetManual.disabled=false;
        if(refresh)renderTextList();queueRender();
      };

      const layoutSection=textSettingsSection("배치 · 글꼴","문장 영역과 글꼴 크기를 먼저 정합니다.");
      const layoutGrid=document.createElement("div");layoutGrid.className="field-grid three text-control-grid";
      const regionSelect=document.createElement("select");accepting.forEach((region)=>{const option=document.createElement("option");option.value=region.id;option.textContent=region.name;option.selected=text.regionId===region.id;regionSelect.append(option);});regionSelect.disabled=!accepting.length;
      regionSelect.addEventListener("change",()=>{
        markTextManual(text);
        text.regionId=regionSelect.value;
        text.regionLocked=true;
        text.manualX=null;
        text.manualY=null;
        normalizeTextOrders();
        renderTextList();
        queueRender();
      });
      const fontSelect=makeSelect(FONT_OPTIONS,text.fontFamily);
      fontSelect.addEventListener("change",()=>manual(()=>{text.fontFamily=fontSelect.value;if(text.fontFamily==="pretendard"&&!text.fontWeight)text.fontWeight=760;},{refresh:true}));
      const align=makeSelect([["left","왼쪽"],["center","가운데"],["right","오른쪽"]],text.align);align.addEventListener("change",()=>manual(()=>{text.align=align.value;}));
      layoutGrid.append(labeledControl("글자 영역",regionSelect),labeledControl("폰트",fontSelect),labeledControl("좌우 정렬",align));layoutSection.append(layoutGrid);
      const sizeGrid=document.createElement("div");sizeGrid.className=`field-grid ${text.fontFamily==="pretendard"?"two":"one"} text-control-grid`;
      sizeGrid.append(numericStepperControl("글자 크기",text.fontSize,12,320,1,(value)=>`${Math.round(value)}px`,(value)=>manual(()=>{text.fontSize=value;}),{defaultValue:()=>textNumericDefault(text,"fontSize",ROLE_STYLE_DEFAULTS[text.role]?.fontSize??54)}));
      if(text.fontFamily==="pretendard")sizeGrid.append(numericStepperControl("글자 두께",text.fontWeight,100,900,10,(value)=>String(Math.round(value)),(value)=>manual(()=>{text.fontWeight=value;}),{defaultValue:()=>ROLE_STYLE_DEFAULTS[text.role]?.fontWeight??760}));
      layoutSection.append(sizeGrid);controls.append(layoutSection);

      const tabShell=document.createElement("section");tabShell.className="text-settings-tabs";
      const tabNav=document.createElement("div");tabNav.className="text-settings-tablist";tabNav.setAttribute("role","tablist");
      const tabHelp=document.createElement("p");tabHelp.className="text-settings-tab-help";
      const tabPanels=document.createElement("div");tabPanels.className="text-settings-tab-panels";
      const tabDefs=[];
      const addTab=(key,label,description,panel)=>{panel.classList.add("text-settings-tab-panel");panel.dataset.tab=key;tabDefs.push({key,label,description,panel});tabPanels.append(panel);};

      const makeEditableRangeList=(ranges,{labelFor,deleteAt})=>{
        const list=document.createElement("div");list.className="editable-range-list";
        ranges.forEach((range,rangeIndex)=>{
          const row=document.createElement("div");row.className="editable-range-row";
          const selectButton=document.createElement("button");selectButton.type="button";selectButton.className="range-preview-button";
          const refreshLabel=()=>{const preview=text.text.slice(range.start,range.end).replace(/\n/g,"↵")||"선택 범위";selectButton.textContent=`${labelFor(range)} · ${preview}`;};
          refreshLabel();
          selectButton.addEventListener("click",()=>{textarea.focus();textarea.setSelectionRange(range.start,range.end);savedSelection={start:range.start,end:range.end};});
          const startInput=document.createElement("input");startInput.type="number";startInput.min="1";startInput.max=String(Math.max(1,text.text.length));startInput.value=String(range.start+1);startInput.setAttribute("aria-label","선택 시작 글자");
          const endInput=document.createElement("input");endInput.type="number";endInput.min="1";endInput.max=String(Math.max(1,text.text.length));endInput.value=String(range.end);endInput.setAttribute("aria-label","선택 끝 글자");
          const commitRange=()=>{const length=Math.max(1,text.text.length);const nextStart=clamp((Number(startInput.value)||1)-1,0,length-1);const nextEnd=clamp(Number(endInput.value)||nextStart+1,nextStart+1,length);markTextManual(text);range.start=nextStart;range.end=nextEnd;startInput.value=String(nextStart+1);endInput.value=String(nextEnd);refreshLabel();queueRender();markHistoryDirty(true);};
          startInput.addEventListener("change",commitRange);endInput.addEventListener("change",commitRange);
          const dash=document.createElement("span");dash.className="range-index-dash";dash.textContent="–";
          const remove=document.createElement("button");remove.type="button";remove.className="range-remove-button";remove.textContent="×";remove.title="효과 삭제";remove.addEventListener("click",()=>{markTextManual(text);deleteAt(rangeIndex);renderTextList();queueRender();});
          const indexBox=document.createElement("div");indexBox.className="range-index-editor";indexBox.append(startInput,dash,endInput,remove);
          row.append(selectButton,indexBox);list.append(row);
        });
        if(!ranges.length){const empty=document.createElement("p");empty.className="range-empty-note";empty.textContent="아직 적용된 선택 범위가 없습니다.";list.append(empty);}
        return list;
      };

      const spacingPanel=document.createElement("div");
      const spacingGrid=document.createElement("div");spacingGrid.className="field-grid two text-control-grid";
      spacingGrid.append(
        rangeControl("줄 간격",text.lineHeight,.72,1.8,.02,(value)=>`${value.toFixed(2)}배`,(value)=>manual(()=>{text.lineHeight=value;}),{defaultValue:()=>textNumericDefault(text,"lineHeight",ROLE_STYLE_DEFAULTS[text.role]?.lineHeight??1.08)}),
        rangeControl("글자 폭",text.scaleX*100,50,180,1,(value)=>`${Math.round(value)}%`,(value)=>manual(()=>{text.scaleX=value/100;}),{defaultValue:()=>textNumericDefault(text,"scaleX",ROLE_STYLE_DEFAULTS[text.role]?.scaleX??1)*100}),
        rangeControl("글자 높이",text.scaleY*100,55,145,1,(value)=>`${Math.round(value)}%`,(value)=>manual(()=>{text.scaleY=value/100;}),{defaultValue:()=>100}),
        rangeControl("자간",text.letterSpacing,-16,40,1,(value)=>String(Math.round(value)),(value)=>manual(()=>{text.letterSpacing=value;}),{defaultValue:()=>textNumericDefault(text,"letterSpacing",ROLE_STYLE_DEFAULTS[text.role]?.letterSpacing??0)}),
        rangeControl("문장 아래 여백",text.gap,0,100,1,(value)=>`${Math.round(value)}px`,(value)=>manual(()=>{text.gap=value;}),{defaultValue:()=>textNumericDefault(text,"gap",ROLE_STYLE_DEFAULTS[text.role]?.gap??4)})
      );spacingPanel.append(spacingGrid);addTab("spacing","간격","줄바꿈을 우선하고 폭·높이·자간을 세밀하게 조절합니다.",spacingPanel);

      const symbolPanel=document.createElement("div");
      const symbolGrid=document.createElement("div");symbolGrid.className="field-grid two text-control-grid";
      const unicode=makeSelect(UNICODE_PRESETS,text.unicodeStyle);unicode.addEventListener("change",()=>manual(()=>{text.unicodeStyle=unicode.value;},{refresh:true}));symbolGrid.append(labeledControl("문장 전체 유니코드",unicode));
      const toggles=document.createElement("div");toggles.className="toggle-row compact-toggle-row";
      [["bold","볼드"],["italic","이탤릭"],["underline","밑줄"],["strike","취소선"],["prefixEnabled","줄 앞 기호"]].forEach(([key,labelText])=>{const label=document.createElement("label");const input=document.createElement("input");input.type="checkbox";input.checked=Boolean(text[key]);input.addEventListener("change",()=>manual(()=>{text[key]=input.checked;},{refresh:key==="prefixEnabled"}));label.append(input,labelText);toggles.append(label);});symbolGrid.append(toggles);symbolPanel.append(symbolGrid);
      if(text.unicodeStyle==="custom"){
        const customBlock=document.createElement("div");customBlock.className="custom-unicode-block conditional-row";
        const placementWrap=document.createElement("div");placementWrap.className="segmented-field";placementWrap.innerHTML='<span class="field-label">기호 삽입 위치</span>';
        placementWrap.append(makeSegmentedControl([["word","단어 사이"],["char","글자 사이"]],text.unicodePlacement||"word",(value)=>manual(()=>{text.unicodePlacement=value;},{refresh:true})));
        const row=document.createElement("div");row.className="unicode-row";
        const input=document.createElement("input");input.value=text.customUnicode||"★";input.setAttribute("aria-label","직접 입력할 유니코드 기호");input.addEventListener("input",()=>manual(()=>{text.customUnicode=input.value;}));
        const browse=document.createElement("button");browse.type="button";browse.className="button";browse.textContent="유니코드 찾기";browse.addEventListener("click",()=>openUnicodeBrowser((char)=>{markTextManual(text);text.customUnicode=char;renderTextList();queueRender();},(text.unicodePlacement||"word")==="char"?"선택한 문장의 글자 사이에 넣습니다.":"선택한 문장의 단어 사이에 넣습니다."));
        row.append(input,browse);customBlock.append(placementWrap,row);symbolPanel.append(customBlock);
      }
      if(text.prefixEnabled){
        const row=document.createElement("div");row.className="field-grid two conditional-row";
        const symbolWrap=document.createElement("div");symbolWrap.innerHTML='<span class="field-label">줄 앞 기호</span>';const inner=document.createElement("div");inner.className="unicode-row";const input=document.createElement("input");input.value=text.prefixSymbol||"•";input.addEventListener("input",()=>manual(()=>{text.prefixSymbol=input.value;}));const browse=document.createElement("button");browse.type="button";browse.className="button";browse.textContent="찾기";browse.addEventListener("click",()=>openUnicodeBrowser((char)=>{markTextManual(text);text.prefixSymbol=char;renderTextList();queueRender();},"각 줄 앞에 넣을 기호입니다."));inner.append(input,browse);symbolWrap.append(inner);row.append(symbolWrap,rangeControl("기호 간격",text.prefixGap,0,60,1,(value)=>`${Math.round(value)}px`,(value)=>manual(()=>{text.prefixGap=value;}),{defaultValue:()=>textNumericDefault(text,"prefixGap",8)}));symbolPanel.append(row);
      }
      addTab("symbol","기호","문장 전체 유니코드, 줄 앞 기호와 기본 문자 장식을 설정합니다.",symbolPanel);

      const effectPanel=document.createElement("div");
      const effectStack=makeEffectToggleGroup(text,()=>manual(()=>{}, {refresh:true}));effectPanel.append(effectStack);
      if(activeEffects(text).length){
        const effectGrid=document.createElement("div");effectGrid.className="field-grid two conditional-row text-control-grid";
        effectGrid.append(numericFieldControl("효과 두께",text.outlineWidth,0,48,1,(value)=>`${Math.round(value)}px`,(value)=>manual(()=>{text.outlineWidth=value;}),{defaultValue:()=>textNumericDefault(text,"outlineWidth",ROLE_STYLE_DEFAULTS[text.role]?.outlineWidth??3)}));
        const effectColorHost=document.createElement("div");effectColorHost.innerHTML='<span class="field-label">효과 색</span>';makeInlineColorControl(effectColorHost,()=>text.effectColor,(value)=>manual(()=>{text.effectColor=value;}));effectGrid.append(effectColorHost);effectPanel.append(effectGrid);
        const rule=document.createElement("p");rule.className="effect-rule-note compact";rule.textContent="그림자는 번짐 없는 단색 복사, 입체는 그림자 없는 단색 옆면입니다.";effectPanel.append(rule);
      }
      addTab("effect","효과","그림자·빈 그림자·입체·외곽선을 중첩할 수 있습니다.",effectPanel);

      const colorPanel=document.createElement("div");
      const colorGrid=document.createElement("div");colorGrid.className="field-grid two text-control-grid";
      const colorModeWrap=document.createElement("div");colorModeWrap.className="segmented-field";colorModeWrap.innerHTML='<span class="field-label">본문 색</span>';
      colorModeWrap.append(makeSegmentedControl([["auto","배경 따라"],["custom","직접 선택"]],text.colorMode,(value)=>manual(()=>{text.colorMode=value;},{refresh:true})));
      colorGrid.append(colorModeWrap);
      if(text.colorMode==="custom"){const host=document.createElement("div");host.innerHTML='<span class="field-label">직접 글자색</span>';makeInlineColorControl(host,()=>text.color,(value)=>manual(()=>{text.color=value;text.colorMode="custom";}));colorGrid.append(host);}
      colorPanel.append(colorGrid);addTab("color","글자색","전체 문장의 색을 자동 대비 또는 직접 지정으로 설정합니다.",colorPanel);

      const rangeColorPanel=document.createElement("div");let selectedRangeColor="#f4e900";
      const rangeColorBox=document.createElement("div");rangeColorBox.className="range-apply-row";
      const rangeColorHost=document.createElement("div");rangeColorHost.innerHTML='<span class="field-label">선택 부분 색</span>';makeInlineColorControl(rangeColorHost,()=>selectedRangeColor,(value)=>{selectedRangeColor=value;});
      const applyColor=document.createElement("button");applyColor.type="button";applyColor.className="button button-accent range-apply-button";applyColor.textContent="선택 범위에 색 적용";applyColor.addEventListener("pointerdown",(event)=>event.preventDefault());applyColor.addEventListener("click",()=>{const {start,end}=selectedRange();if(start===end)return toast("먼저 문장 입력창에서 일부 글자를 선택하세요.");markTextManual(text);text.rangeColors.push({start,end,color:selectedRangeColor});renderTextList();queueRender();});rangeColorBox.append(rangeColorHost,applyColor);rangeColorPanel.append(rangeColorBox);
      rangeColorPanel.append(makeEditableRangeList(text.rangeColors||[],{labelFor:(range)=>`색 ${range.color}`,deleteAt:(index)=>text.rangeColors.splice(index,1)}));
      addTab("rangeColor","선택 색","입력창에서 선택한 글자 범위에만 색을 적용합니다. 적용 범위는 숫자로 다시 수정할 수 있습니다.",rangeColorPanel);

      const rangeUnicodePanel=document.createElement("div");
      const unicodeDraft={style:"slashChar",customUnicode:"/",placement:"char"};
      const rangeUnicodeGrid=document.createElement("div");rangeUnicodeGrid.className="field-grid two text-control-grid";
      const rangeUnicodePresets=[["slash","/ · 단어 사이"],["slashChar","/ · 글자 사이"],["dot","· · 단어 사이"],["dotChar","· · 글자 사이"],["star","★ · 단어 사이"],["starChar","★ · 글자 사이"],["heart","♥ · 단어 사이"],["heartChar","♥ · 글자 사이"],["block","■ · 단어 사이"],["blockChar","■ · 글자 사이"],["bullet","• · 단어 사이"],["bulletChar","• · 글자 사이"],["custom","직접 기호"]];
      const rangeUnicodeSelect=makeSelect(rangeUnicodePresets,unicodeDraft.style);rangeUnicodeGrid.append(labeledControl("적용할 유니코드",rangeUnicodeSelect));
      const rangePlacement=document.createElement("div");rangePlacement.className="segmented-field";rangePlacement.innerHTML='<span class="field-label">삽입 위치</span>';
      const placementControl=makeSegmentedControl([["word","단어 사이"],["char","글자 사이"]],unicodeDraft.placement,(value)=>{unicodeDraft.placement=value;});rangePlacement.append(placementControl);rangeUnicodeGrid.append(rangePlacement);rangeUnicodePanel.append(rangeUnicodeGrid);
      const rangeUnicodeCustom=document.createElement("div");rangeUnicodeCustom.className="unicode-row conditional-row is-hidden";
      const rangeUnicodeInput=document.createElement("input");rangeUnicodeInput.value=unicodeDraft.customUnicode;rangeUnicodeInput.setAttribute("aria-label","선택 범위에 넣을 직접 기호");rangeUnicodeInput.addEventListener("input",()=>{unicodeDraft.customUnicode=rangeUnicodeInput.value;});
      const rangeUnicodeBrowse=document.createElement("button");rangeUnicodeBrowse.type="button";rangeUnicodeBrowse.className="button";rangeUnicodeBrowse.textContent="유니코드 찾기";rangeUnicodeBrowse.addEventListener("click",()=>openUnicodeBrowser((char)=>{unicodeDraft.customUnicode=char;rangeUnicodeInput.value=char;},"선택 글자 범위에 넣을 기호입니다."));rangeUnicodeCustom.append(rangeUnicodeInput,rangeUnicodeBrowse);rangeUnicodePanel.append(rangeUnicodeCustom);
      const presetToDraft=()=>{const style=rangeUnicodeSelect.value;unicodeDraft.style=style;const wordMap={slash:"/",dot:"·",star:"★",heart:"♥",block:"■",bullet:"•"};const charMap={slashChar:"/",dotChar:"·",starChar:"★",heartChar:"♥",blockChar:"■",bulletChar:"•"};if(wordMap[style]){unicodeDraft.customUnicode=wordMap[style];unicodeDraft.placement="word";}else if(charMap[style]){unicodeDraft.customUnicode=charMap[style];unicodeDraft.placement="char";}rangeUnicodeCustom.classList.toggle("is-hidden",style!=="custom");placementControl.querySelectorAll("button[data-value]").forEach((button)=>button.classList.toggle("active",button.dataset.value===unicodeDraft.placement));};
      rangeUnicodeSelect.addEventListener("change",presetToDraft);presetToDraft();
      const unicodeApplyRow=document.createElement("div");unicodeApplyRow.className="range-dual-apply-row";
      const applyUnicodeAll=document.createElement("button");applyUnicodeAll.type="button";applyUnicodeAll.className="button range-apply-button";applyUnicodeAll.textContent="문장 전체에 적용";applyUnicodeAll.addEventListener("pointerdown",(event)=>event.preventDefault());applyUnicodeAll.addEventListener("click",()=>{const symbol=unicodeDraft.style==="custom"?(unicodeDraft.customUnicode||"★"):unicodeDraft.customUnicode;markTextManual(text);text.unicodeStyle=unicodeDraft.style;text.customUnicode=symbol;text.unicodePlacement=unicodeDraft.placement;renderTextList();queueRender();});
      const applyUnicode=document.createElement("button");applyUnicode.type="button";applyUnicode.className="button button-accent range-apply-button";applyUnicode.textContent="선택 범위에 적용";applyUnicode.addEventListener("pointerdown",(event)=>event.preventDefault());applyUnicode.addEventListener("click",()=>{const {start,end}=selectedRange();if(start===end)return toast("먼저 문장 입력창에서 일부 글자를 선택하세요.");const symbol=unicodeDraft.style==="custom"?(unicodeDraft.customUnicode||"★"):unicodeDraft.customUnicode;markTextManual(text);text.rangeUnicodes.push({start,end,style:unicodeDraft.style,customUnicode:symbol,placement:unicodeDraft.placement});renderTextList();queueRender();});const clearUnicode=document.createElement("button");clearUnicode.type="button";clearUnicode.className="button range-apply-button range-clear-button";clearUnicode.textContent="적용 해제";clearUnicode.addEventListener("pointerdown",(event)=>event.preventDefault());clearUnicode.addEventListener("click",()=>{const hasWhole=(text.unicodeStyle||"none")!=="none";const hasRanges=Array.isArray(text.rangeUnicodes)&&text.rangeUnicodes.length>0;if(!hasWhole&&!hasRanges)return toast("해제할 기호 효과가 없습니다.");markTextManual(text);text.unicodeStyle="none";text.customUnicode="";text.unicodePlacement="word";text.rangeUnicodes=[];renderTextList();queueRender();toast("문장의 기호 효과를 모두 해제했습니다.");});unicodeApplyRow.append(applyUnicodeAll,applyUnicode,clearUnicode);rangeUnicodePanel.append(unicodeApplyRow);
      rangeUnicodePanel.append(makeEditableRangeList(text.rangeUnicodes||[],{labelFor:(range)=>`기호 ${range.customUnicode||"★"} · ${(range.placement||"word")==="char"?"글자 사이":"단어 사이"}`,deleteAt:(index)=>text.rangeUnicodes.splice(index,1)}));
      addTab("rangeUnicode","선택 기호","기호와 삽입 위치를 고른 뒤 문장 전체 또는 선택한 글자 범위에 적용합니다.",rangeUnicodePanel);

      const bgPanel=document.createElement("div");
      const bgDraft={shape:"rect",fill:paletteColor("primary",state.palette),strokeEnabled:false,stroke:paletteColor("ink",state.palette),strokeWidth:3,paddingX:10,paddingY:5,radius:12,scaleX:1,scaleY:1,rotation:0};
      const bgTop=document.createElement("div");bgTop.className="field-grid three text-control-grid";
      const shape=makeSelect([["rect","사각형"],["circle","한 글자씩 원"],["ellipse","긴 타원"],["heart","하트"],["burst","뾰족 말풍선"]],bgDraft.shape);shape.addEventListener("change",()=>{bgDraft.shape=shape.value;bgDetails.classList.toggle("shape-circle",shape.value==="circle");});
      const fillHost=document.createElement("div");fillHost.innerHTML='<span class="field-label">채우기</span>';makeInlineColorControl(fillHost,()=>bgDraft.fill,(value)=>{bgDraft.fill=value;});
      const strokeToggle=makeSegmentedControl([["off","선 없음"],["on","선 사용"]],"off",(value)=>{bgDraft.strokeEnabled=value==="on";strokeOptions.classList.toggle("is-hidden",!bgDraft.strokeEnabled);});
      const strokeWrap=document.createElement("div");strokeWrap.className="segmented-field";strokeWrap.innerHTML='<span class="field-label">외곽선</span>';strokeWrap.append(strokeToggle);
      bgTop.append(labeledControl("모양",shape),fillHost,strokeWrap);bgPanel.append(bgTop);
      const bgDetails=document.createElement("div");bgDetails.className="field-grid two conditional-row text-control-grid";
      bgDetails.append(
        numericFieldControl("좌우 여백",bgDraft.paddingX,0,80,1,(value)=>`${Math.round(value)}px`,(value)=>{bgDraft.paddingX=value;}),
        numericFieldControl("상하 여백",bgDraft.paddingY,0,80,1,(value)=>`${Math.round(value)}px`,(value)=>{bgDraft.paddingY=value;}),
        numericFieldControl("모서리 둥글기",bgDraft.radius,0,100,1,(value)=>`${Math.round(value)}px`,(value)=>{bgDraft.radius=value;}),
        numericFieldControl("가로 크기",bgDraft.scaleX*100,40,240,1,(value)=>`${Math.round(value)}%`,(value)=>{bgDraft.scaleX=value/100;}),
        numericFieldControl("세로 크기",bgDraft.scaleY*100,40,240,1,(value)=>`${Math.round(value)}%`,(value)=>{bgDraft.scaleY=value/100;}),
        numericFieldControl("기울기",bgDraft.rotation,-45,45,1,(value)=>`${Math.round(value)}°`,(value)=>{bgDraft.rotation=value;})
      );bgPanel.append(bgDetails);
      const strokeOptions=document.createElement("div");strokeOptions.className="field-grid two conditional-row text-control-grid is-hidden";
      const strokeHost=document.createElement("div");strokeHost.innerHTML='<span class="field-label">선 색</span>';makeInlineColorControl(strokeHost,()=>bgDraft.stroke,(value)=>{bgDraft.stroke=value;});strokeOptions.append(strokeHost,numericFieldControl("선 두께",bgDraft.strokeWidth,1,24,1,(value)=>`${Math.round(value)}px`,(value)=>{bgDraft.strokeWidth=value;}));bgPanel.append(strokeOptions);
      const applyBg=document.createElement("button");applyBg.type="button";applyBg.className="button button-accent range-apply-button";applyBg.textContent="선택 범위에 배경 적용";applyBg.addEventListener("pointerdown",(event)=>event.preventDefault());applyBg.addEventListener("click",()=>{const {start,end}=selectedRange();if(start===end)return toast("먼저 문장 입력창에서 일부 글자를 선택하세요.");markTextManual(text);text.rangeBackgrounds.push({start,end,...deepClone(bgDraft)});renderTextList();queueRender();});bgPanel.append(applyBg);
      bgPanel.append(makeEditableRangeList(text.rangeBackgrounds||[],{labelFor:(range)=>`배경 ${range.shape}`,deleteAt:(index)=>text.rangeBackgrounds.splice(index,1)}));
      addTab("rangeBackground","선택 배경","선택한 글자 아래에 사각형·원·타원·하트·말풍선 배경을 넣습니다.",bgPanel);

      let activeTab=textEditorTabs.get(text.id)||"spacing";
      if(!tabDefs.some((item)=>item.key===activeTab))activeTab="spacing";
      const activateTab=(key)=>{activeTab=key;textEditorTabs.set(text.id,key);tabNav.querySelectorAll("button").forEach((button)=>button.classList.toggle("active",button.dataset.tab===key));tabPanels.querySelectorAll(".text-settings-tab-panel").forEach((panel)=>panel.hidden=panel.dataset.tab!==key);tabHelp.textContent=tabDefs.find((item)=>item.key===key)?.description||"";};
      tabDefs.forEach(({key,label})=>{const button=document.createElement("button");button.type="button";button.className="text-settings-tab";button.dataset.tab=key;button.textContent=label;button.addEventListener("click",()=>activateTab(key));tabNav.append(button);});
      tabShell.append(tabNav,tabHelp,tabPanels);controls.append(tabShell);activateTab(activeTab);

      card.append(controls);list.append(card);
    });
    if(bringSelectedTextIntoView&&state.selectedTextId){
      const selectedCard=list.querySelector(`.text-card[data-text-id="${state.selectedTextId}"]`);
      if(selectedCard){
        list.scrollTop=0;
        requestAnimationFrame(()=>{
          selectedCard.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
          selectedCard.classList.add("selected-text-arrived");
          window.setTimeout(()=>selectedCard.classList.remove("selected-text-arrived"),900);
        });
      }
    }else if(bringSelectedRegionIntoView&&state.selectedRegionId){
      const firstMatchingCard=Array.from(list.querySelectorAll(".text-card")).find((card)=>card.dataset.regionId===state.selectedRegionId);
      if(firstMatchingCard){
        list.scrollTop=0;
        requestAnimationFrame(()=>{
          firstMatchingCard.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
          firstMatchingCard.classList.add("selected-region-arrived");
          window.setTimeout(()=>firstMatchingCard.classList.remove("selected-region-arrived"),900);
        });
      }
    }
  }

  function syncEffectToggle(id,item){
    const root=$(id);if(!root)return;
    const effects=activeEffects(item);
    root.querySelectorAll("button[data-effect]").forEach((button)=>button.classList.toggle("active",effects.includes(button.dataset.effect)));
  }

  function setConditionalVisible(id,visible){
    const element=$(id);if(element)element.classList.toggle("is-hidden",!visible);
  }

  function updateRegionControls(){
    const region=selectedRegion();
    const controls=$("regionControls");
    if(!controls)return;
    controls.classList.toggle("is-disabled",!region);
    controls.classList.toggle("transform-active",Boolean(region&&transformTarget?.kind==="region"&&transformTarget.id===region.id));
    if(!region){
      if($("selectedRegionName"))$("selectedRegionName").textContent="선택된 영역 없음";
      if($("selectedRegionBadge"))$("selectedRegionBadge").textContent="미리보기에서 선택";
      if($("toggleRegionTransformBtn"))$("toggleRegionTransformBtn").textContent="위치 편집";
      if($("restoreRegionLayoutBtn"))$("restoreRegionLayoutBtn").disabled=true;
      syncEffectToggle("regionEffectStack",null);
      setConditionalVisible("regionEffectOptions",false);
      syncStaticNumericFields(["regionX","regionY","regionW","regionH","regionScale","regionRadius","regionPadding","regionStrokeWidth","regionRotation","regionEffectSize"]);
      colorFields.forEach((field)=>field.update());
      return;
    }
    ensureItemNumericDefaults("region",region);
    normalizeEffects(region);
    const active=transformTarget?.kind==="region"&&transformTarget.id===region.id;
    $("selectedRegionName").textContent=region.name;
    $("selectedRegionBadge").textContent=active?"캔버스 조작 중":(region.layoutDetached?"수동 위치":(region.acceptText?"문장 영역":"장식 영역"));
    $("toggleRegionTransformBtn").textContent=active?"편집 닫기":"위치 편집";
    if($("restoreRegionLayoutBtn"))$("restoreRegionLayoutBtn").disabled=!region.layoutBase;
    const defaults=ensureItemNumericDefaults("region",region)||{w:region.w,h:region.h};
    const regionScaleValue=Math.round(((region.w/Math.max(1,defaults.w)+region.h/Math.max(1,defaults.h))/2)*100);
    const values={regionX:region.x,regionY:region.y,regionW:region.w,regionH:region.h,regionScale:regionScaleValue,regionRadius:region.radius,regionPadding:region.padding,regionStrokeWidth:region.strokeWidth,regionRotation:region.rotation,regionEffectSize:region.effectSize};
    Object.entries(values).forEach(([id,value])=>{const field=$(id);if(field)field.value=String(round(value));});
    if($("regionShape"))$("regionShape").value=region.shape;
    if($("regionRadiusValue"))$("regionRadiusValue").textContent=round(region.radius);
    if($("regionPaddingValue"))$("regionPaddingValue").textContent=round(region.padding);
    if($("regionRotationValue"))$("regionRotationValue").textContent=`${round(region.rotation)}°`;
    syncSegmented("regionAcceptText",region.acceptText?"yes":"no");
    syncSegmented("regionTextClip",region.clipText?"on":"off");
    syncEffectToggle("regionEffectStack",region);
    setConditionalVisible("regionEffectOptions",activeEffects(region).length>0);
    syncStaticNumericFields(Object.keys(values));
    colorFields.forEach((field)=>field.update());
  }

  function updateElementControls(){
    const element=selectedElement();
    const controls=$("elementControls");
    if(!controls)return;
    controls.classList.toggle("is-disabled",!element);
    controls.classList.toggle("transform-active",Boolean(element&&transformTarget?.kind==="element"&&transformTarget.id===element.id));
    if(!element){
      $("selectedElementName").textContent="선택된 요소 없음";
      $("selectedElementBadge").textContent="미리보기에서 선택";
      $("toggleElementTransformBtn").textContent="위치 편집";
      $("bandControls")?.classList.add("hidden");
      syncEffectToggle("elementEffectStack",null);
      setConditionalVisible("elementEffectOptions",false);
      setConditionalVisible("elementClipRegionWrap",false);
      syncStaticNumericFields(["elementX","elementY","elementW","elementH","elementScale","bandPosition","elementStrokeWidth","elementRadius","elementRotation","flowMargin","elementEffectSize","elementLabelSize"]);
      colorFields.forEach((field)=>field.update());
      return;
    }
    normalizeEffects(element);
    ensureItemNumericDefaults("element",element);
    const labels={rect:"사각형",band:"띠",circle:"원형",heart:"하트",burst:"뾰족 말풍선",triangle:"삼각형",cloud:"구름",image:"사진"};
    const active=transformTarget?.kind==="element"&&transformTarget.id===element.id;
    const geometry=elementGeometry(element);
    $("selectedElementName").textContent=labels[element.type]||"요소";
    $("selectedElementBadge").textContent=active?"캔버스 조작 중":(element.type==="image"?"투명 여백 제거 사진":"도형");
    $("toggleElementTransformBtn").textContent=active?"편집 닫기":"위치 편집";
    const defaults=ensureItemNumericDefaults("element",element)||{w:geometry.w,h:geometry.h};
    const elementScaleValue=Math.round(((geometry.w/Math.max(1,defaults.w)+geometry.h/Math.max(1,defaults.h))/2)*100);
    const values={elementX:geometry.x,elementY:geometry.y,elementW:geometry.w,elementH:geometry.h,elementScale:elementScaleValue,elementStrokeWidth:element.strokeWidth,elementRadius:element.radius,elementRotation:element.rotation,flowMargin:element.flowMargin,elementEffectSize:element.effectSize,elementLabelSize:element.labelSize};
    Object.entries(values).forEach(([id,value])=>{const field=$(id);if(field)field.value=String(round(value));});
    const isBand=element.type==="band";
    if($("elementX"))$("elementX").disabled=isBand;
    if($("elementW"))$("elementW").disabled=isBand;
    if($("elementScale"))$("elementScale").disabled=isBand;
    if($("elementY"))$("elementY").disabled=isBand&&element.bandScope==="region";
    if($("elementRadiusValue"))$("elementRadiusValue").textContent=round(element.radius);
    if($("rotationValue"))$("rotationValue").textContent=`${round(element.rotation)}°`;
    if($("flowMarginValue"))$("flowMarginValue").textContent=round(element.flowMargin);
    syncSegmented("affectFlow",element.affectFlow?"avoid":"overlap");
    syncSegmented("imageFit",element.imageFit||"contain");
    syncEffectToggle("elementEffectStack",element);
    setConditionalVisible("elementEffectOptions",activeEffects(element).length>0);
    if($("elementLabel"))$("elementLabel").value=element.label||"";
    $("bandControls")?.classList.toggle("hidden",!isBand);
    if(isBand){
      syncSegmented("bandScope",element.bandScope||"canvas");
      const select=$("bandRegion");
      if(select){
        const current=element.bandRegionId;
        select.replaceChildren();
        state.regions.filter((region)=>region.acceptText&&region.shape!=="line").forEach((region)=>{const option=document.createElement("option");option.value=region.id;option.textContent=region.name;option.selected=current===region.id;select.append(option);});
        if(!element.bandRegionId||!state.regions.some((region)=>region.id===element.bandRegionId&&region.acceptText))element.bandRegionId=select.value||null;
        select.value=element.bandRegionId||"";select.disabled=element.bandScope!=="region";
      }
      if($("bandPosition"))$("bandPosition").value=String(Math.round(clamp(Number(element.bandPosition)||.5,0,1)*100));
      if($("bandPositionValue"))$("bandPositionValue").textContent=`${$("bandPosition")?.value||50}%`;
    }
    syncSegmented("elementClipEnabled",element.clipRegionId?"on":"off");
    const clipSelect=$("elementClipRegion");
    if(clipSelect){
      clipSelect.replaceChildren();
      state.regions.filter((region)=>region.shape!=="line").forEach((region)=>{const option=document.createElement("option");option.value=region.id;option.textContent=region.name;option.selected=region.id===element.clipRegionId;clipSelect.append(option);});
      if(element.clipRegionId&&!state.regions.some((region)=>region.id===element.clipRegionId))element.clipRegionId=null;
      if(element.clipRegionId)clipSelect.value=element.clipRegionId;
    }
    setConditionalVisible("elementClipRegionWrap",Boolean(element.clipRegionId));
    syncStaticNumericFields(Object.keys(values).concat("bandPosition"));
    colorFields.forEach((field)=>field.update());
  }

  function syncPaletteControls(){
    syncSegmented("paletteSecondaryEnabled",state.palette.secondaryEnabled?"on":"off");
    syncSegmented("paletteTertiaryEnabled",state.palette.tertiaryEnabled?"on":"off");
    $("secondaryPaletteCard")?.classList.toggle("is-disabled",!state.palette.secondaryEnabled);
    $("tertiaryPaletteCard")?.classList.toggle("is-disabled",!state.palette.tertiaryEnabled);
    if($("paletteUseBackground"))$("paletteUseBackground").checked=state.palette.useBackground!==false;
    if($("paletteUseWhite"))$("paletteUseWhite").checked=state.palette.useWhite!==false;
    if($("paletteUseBlack"))$("paletteUseBlack").checked=state.palette.useBlack!==false;
    if($("palettePaperMix")){$("palettePaperMix").value=String(state.palette.paperMix);$("palettePaperMix").disabled=state.palette.useBackground===false;$("palettePaperMix").closest(".palette-paper-inline")?.classList.toggle("is-disabled",state.palette.useBackground===false);}
    if($("palettePaperMixValue"))$("palettePaperMixValue").textContent=`${round(state.palette.paperMix)}%`;
    syncStaticNumericFields(["palettePaperMix"]);
  }

  function syncBackgroundControls(){
    ensureStateCompatibility();
    syncSegmented("orientation",state.orientation);
    if($("artboardPreset"))$("artboardPreset").value=state.artboard.preset||"custom";
    if($("artboardWidthMm"))$("artboardWidthMm").value=String(state.artboard.widthMm);
    if($("artboardHeightMm"))$("artboardHeightMm").value=String(state.artboard.heightMm);
    if($("bleedMm"))$("bleedMm").value=String(state.bleedMm);
    if($("backgroundMode"))$("backgroundMode").value=state.background.mode;
    if($("gradientAngle"))$("gradientAngle").value=String(state.background.angle);
    if($("gradientAngleValue"))$("gradientAngleValue").textContent=`${round(state.background.angle)}°`;
    if($("patternType"))$("patternType").value=state.background.pattern;
    if($("patternScale"))$("patternScale").value=String(state.background.scale);
    if($("patternScaleValue"))$("patternScaleValue").textContent=round(state.background.scale);
    syncSegmented("posterBorderEnabled",state.posterBorder.enabled?"on":"off");
    if($("posterBorderWidth"))$("posterBorderWidth").value=String(state.posterBorder.width);
    if($("posterBorderWidthValue"))$("posterBorderWidthValue").textContent=round(state.posterBorder.width);
    if($("posterBorderRadius"))$("posterBorderRadius").value=String(state.posterBorder.radius);
    if($("posterBorderRadiusValue"))$("posterBorderRadiusValue").textContent=round(state.posterBorder.radius);
    if($("jpgQuality"))$("jpgQuality").value=String(Math.round(state.jpgQuality*100));
    if($("jpgQualityValue"))$("jpgQualityValue").textContent=`${Math.round(state.jpgQuality*100)}%`;
    const gradient=state.background.mode==="gradient"||state.background.mode==="gradientPattern";
    const pattern=state.background.mode==="pattern"||state.background.mode==="gradientPattern";
    setConditionalVisible("gradientOptions",gradient);
    setConditionalVisible("patternOptions",pattern);
    syncStaticNumericFields(["artboardWidthMm","artboardHeightMm","bleedMm","gradientAngle","patternScale","posterBorderWidth","posterBorderRadius","jpgQuality"]);
  }

  function updatePreviewZoom(){
    const stage=$("canvasStage");if(!stage||!canvas)return;
    const padding=20;
    let scale=clamp(Number(state.previewZoom)||1,.2,3);
    if(state.previewFit){
      const availableW=Math.max(120,stage.clientWidth-padding);
      const maxH=Math.max(200,Math.min(window.innerHeight*.68,stage.clientHeight||window.innerHeight*.62)-padding);
      scale=Math.min(1,availableW/canvas.width,maxH/canvas.height);
      if(!Number.isFinite(scale)||scale<=0)scale=.5;
      state.previewZoom=scale;
    }
    canvas.style.width=`${canvas.width*scale}px`;
    canvas.style.height=`${canvas.height*scale}px`;
    canvas.style.transform="none";
    if($("zoomValue"))$("zoomValue").textContent=state.previewFit?"맞춤":`${Math.round(scale*100)}%`;
    stage.classList.toggle("is-fit",state.previewFit);
  }

  function updateCanvasMeta(){
    const {trimW,trimH,bleed,fullW,fullH,widthMm,heightMm}=dimensions();
    if(canvas.width!==fullW)canvas.width=fullW;
    if(canvas.height!==fullH)canvas.height=fullH;
    if(sceneCanvas.width!==fullW)sceneCanvas.width=fullW;
    if(sceneCanvas.height!==fullH)sceneCanvas.height=fullH;
    if($("canvasSizeLabel"))$("canvasSizeLabel").textContent=`${widthMm} × ${heightMm}mm · ${trimW} × ${trimH}px${bleed?` · 재단 ${state.bleedMm}mm`:""}`;
    if($("currentTemplateName"))$("currentTemplateName").textContent=state.templateId===CUSTOM_TEMPLATE_ID?"직접 만들기":(templateSpecs.find((template)=>template.id===state.templateId)?.name||"사용자 템플릿");
    applyPreviewBackgroundMode();
    requestAnimationFrame(updatePreviewZoom);
  }

  function drawTemplateThumbnail(target,spec){
    const c=target.getContext("2d");
    const portrait=state.orientation==="portrait";
    const W=target.width=portrait?200:320;
    const H=target.height=portrait?300:180;
    c.clearRect(0,0,W,H);
    const bgColor=paletteColor(spec.bg?.role||"primary",state.palette);
    c.fillStyle=bgColor;c.fillRect(0,0,W,H);
    const regions=getTemplateRegionSpecs(spec);
    regions.forEach((region)=>{
      const x=region.x*W,y=region.y*H,w=region.w*W,h=region.h*H;
      c.beginPath();
      if(region.shape==="ellipse")c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
      else if(region.shape==="burst")burstPath(c,x,y,w,h,18);
      else roundedRectPath(c,x,y,w,h,(region.radius||0)*Math.min(W/1440,H/800));
      const fill=region.fillNone?bgColor:(region.fillRole?paletteColor(region.fillRole,state.palette):region.fill);
      if(!region.fillNone){c.fillStyle=fill;c.fill();}
      if(!region.strokeNone&&region.strokeWidth>0){c.strokeStyle=region.strokeRole?paletteColor(region.strokeRole,state.palette):region.stroke;c.lineWidth=Math.max(1,region.strokeWidth*.25);c.stroke();}
      if(region.acceptText&&region.shape!=="line"){
        c.save();c.beginPath();roundedRectPath(c,x,y,w,h,Math.min(5,h*.1));c.clip();
        c.globalAlpha=.72;c.fillStyle=bestTextColorForEffects(fill,{effectColor:paletteColor("tertiary",state.palette),effects:[]});
        const p=Math.max(3,Math.min(w,h)*.10),lineH=Math.max(2,Math.min(5,h*.055));
        c.fillRect(x+p,y+h*.46,w*.68,lineH);
        if(h>32)c.fillRect(x+p,y+h*.46+lineH*2,w*.45,lineH);
        c.restore();
      }
    });
  }

  function drawCustomTemplateThumbnail(target){
    const context=target.getContext("2d");
    const portrait=state.orientation==="portrait";
    const W=target.width=portrait?180:300,H=target.height=portrait?300:180;
    const fill=paletteColor("primary",state.palette);
    context.clearRect(0,0,W,H);
    context.fillStyle=fill;
    context.fillRect(0,0,W,H);
    context.save();
    context.strokeStyle=bestTextColorForEffects(fill,{effects:[]})==="#FFFFFF"?"rgba(255,255,255,.76)":"rgba(0,0,0,.58)";
    context.lineWidth=Math.max(2,Math.min(W,H)*.018);
    context.setLineDash([Math.max(7,W*.035),Math.max(5,W*.022)]);
    context.strokeRect(W*.12,H*.15,W*.76,H*.70);
    context.setLineDash([]);
    context.fillStyle=bestTextColorForEffects(fill,{effects:[]});
    context.font=`900 ${Math.round(Math.min(W,H)*.24)}px sans-serif`;
    context.textAlign="center";
    context.textBaseline="middle";
    context.fillText("+",W/2,H/2);
    context.restore();
  }

  function renderTemplateGrid(){
    const grid=$("templateGrid");if(!grid)return;
    grid.replaceChildren();

    const customButton=document.createElement("button");
    customButton.type="button";
    customButton.className=`template-card template-card-custom${state.templateId===CUSTOM_TEMPLATE_ID?" active":""}`;
    const customThumb=document.createElement("canvas");customThumb.className="template-thumb";
    const customMeta=document.createElement("span");customMeta.className="template-meta";
    const customName=document.createElement("strong");customName.textContent="직접 만들기";
    const customCaption=document.createElement("small");customCaption.textContent="배경색만 남긴 빈 대지에서 영역·문장·요소를 직접 추가";
    customMeta.append(customName,customCaption);customButton.append(customThumb,customMeta);drawCustomTemplateThumbnail(customThumb);
    customButton.addEventListener("click",()=>applyCustomBlank({clearContent:true}));
    grid.append(customButton);

    templateSpecs.forEach((template)=>{
      const button=document.createElement("button");button.type="button";button.className=`template-card${state.templateId===template.id?" active":""}`;
      const thumb=document.createElement("canvas");thumb.className="template-thumb";
      const meta=document.createElement("span");meta.className="template-meta";
      const name=document.createElement("strong");name.textContent=template.name;
      const {widthMm,heightMm}=dimensions();
      const caption=document.createElement("small");caption.textContent=`${template.caption||"레이아웃"} · ${state.orientation==="portrait"?"세로":"가로"} ${widthMm}×${heightMm}mm`;
      meta.append(name,caption);button.append(thumb,meta);drawTemplateThumbnail(thumb,template);
      button.addEventListener("click",()=>applyTemplate(template.id,{preserveTexts:true}));grid.append(button);
    });
  }

  function refreshAllUI(){
    ensureStateCompatibility();
    updateCanvasMeta();
    if($("pageMargin"))$("pageMargin").value=String(state.pageMargin);
    if($("pageMarginValue"))$("pageMarginValue").textContent=`${round(state.pageMargin)}px`;
    if($("regionGapX"))$("regionGapX").value=String(state.regionGapX);
    if($("regionGapXValue"))$("regionGapXValue").textContent=`${round(state.regionGapX)}px`;
    if($("regionGapY"))$("regionGapY").value=String(state.regionGapY);
    if($("regionGapYValue"))$("regionGapYValue").textContent=`${round(state.regionGapY)}px`;
    renderTemplateGrid();renderTextList();renderRegionList();updateRegionControls();updateElementControls();syncPaletteControls();syncBackgroundControls();
    colorFields.forEach((field)=>field.update());
    document.documentElement.dataset.theme=state.theme;
    document.body.dataset.theme=state.theme;
    const themeMeta=document.querySelector('meta[name="theme-color"]');
    if(themeMeta)themeMeta.setAttribute("content",state.theme==="light"?"#ffffff":"#0b0c10");
    const themeButton=$("themeToggleBtn");
    if(themeButton){
      const icon=themeButton.querySelector(".theme-icon");
      const nextLabel=state.theme==="light"?"다크 모드로 전환":"화이트 모드로 전환";
      if(icon)icon.textContent=state.theme==="light"?"☾":"☀";
      themeButton.title=nextLabel;
      themeButton.setAttribute("aria-label",nextLabel);
    }
    if($("showRegions"))$("showRegions").checked=Boolean(state.showRegions);
    applyPreviewBackgroundMode();
    syncStaticNumericFields(["pageMargin","regionGapX","regionGapY","palettePaperMix"]);
  }

  function bindValue(id,getter,setter,event="input",after=null){
    const element=$(id);if(!element)return;
    element.addEventListener(event,()=>{
      const raw=element.type==="number"||element.type==="range"?Number(element.value):element.value;
      setter(raw);if(after)after();queueRender();
    });
  }

  function setTheme(next){
    state.theme=next==="light"?"light":"dark";
    document.documentElement.dataset.theme=state.theme;
    document.body.dataset.theme=state.theme;
    refreshAllUI();
    markHistoryDirty(true);
  }

  function setArtboardSize(widthMm,heightMm,{reapplyTemplate=true,preset="custom"}={}){
    state.artboard.widthMm=clamp(Number(widthMm)||180,50,420);
    state.artboard.heightMm=clamp(Number(heightMm)||100,50,420);
    state.artboard.preset=preset;
    state.orientation=state.artboard.heightMm>state.artboard.widthMm?"portrait":"landscape";
    if(reapplyTemplate)applyTemplate(state.templateId,{preserveTexts:true});
    else {reflowRegions({preserveManual:true});refreshAllUI();queueRender();}
  }

  function changeOrientation(next){
    if(next!=="portrait"&&next!=="landscape")return;
    const width=state.artboard.widthMm,height=state.artboard.heightMm;
    if((next==="portrait"&&height<width)||(next==="landscape"&&height>width)){
      state.artboard.widthMm=height;state.artboard.heightMm=width;
    }
    state.orientation=next;state.artboard.preset="custom";
    applyTemplate(state.templateId,{preserveTexts:true});
  }

  function bindMultiEffect(rootId,getItem,after){
    const root=$(rootId);if(!root)return;
    root.addEventListener("click",(event)=>{
      const button=event.target.closest("button[data-effect]");if(!button||!root.contains(button))return;
      const item=getItem();if(!item)return;
      toggleEffect(item,button.dataset.effect);button.classList.toggle("active",hasEffect(item,button.dataset.effect));
      if(after)after(item);queueRender();markHistoryDirty(true);
    });
  }

  function applyPaletteRefresh(){
    if(state.background.mode==="solid"){
      const role=state.background.paletteRole || "primary";
      state.background.c1=paletteColor(role,state.palette);
      state.background.c2=state.background.c1;
    }
    autoStyleAssignedTexts({force:false});
    renderTemplateGrid();renderRegionList();renderTextList();colorFields.forEach((field)=>field.update());queueRender();
  }

  function applyUniformItemScale(kind,percent){
    const item=kind==="region"?selectedRegion():selectedElement();
    if(!item)return;
    const base=ensureItemNumericDefaults(kind,item);if(!base)return;
    const scale=clamp(Number(percent)||100,20,300)/100;
    const geometry=kind==="element"?elementGeometry(item):item;
    const centerX=geometry.x+geometry.w/2,centerY=geometry.y+geometry.h/2;
    const nextW=Math.max(20,base.w*scale),nextH=Math.max(kind==="element"&&item.shape==="line"?2:20,base.h*scale);
    if(kind==="element"&&item.type==="band")return;
    item.w=nextW;item.h=nextH;
    item.x=centerX-nextW/2;item.y=centerY-nextH/2;
    if(kind==="element"){
      const {trimW,trimH}=dimensions();
      const constrained=constrainRectToArtboard(item.x,item.y,item.w,item.h,trimW,trimH,.05);
      item.x=constrained.x;item.y=constrained.y;
      if(item.type==="image")item.imageFit="contain";
    }
    if(kind==="region"){captureRegionManualDelta(item);renderRegionList();}
    updateRegionControls();updateElementControls();
  }

  function bindV16Controls(){
    $("themeToggleBtn")?.addEventListener("click",()=>setTheme(state.theme==="dark"?"light":"dark"));
    $("previewBackgroundButton")?.addEventListener("click",(event)=>{
      event.stopPropagation();
      setPreviewBackgroundMenuOpen(!$("previewBackgroundMenu")?.classList.contains("open"));
    });
    $("previewBackgroundOptions")?.addEventListener("click",(event)=>{
      const option=event.target.closest("[data-preview-background-mode]");
      if(!option)return;
      state.previewBackgroundMode=normalizedPreviewBackgroundMode(option.dataset.previewBackgroundMode);
      applyPreviewBackgroundMode();
      setPreviewBackgroundMenuOpen(false);
      schedulePersistState();
      markHistoryDirty(true);
    });
    document.addEventListener("click",(event)=>{
      const menu=$("previewBackgroundMenu");
      if(menu&&!menu.contains(event.target))setPreviewBackgroundMenuOpen(false);
    });
    document.addEventListener("keydown",(event)=>{if(event.key==="Escape")setPreviewBackgroundMenuOpen(false);});
    $("paletteShuffleBtn")?.addEventListener("click",shufflePaletteRoles);
    $("zoomOutBtn")?.addEventListener("click",()=>{state.previewFit=false;state.previewZoom=clamp((Number(state.previewZoom)||1)-.1,.2,3);updatePreviewZoom();});
    $("zoomInBtn")?.addEventListener("click",()=>{state.previewFit=false;state.previewZoom=clamp((Number(state.previewZoom)||1)+.1,.2,3);updatePreviewZoom();});
    $("zoomFitBtn")?.addEventListener("click",()=>{state.previewFit=true;updatePreviewZoom();});
    window.addEventListener("resize",()=>{if(state.previewFit)updatePreviewZoom();});

    bindSegmented("paletteSecondaryEnabled",(value)=>{state.palette.secondaryEnabled=value==="on";syncPaletteControls();applyPaletteRefresh();});
    $("paletteUseBackground")?.addEventListener("change",()=>{state.palette.useBackground=$("paletteUseBackground").checked;syncPaletteControls();applyPaletteRefresh();});
    bindSegmented("paletteTertiaryEnabled",(value)=>{state.palette.tertiaryEnabled=value==="on";syncPaletteControls();applyPaletteRefresh();});
    $("paletteUseWhite")?.addEventListener("change",()=>{state.palette.useWhite=$("paletteUseWhite").checked;syncPaletteControls();applyPaletteRefresh();});
    $("paletteUseBlack")?.addEventListener("change",()=>{state.palette.useBlack=$("paletteUseBlack").checked;syncPaletteControls();applyPaletteRefresh();});
    bindValue("palettePaperMix",()=>globalNumericDefaults.palettePaperMix,(value)=>{state.palette.paperMix=clamp(value,0,96);$("palettePaperMixValue").textContent=`${round(value)}%`;applyPaletteRefresh();});
    bindValue("regionScale",()=>100,(value)=>applyUniformItemScale("region",value),"input");
    bindValue("elementScale",()=>100,(value)=>applyUniformItemScale("element",value),"input");

    const spacingChanged=()=>{reflowRegions({preserveManual:true,adaptText:true});renderRegionList();renderTextList();updateRegionControls();queueRender();};
    bindValue("pageMargin",()=>globalNumericDefaults.pageMargin,(value)=>{state.pageMargin=clamp(value,0,120);$("pageMarginValue").textContent=`${round(value)}px`;spacingChanged();});
    bindValue("regionGapX",()=>globalNumericDefaults.regionGapX,(value)=>{state.regionGapX=clamp(value,0,100);$("regionGapXValue").textContent=`${round(value)}px`;spacingChanged();});
    bindValue("regionGapY",()=>globalNumericDefaults.regionGapY,(value)=>{state.regionGapY=clamp(value,0,100);$("regionGapYValue").textContent=`${round(value)}px`;spacingChanged();});
    $("reflowRegionsBtn")?.addEventListener("click",()=>{reflowRegions({preserveManual:true,adaptText:true});refreshAllUI();queueRender();toast("현재 여백으로 다시 맞췄습니다.");});
    $("restoreAllRegionsBtn")?.addEventListener("click",()=>{state.regions.forEach((region)=>{region.layoutDetached=false;region.layoutManualDelta=null;});reflowRegions({preserveManual:false,adaptText:true});refreshAllUI();queueRender();toast("모든 영역을 템플릿 위치로 돌렸습니다.");});
    $("restoreRegionLayoutBtn")?.addEventListener("click",()=>{const region=selectedRegion();if(!region)return;restoreRegionLayout(region);refreshAllUI();queueRender();toast("선택 영역을 원래 위치로 돌렸습니다.");});

    bindSegmented("regionTextClip",value=>{const region=selectedRegion();if(!region)return;region.clipText=value==="on";updateRegionControls();queueRender();markHistoryDirty(true);});

    bindMultiEffect("regionEffectStack",selectedRegion,()=>updateRegionControls());
    bindMultiEffect("elementEffectStack",selectedElement,()=>updateElementControls());

    bindSegmented("elementClipEnabled",(value)=>{const element=selectedElement();if(!element)return;if(value==="on"){element.clipRegionId=element.clipRegionId||state.selectedRegionId||state.regions.find((region)=>region.shape!=="line")?.id||null;state.clipPickMode=true;toast("미리보기에서 자를 영역을 누르세요.");}else{element.clipRegionId=null;state.clipPickMode=false;}updateElementControls();});
    $("elementClipRegion")?.addEventListener("change",()=>{const element=selectedElement();if(!element)return;element.clipRegionId=$("elementClipRegion").value||null;updateElementControls();queueRender();});

    $("artboardPreset")?.addEventListener("change",()=>{const value=$("artboardPreset").value;if(value==="custom"){state.artboard.preset="custom";return;}const preset=ARTBOARD_PRESETS[value];if(preset)setArtboardSize(preset.widthMm,preset.heightMm,{preset:value});});
    $("artboardWidthMm")?.addEventListener("change",()=>setArtboardSize($("artboardWidthMm").value,state.artboard.heightMm,{preset:"custom"}));
    $("artboardHeightMm")?.addEventListener("change",()=>setArtboardSize(state.artboard.widthMm,$("artboardHeightMm").value,{preset:"custom"}));
    $("backgroundMode")?.addEventListener("change",syncBackgroundControls);

    $("showRegions")?.addEventListener("change",()=>{state.showRegions=$("showRegions").checked;queueRender();});

    const photoInput=$("photoInput");
    if(photoInput){
      photoInput.addEventListener("change",async(event)=>{
        event.stopImmediatePropagation();
        const file=photoInput.files?.[0];if(!file)return;
        try{
          const reader=new FileReader();
          const source=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});
          const trimmed=await trimTransparentDataUrl(source);
          const {trimW:W,trimH:H}=dimensions();
          const ratio=trimmed.width/Math.max(1,trimmed.height);
          const maxW=W*.34,maxH=H*.48;
          let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio;}
          const element=makeElement("image",W*.58,H*.28,{w:Math.max(60,w),h:Math.max(60,h),imageSrc:trimmed.src,fillNone:true,strokeNone:true,affectFlow:true,flowMargin:0,alphaBounds:{x:0,y:0,w:trimmed.width,h:trimmed.height},originalName:file.name});
          state.elements.push(element);state.selectedElementId=element.id;state.selectedRegionId=null;state.selectedTextId=null;openToolTab("elements");updateElementControls();queueRender();toast("투명 여백을 잘라 사진을 넣었습니다.");
        }catch(error){console.error(error);toast("사진을 불러오지 못했습니다.");}
        photoInput.value="";
      },true);
    }
  }

  function openToolTab(name){
    state.activeTool=name;
    const tab=document.querySelector(`.tool-tab[data-tool-tab="${name}"]`);if(!tab)return;
    document.querySelectorAll(".tool-tab").forEach((item)=>item.classList.toggle("active",item===tab));
    document.querySelectorAll(".tool-pane").forEach((pane)=>pane.classList.toggle("active",pane.dataset.toolPane===name));
  }

  function layerAlphaBounds(layer){
    if(!layer)return null;
    if(layer.__alphaBounds)return layer.__alphaBounds;
    const c=layer.getContext("2d",{willReadFrequently:true});
    const {width,height}=layer;const data=c.getImageData(0,0,width,height).data;
    let minX=width,minY=height,maxX=-1,maxY=-1;
    const stride=Math.max(1,Math.floor(Math.max(width,height)/600));
    for(let y=0;y<height;y+=stride)for(let x=0;x<width;x+=stride){if(data[(y*width+x)*4+3]>4){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
    layer.__alphaBounds=maxX<minX?{x:0,y:0,w:width,h:height}:{x:minX,y:minY,w:maxX-minX+stride,h:maxY-minY+stride};
    return layer.__alphaBounds;
  }

  function obstacleRects(){
    return state.elements.filter((element)=>element.affectFlow).map((element)=>{
      const item=elementGeometry(element);if(!item)return null;
      let x=item.x,y=item.y,w=item.w,h=item.h;
      if(item.type==="image"){
        const layer=getImageLayer(item),bounds=layerAlphaBounds(layer);
        if(bounds&&layer){x=item.x+bounds.x/layer.width*item.w;y=item.y+bounds.y/layer.height*item.h;w=bounds.w/layer.width*item.w;h=bounds.h/layer.height*item.h;}
      }
      const margin=Number(element.flowMargin)||0;
      return {x:x-margin,y:y-margin,w:w+margin*2,h:h+margin*2,id:element.id};
    }).filter((rect)=>rect&&rect.w>0&&rect.h>0);
  }

  function hitElement(point){
    for(const element of [...state.elements].reverse()){
      const item=elementGeometry(element);if(!item||!pointInItem(point,item,2))continue;
      if(item.clipRegion&&!pointInItem(point,item.clipRegion,0))continue;
      if(item.type==="image"){
        const layer=getImageLayer(item);if(!layer)continue;
        const local=localPoint(point,item);
        const px=Math.floor((local.x-item.x)/Math.max(1,item.w)*layer.width);
        const py=Math.floor((local.y-item.y)/Math.max(1,item.h)*layer.height);
        if(px<0||py<0||px>=layer.width||py>=layer.height)continue;
        try{if(layer.getContext("2d",{willReadFrequently:true}).getImageData(px,py,1,1).data[3]<5)continue;}catch{}
      }
      return {id:element.id,...item};
    }
    return null;
  }

  function transformSource(kind,id){
    if(kind==="region")return state.regions.find((item)=>item.id===id);
    if(kind==="element")return state.elements.find((item)=>item.id===id);
    if(kind==="text")return state.texts.find((item)=>item.id===id);
    return null;
  }

  function transformGeometry(kind,id){
    if(kind==="text"){
      const fragment=layoutFragments.find((item)=>item.id===id);
      return fragment?{x:fragment.x,y:fragment.y,w:fragment.w,h:fragment.h,rotation:0,regionId:fragment.regionId}:null;
    }
    const source=transformSource(kind,id);return kind==="element"?elementGeometry(source):source;
  }

  function activateTransform(kind,id,{announce=false}={}){
    const source=transformSource(kind,id);if(!source)return;
    transformTarget={kind,id};
    if(kind==="region"){
      state.selectedRegionId=id;state.selectedElementId=null;openToolTab("regions");renderRegionList();renderTextList({bringSelectedRegionIntoView:true});
    }else if(kind==="element"){
      state.selectedElementId=id;state.selectedRegionId=null;state.selectedTextId=null;openToolTab("elements");
    }else{
      state.selectedTextId=id;state.selectedElementId=null;state.selectedRegionId=null;renderTextList({bringSelectedTextIntoView:true});
    }
    updateRegionControls();updateElementControls();queueRender();
    if(announce)toast(kind==="text"?"문장을 영역 안에서 이동·확대할 수 있습니다.":"이동·크기·회전 핸들을 열었습니다.");
  }

  function textTransformHandleAt(point,item){
    const handles=itemHandlePoints(item),radius=32;
    for(const key of ["nw","ne","se","sw"]){if(Math.hypot(point.x-handles[key].x,point.y-handles[key].y)<=radius)return key;}
    return pointInItem(point,item,8)?"move":null;
  }

  let v16PointerState=null;
  let v16LongPressTimer=null;
  function clearV16LongPress(){clearTimeout(v16LongPressTimer);v16LongPressTimer=null;}
  function armV16LongPress(kind,id,event,point){
    if(event.pointerType==="mouse")return;
    clearV16LongPress();
    const pointerId=event.pointerId;
    v16LongPressTimer=setTimeout(()=>{
      if(!v16PointerState||v16PointerState.pointerId!==pointerId||v16PointerState.moved)return;
      v16PointerState.longPressFired=true;activateTransform(kind,id,{announce:false});
      if(navigator.vibrate)navigator.vibrate(20);toast("편집 핸들을 열었습니다.");
    },560);
  }

  function beginV16Transform(event,point,handle){
    if(!transformTarget)return false;
    const {kind,id}=transformTarget,source=transformSource(kind,id),geometry=transformGeometry(kind,id);
    if(!source||!geometry)return false;
    beginHistoryInteraction();
    v16PointerState={type:"transform",kind,id,handle,pointerId:event.pointerId,start:point,orig:deepClone(source),geometry:{...geometry},center:{x:geometry.x+geometry.w/2,y:geometry.y+geometry.h/2},startAngle:Math.atan2(point.y-(geometry.y+geometry.h/2),point.x-(geometry.x+geometry.w/2)),moved:false,textPositions:kind==="region"?state.texts.filter((text)=>text.regionId===id&&text.manualX!=null&&text.manualY!=null).map((text)=>({id:text.id,x:text.manualX,y:text.manualY})):[]};
    try{canvas.setPointerCapture(event.pointerId);}catch{}
    return true;
  }

  function constrainRectToArtboard(x,y,w,h,W,H,fraction=.05){
    const target=Math.max(1,Math.min(w*h,W*H)*fraction);
    const maxOverlapX=Math.max(1,Math.min(w,W));
    const minOverlapY=Math.min(Math.min(h,H),target/maxOverlapX);
    y=clamp(y,minOverlapY-h,H-minOverlapY);
    const overlapY=Math.max(1,Math.min(y+h,H)-Math.max(y,0));
    const minOverlapX=Math.min(Math.min(w,W),target/overlapY);
    x=clamp(x,minOverlapX-w,W-minOverlapX);
    return {x,y};
  }

  function resizeV16Transform(drag,point){
    const source=transformSource(drag.kind,drag.id);if(!source)return;
    const {trimW:W,trimH:H}=dimensions();
    if(drag.kind==="text"){
      const opposite={nw:{x:drag.geometry.x+drag.geometry.w,y:drag.geometry.y+drag.geometry.h},ne:{x:drag.geometry.x,y:drag.geometry.y+drag.geometry.h},se:{x:drag.geometry.x,y:drag.geometry.y},sw:{x:drag.geometry.x+drag.geometry.w,y:drag.geometry.y}}[drag.handle];
      if(!opposite)return;
      const newW=Math.max(20,Math.abs(point.x-opposite.x)),newH=Math.max(12,Math.abs(point.y-opposite.y));
      const ratio=clamp(Math.min(newW/Math.max(1,drag.geometry.w),newH/Math.max(1,drag.geometry.h)),.35,3);
      source.manualScale=clamp((Number(drag.orig.manualScale)||1)*ratio,.35,3);
      source.styleMode="manual";source.regionLocked=true;source.manualProtected=true;return;
    }
    const dx=point.x-drag.start.x,dy=point.y-drag.start.y;
    if(drag.kind==="element"&&source.type==="image"){
      const original=drag.geometry;
      const opposite={nw:{x:original.x+original.w,y:original.y+original.h},ne:{x:original.x,y:original.y+original.h},se:{x:original.x,y:original.y},sw:{x:original.x+original.w,y:original.y}}[drag.handle];
      if(!opposite)return;
      const targetW=Math.abs(point.x-opposite.x),targetH=Math.abs(point.y-opposite.y);
      const diagonal=Math.hypot(original.w,original.h)||1;
      const scale=clamp(Math.hypot(targetW,targetH)/diagonal,Math.max(24/original.w,24/original.h),6);
      const w=original.w*scale,h=original.h*scale;
      const x=drag.handle.includes("w")?opposite.x-w:opposite.x;
      const y=drag.handle.includes("n")?opposite.y-h:opposite.y;
      const constrained=constrainRectToArtboard(x,y,w,h,W,H,.05);
      source.x=constrained.x;source.y=constrained.y;
      source.w=w;source.h=h;source.imageFit="contain";
      return;
    }
    if(drag.kind==="element"&&source.type==="band"){
      const north=drag.handle==="nw"||drag.handle==="ne";
      if(source.bandScope==="region")source.h=clamp(drag.orig.h+(north?-dy*2:dy*2),18,H);
      else if(north){source.y=drag.orig.y+dy;source.h=clamp(drag.orig.h-dy,18,H);}else source.h=clamp(drag.orig.h+dy,18,H);
      return;
    }
    const original=drag.geometry,center={x:original.x+original.w/2,y:original.y+original.h/2};
    const local=rotatePoint(point,center,-(original.rotation||0));
    const opposite={nw:{x:original.x+original.w,y:original.y+original.h},ne:{x:original.x,y:original.y+original.h},se:{x:original.x,y:original.y},sw:{x:original.x+original.w,y:original.y}}[drag.handle];
    if(!opposite)return;
    let x=Math.min(local.x,opposite.x),y=Math.min(local.y,opposite.y),w=Math.abs(local.x-opposite.x),h=Math.abs(local.y-opposite.y);
    const minW=source.shape==="line"?40:32,minH=source.shape==="line"?2:26;
    if(w<minW){if(local.x<opposite.x)x=opposite.x-minW;w=minW;}if(h<minH){if(local.y<opposite.y)y=opposite.y-minH;h=minH;}
    const constrained=constrainRectToArtboard(x,y,w,h,W,H,.05);
    source.x=constrained.x;source.y=constrained.y;source.w=w;source.h=h;
  }

function swapRegionTextBundles(sourceRegionId,targetRegionId){
    if(!sourceRegionId||!targetRegionId||sourceRegionId===targetRegionId)return false;
    const sourceTexts=state.texts.filter((text)=>text.regionId===sourceRegionId).sort((a,b)=>a.order-b.order);
    const targetTexts=state.texts.filter((text)=>text.regionId===targetRegionId).sort((a,b)=>a.order-b.order);
    sourceTexts.forEach((text,index)=>{
      text.regionId=targetRegionId;text.order=index;text.manualX=null;text.manualY=null;text.manualScale=1;text.regionLocked=true;text.manualProtected=true;
    });
    targetTexts.forEach((text,index)=>{
      text.regionId=sourceRegionId;text.order=index;text.manualX=null;text.manualY=null;text.manualScale=1;text.regionLocked=true;text.manualProtected=true;
    });
    normalizeTextOrders();return true;
  }

  function v16PointerDown(event){
    const point=canvasPoint(event);
    if(transformTarget){
      const geometry=transformGeometry(transformTarget.kind,transformTarget.id);
      const handle=geometry?(transformTarget.kind==="text"?textTransformHandleAt(point,geometry):transformHandleAt(point,geometry)):null;
      if(handle&&beginV16Transform(event,point,handle)){event.preventDefault();event.stopImmediatePropagation();return;}
    }
    if(state.activeTool==="elements"){
      const elementHit=hitElement(point);
      if(elementHit){
        const element=state.elements.find((item)=>item.id===elementHit.id);if(!element)return;
        transformTarget=null;state.selectedElementId=element.id;state.selectedRegionId=null;state.selectedTextId=null;
        updateElementControls();updateRegionControls();renderRegionList();queueRender();
        v16PointerState={type:"select",kind:"element",id:element.id,pointerId:event.pointerId,start:point,moved:false};armV16LongPress("element",element.id,event,point);
        try{canvas.setPointerCapture(event.pointerId);}catch{}event.preventDefault();event.stopImmediatePropagation();return;
      }
      if(state.clipPickMode&&selectedElement()){
        const regionHit=hitRegion(point);
        if(regionHit){selectedElement().clipRegionId=regionHit.id;state.clipPickMode=false;updateElementControls();queueRender();toast("선택한 영역으로 잘랐습니다.");event.preventDefault();event.stopImmediatePropagation();return;}
      }
      transformTarget=null;state.selectedElementId=null;state.selectedRegionId=null;state.selectedTextId=null;state.clipPickMode=false;updateElementControls();updateRegionControls();renderRegionList();renderTextList();queueRender();event.stopImmediatePropagation();return;
    }
    const textHit=hitText(point);
    if(textHit){
      const text=state.texts.find((item)=>item.id===textHit.id);if(!text)return;
      const already=state.selectedTextId===text.id;
      transformTarget=null;state.selectedTextId=text.id;state.selectedElementId=null;state.selectedRegionId=null;renderTextList({bringSelectedTextIntoView:true});updateElementControls();updateRegionControls();queueRender();
      v16PointerState={type:"textBundle",id:text.id,sourceRegionId:text.regionId,pointerId:event.pointerId,start:point,moved:false,longPressFired:false};
      if(already)armV16LongPress("text",text.id,event,point);
      beginHistoryInteraction();try{canvas.setPointerCapture(event.pointerId);}catch{}event.preventDefault();event.stopImmediatePropagation();return;
    }
    const elementHit=hitElement(point);
    if(elementHit){
      const element=state.elements.find((item)=>item.id===elementHit.id);if(!element)return;
      transformTarget=null;state.selectedElementId=element.id;state.selectedRegionId=null;state.selectedTextId=null;openToolTab("elements");updateElementControls();updateRegionControls();renderRegionList();queueRender();
      v16PointerState={type:"select",kind:"element",id:element.id,pointerId:event.pointerId,start:point,moved:false};armV16LongPress("element",element.id,event,point);try{canvas.setPointerCapture(event.pointerId);}catch{}event.preventDefault();event.stopImmediatePropagation();return;
    }
    const regionHit=hitRegion(point);
    if(regionHit){
      const region=state.regions.find((item)=>item.id===regionHit.id);if(!region)return;
      transformTarget=null;state.selectedRegionId=region.id;state.selectedElementId=null;state.selectedTextId=null;openToolTab("regions");renderRegionList();renderTextList({bringSelectedRegionIntoView:true});updateRegionControls();updateElementControls();queueRender();
      v16PointerState={type:"select",kind:"region",id:region.id,pointerId:event.pointerId,start:point,moved:false};armV16LongPress("region",region.id,event,point);try{canvas.setPointerCapture(event.pointerId);}catch{}event.preventDefault();event.stopImmediatePropagation();return;
    }
    clearV16LongPress();transformTarget=null;state.selectedElementId=null;state.selectedRegionId=null;state.selectedTextId=null;state.clipPickMode=false;updateElementControls();updateRegionControls();renderRegionList();renderTextList();queueRender();event.stopImmediatePropagation();
  }

  function v16PointerMove(event){
    if(!v16PointerState)return;
    const point=canvasPoint(event),dx=point.x-v16PointerState.start.x,dy=point.y-v16PointerState.start.y;
    if(Math.abs(dx)+Math.abs(dy)>4){v16PointerState.moved=true;if(Math.hypot(dx,dy)>14)clearV16LongPress();}
    if(v16PointerState.type!=="transform"){event.preventDefault();event.stopImmediatePropagation();return;}
    const drag=v16PointerState,source=transformSource(drag.kind,drag.id);if(!source)return;
    const {trimW:W,trimH:H}=dimensions();
    if(drag.handle==="move"){
      if(drag.kind==="text"){
        const region=state.regions.find((item)=>item.id===source.regionId),box=region?regionContentBox(region):{x:0,y:0,w:W,h:H};
        const baseX=drag.orig.manualX??drag.geometry.x,baseY=drag.orig.manualY??drag.geometry.y;
        source.manualX=clamp(baseX+dx,box.x,Math.max(box.x,box.x+box.w-drag.geometry.w));
        source.manualY=clamp(baseY+dy,box.y,Math.max(box.y,box.y+box.h-drag.geometry.h));source.regionLocked=true;source.styleMode="manual";source.manualProtected=true;
      }else if(drag.kind==="element"&&source.type==="band"){
        if(source.bandScope==="region"){
          const region=state.regions.find((item)=>item.id===source.bandRegionId);if(region)source.bandPosition=clamp((drag.geometry.y+drag.geometry.h/2+dy-region.y)/Math.max(1,region.h),0,1);
        }else source.y=clamp(drag.orig.y+dy,-source.h*.7,H-source.h*.3);
      }else{
        const candidate=constrainRectToArtboard(drag.orig.x+dx,drag.orig.y+dy,drag.orig.w,drag.orig.h,W,H,.05);
        source.x=candidate.x;source.y=candidate.y;
        if(drag.kind==="region")drag.textPositions.forEach((saved)=>{const text=state.texts.find((item)=>item.id===saved.id);if(text){text.manualX=saved.x+dx;text.manualY=saved.y+dy;}});
      }
    }else if(drag.handle==="rotate"&&drag.kind!=="text"){
      const angle=Math.atan2(point.y-drag.center.y,point.x-drag.center.x);source.rotation=Math.round(drag.orig.rotation+(angle-drag.startAngle)*180/Math.PI);
    }else resizeV16Transform(drag,point);
    if(drag.kind==="region"){captureRegionManualDelta(source);renderRegionList();}
    updateRegionControls();updateElementControls();queueRender();event.preventDefault();event.stopImmediatePropagation();
  }

  function v16PointerFinish(event){
    if(!v16PointerState)return;
    const point=canvasPoint(event),drag=v16PointerState;clearV16LongPress();
    if(drag.type==="textBundle"&&!drag.longPressFired&&drag.moved){
      const targetText=hitText(point,drag.id);const targetRegion=targetText?.regionId||hitRegion(point,true)?.id;
      if(targetRegion&&swapRegionTextBundles(drag.sourceRegionId,targetRegion)){renderTextList();toast("두 영역의 문장 묶음을 바꿨습니다.");}
    }
    if(drag.type==="transform"&&drag.kind==="region")captureRegionManualDelta(transformSource("region",drag.id));
    try{canvas.releasePointerCapture(event.pointerId);}catch{}
    v16PointerState=null;renderRegionList();updateRegionControls();updateElementControls();queueRender();
    if(drag.type==="textBundle"||drag.type==="transform")endHistoryInteraction({commit:true});
    event.preventDefault();event.stopImmediatePropagation();
  }

  function v16DoubleClick(event){
    const point=canvasPoint(event);
    if(state.activeTool==="elements"){
      const elementHit=hitElement(point);if(elementHit){activateTransform("element",elementHit.id,{announce:false});event.preventDefault();event.stopImmediatePropagation();}return;
    }
    const textHit=hitText(point);if(textHit&&state.selectedTextId===textHit.id){activateTransform("text",textHit.id,{announce:false});event.preventDefault();event.stopImmediatePropagation();return;}
    const elementHit=hitElement(point);if(elementHit){activateTransform("element",elementHit.id,{announce:false});event.preventDefault();event.stopImmediatePropagation();return;}
    const regionHit=hitRegion(point);if(regionHit){activateTransform("region",regionHit.id,{announce:false});event.preventDefault();event.stopImmediatePropagation();}
  }

  canvas.addEventListener("pointerdown",v16PointerDown,true);
  canvas.addEventListener("pointermove",v16PointerMove,true);
  canvas.addEventListener("pointerup",v16PointerFinish,true);
  canvas.addEventListener("pointercancel",v16PointerFinish,true);
  canvas.addEventListener("dblclick",v16DoubleClick,true);

  $("canvasStage")?.addEventListener("pointerdown",(event)=>{
    if(event.target===canvas)return;
    clearV16LongPress();
    transformTarget=null;v16PointerState=null;
    state.selectedTextId=null;state.selectedRegionId=null;state.selectedElementId=null;state.clipPickMode=false;
    renderTextList();renderRegionList();updateRegionControls();updateElementControls();queueRender();
  },true);


  function imageAlphaInfo(layer){
    if(!layer)return null;
    if(layer.__alphaInfo)return layer.__alphaInfo;
    try{
      const data=layer.getContext("2d",{willReadFrequently:true}).getImageData(0,0,layer.width,layer.height).data;
      layer.__alphaInfo={data,width:layer.width,height:layer.height};
    }catch{layer.__alphaInfo=null;}
    return layer.__alphaInfo;
  }

  function obstacleRects(regionId=null){
    return state.elements.filter((element)=>element.affectFlow).map((element)=>{
      const item=elementGeometry(element);if(!item)return null;
      const scopedRegionId=element.clipRegionId||item.bandClipRegion?.id||null;

      // An element clipped to a text region belongs only to that region's flow.
      // It must never push or break text in neighboring regions.
      if(scopedRegionId&&regionId&&scopedRegionId!==regionId)return null;

      const margin=Number(element.flowMargin)||0;
      let effectPad=0;
      if(activeEffects(element).length)effectPad=Math.max(0,(Number(element.effectSize)||0)*.65);

      let x=item.x-margin-effectPad;
      let y=item.y-margin-effectPad;
      let right=item.x+item.w+margin+effectPad;
      let bottom=item.y+item.h+margin+effectPad;

      // Clipped content is visible only inside its clipping region, so its
      // avoidance bounds are also limited to that region.
      if(scopedRegionId){
        const clipRegion=state.regions.find((candidate)=>candidate.id===scopedRegionId);
        if(clipRegion){
          x=Math.max(x,clipRegion.x);
          y=Math.max(y,clipRegion.y);
          right=Math.min(right,clipRegion.x+clipRegion.w);
          bottom=Math.min(bottom,clipRegion.y+clipRegion.h);
        }
      }

      return {
        id:element.id,element,item,margin,scopedRegionId,
        x,y,w:right-x,h:bottom-y
      };
    }).filter((item)=>item&&item.w>0&&item.h>0);
  }

  function obstacleIntervalsAt(obstacle,y,h){
    const item=obstacle.item,element=obstacle.element,margin=obstacle.margin||0;
    if(!item||y+h<=obstacle.y||y>=obstacle.y+obstacle.h)return [];
    if(Math.abs(Number(item.rotation)||0)>.1)return [[obstacle.x,obstacle.x+obstacle.w]];
    const top=Math.max(y,item.y),bottom=Math.min(y+h,item.y+item.h);
    if(bottom<=top)return [];
    if(item.type==="image"){
      const layer=getImageLayer(item),info=imageAlphaInfo(layer);if(!info)return [[obstacle.x,obstacle.x+obstacle.w]];
      const row0=clamp(Math.floor((top-item.y)/Math.max(1,item.h)*info.height),0,info.height-1);
      const row1=clamp(Math.ceil((bottom-item.y)/Math.max(1,item.h)*info.height),row0+1,info.height);
      const occupied=new Uint8Array(info.width);
      const rowStep=Math.max(1,Math.floor((row1-row0)/24));
      const colStep=Math.max(1,Math.floor(info.width/480));
      for(let py=row0;py<row1;py+=rowStep){
        for(let px=0;px<info.width;px+=colStep){
          if(info.data[(py*info.width+px)*4+3]>5){
            for(let k=0;k<colStep&&px+k<info.width;k++)occupied[px+k]=1;
          }
        }
      }
      const intervals=[];let start=-1;
      for(let px=0;px<=info.width;px++){
        const on=px<info.width&&occupied[px];
        if(on&&start<0)start=px;
        if(!on&&start>=0){
          const a=item.x+start/info.width*item.w-margin;
          const b=item.x+px/info.width*item.w+margin;
          if(b>a)intervals.push([a,b]);start=-1;
        }
      }
      return intervals;
    }
    if(item.type==="circle"||item.shape==="ellipse"){
      const cx=item.x+item.w/2,cy=item.y+item.h/2,rx=item.w/2,ry=item.h/2;
      const samples=[top,bottom,(top+bottom)/2,clamp(cy,top,bottom)];
      let half=0;
      samples.forEach((sy)=>{const dy=(sy-cy)/Math.max(1,ry);if(Math.abs(dy)<=1)half=Math.max(half,rx*Math.sqrt(Math.max(0,1-dy*dy)));});
      return half>0?[[cx-half-margin,cx+half+margin]]:[];
    }
    if(item.type==="triangle"){
      const cy0=item.y,cy1=item.y+item.h,cx=item.x+item.w/2;
      const maxRatio=Math.max(clamp((top-cy0)/Math.max(1,item.h),0,1),clamp((bottom-cy0)/Math.max(1,item.h),0,1));
      const half=item.w*.5*maxRatio;return [[cx-half-margin,cx+half+margin]];
    }
    return [[item.x-margin,item.x+item.w+margin]];
  }

  function availableIntervals(box,y,h,obstacles){
    let intervals=[[box.x,box.x+box.w]];
    obstacles.forEach((obstacle)=>{
      obstacleIntervalsAt(obstacle,y,h).forEach(([a,b])=>{intervals=subtractIntervals(intervals,a,b);});
    });
    return intervals;
  }

  function installCoarsePointerRangeGuard(){
    let active=null;
    let suppressPointerUntil=0;
    const isTouchDevice=(event)=>event?.pointerType==="touch"||navigator.maxTouchPoints>0||window.matchMedia?.("(any-pointer: coarse)").matches;
    const metrics=(range)=>{
      const rect=range.getBoundingClientRect();
      const min=Number(range.min)||0,max=Number(range.max)||100,value=Number(range.value)||0;
      const thumb=Math.max(22,Math.min(30,Math.max(rect.height*1.65,22)));
      const usable=Math.max(1,rect.width-thumb);
      const ratio=max===min?0:clamp((value-min)/(max-min),0,1);
      return {rect,min,max,value,thumb,usable,center:rect.left+thumb/2+ratio*usable};
    };
    const begin=(range,clientX,id,mode)=>{
      const m=metrics(range),tolerance=Math.max(18,m.thumb*.78);
      if(Math.abs(clientX-m.center)>tolerance)return false;
      active={range,id,mode,startX:clientX,startValue:m.value,min:m.min,max:m.max,step:Number(range.step)||1,usable:m.usable,moved:false};
      beginHistoryInteraction();
      range.focus({preventScroll:true});
      return true;
    };
    const move=(clientX)=>{
      if(!active)return;
      const dx=clientX-active.startX;
      if(!active.moved&&Math.abs(dx)<4)return;
      active.moved=true;
      const span=active.max-active.min;
      const raw=active.startValue+dx/Math.max(1,active.usable)*span;
      const stepped=active.min+Math.round((clamp(raw,active.min,active.max)-active.min)/active.step)*active.step;
      active.range.value=String(Number(stepped.toFixed(8)));
      updateRangeVisual(active.range);
      active.range.dispatchEvent(new Event("input",{bubbles:true}));
    };
    const finish=(cancel=false)=>{
      if(!active)return;
      if(active.moved&&!cancel)active.range.dispatchEvent(new Event("change",{bubbles:true}));
      endHistoryInteraction({commit:active.moved&&!cancel});
      active=null;
    };

    document.addEventListener("touchstart",(event)=>{
      const range=event.target instanceof Element?event.target.closest('input[type="range"]'):null;
      if(!range||range.disabled)return;
      event.preventDefault();event.stopImmediatePropagation();
      suppressPointerUntil=Date.now()+900;
      const touch=event.changedTouches?.[0];
      if(touch)begin(range,touch.clientX,touch.identifier,"touch");
    },{capture:true,passive:false});
    document.addEventListener("touchmove",(event)=>{
      if(!active||active.mode!=="touch")return;
      const touch=Array.from(event.changedTouches||[]).find((item)=>item.identifier===active.id)||event.changedTouches?.[0];
      if(!touch)return;
      event.preventDefault();event.stopImmediatePropagation();move(touch.clientX);
    },{capture:true,passive:false});
    document.addEventListener("touchend",(event)=>{
      if(!active||active.mode!=="touch")return;
      event.preventDefault();event.stopImmediatePropagation();finish(false);
    },{capture:true,passive:false});
    document.addEventListener("touchcancel",(event)=>{
      if(!active||active.mode!=="touch")return;
      event.preventDefault();event.stopImmediatePropagation();finish(true);
    },{capture:true,passive:false});

    document.addEventListener("pointerdown",(event)=>{
      const range=event.target instanceof Element?event.target.closest('input[type="range"]'):null;
      if(!range||range.disabled||!isTouchDevice(event))return;
      event.preventDefault();event.stopImmediatePropagation();
      if(Date.now()<suppressPointerUntil)return;
      if(begin(range,event.clientX,event.pointerId,"pointer")){
        try{range.setPointerCapture(event.pointerId);}catch{}
      }
    },true);
    document.addEventListener("pointermove",(event)=>{
      if(!active||active.mode!=="pointer"||event.pointerId!==active.id)return;
      event.preventDefault();event.stopImmediatePropagation();move(event.clientX);
    },true);
    document.addEventListener("pointerup",(event)=>{
      if(!active||active.mode!=="pointer"||event.pointerId!==active.id)return;
      event.preventDefault();event.stopImmediatePropagation();
      try{active.range.releasePointerCapture(event.pointerId);}catch{}
      finish(false);
    },true);
    document.addEventListener("pointercancel",(event)=>{
      if(!active||active.mode!=="pointer"||event.pointerId!==active.id)return;
      event.preventDefault();event.stopImmediatePropagation();finish(true);
    },true);
    document.addEventListener("click",(event)=>{
      const range=event.target instanceof Element?event.target.closest('input[type="range"]'):null;
      if(range&&isTouchDevice(event)){event.preventDefault();event.stopImmediatePropagation();}
    },true);
  }


  async function initializeV17(){
    prepareV16();
    installCoarsePointerRangeGuard();
    enhanceStaticNumericFields();
    bindControls();
    setupColorFields();
    bindV16Controls();
    if(document.fonts){
      const fontLoad=Promise.allSettled(Object.values(fontFamilies).map((family)=>document.fonts.load(`16px ${family}`)));
      const timeout=new Promise((resolve)=>setTimeout(resolve,2200));
      await Promise.race([fontLoad,timeout]);
    }
    fontsReady=true;
    let restored=false;
    try{
      restored=await restorePersistedState();
      if(restored){
        refreshAllUI();
        updatePreviewZoom();
      }
    }catch(error){
      console.error("저장된 작업 복원 실패:",error);
      restored=false;
      state=deepClone(initialState);
      ensureStateCompatibility();
    }
    if(!restored){
      applyTemplate("dense-left-rail",{preserveTexts:false});
    }
    initializeHistory();
    const showRegionsControl=$("showRegions");
    if(showRegionsControl)showRegionsControl.checked=Boolean(state.showRegions);
    renderUnicodeGrid("전체","");
    queueRender();
  }
  initializeV17().catch((error)=>{
    console.error("찌라시 메이커 초기화 실패:",error);
    try{
      state=deepClone(initialState);
      ensureStateCompatibility();
      applyTemplate("dense-left-rail",{preserveTexts:false});
      initializeHistory();
      renderUnicodeGrid("전체","");
      queueRender();
      toast("초기화 중 문제가 발생해 기본 작업으로 복구했습니다.");
    }catch(fallbackError){
      console.error("기본 작업 복구 실패:",fallbackError);
    }
  });
})();
