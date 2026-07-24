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
    dotum: '"KoPubDotum", "Malgun Gothic", sans-serif',
    batang: '"KoPubBatang", "Batang", serif',
    gulim: '"Gulim", "Malgun Gothic", sans-serif'
  };

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
    ["dot", "단어 사이 ·"],
    ["star", "단어 사이 ★"],
    ["heart", "단어 사이 ♥"],
    ["block", "단어 사이 ■"],
    ["bullet", "단어 사이 •"],
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
    const candidates = [state?.palette?.tertiary, state?.palette?.primary, state?.palette?.secondary, "#ffffff", "#111111"].filter(Boolean);
    const ranked = candidates
      .filter((color) => color.toLowerCase() !== String(baseColor || "").toLowerCase())
      .map((color) => ({ color, score: contrastRatio(color, background) + (color === state?.palette?.tertiary ? .18 : 0) }))
      .sort((a, b) => b.score - a.score);
    return ranked.find((item) => item.score >= 3.2)?.color || ranked[0]?.color || baseColor;
  }

  function paletteColor(role, palette) {
    const p = palette || state.palette || { primary: "#ffd400", secondary: "#111111", tertiary: "#e62d20" };
    if (!role) return "#111111";
    if (p[role]) return p[role];
    if (role === "ink") return p.secondary || "#111111";
    if (role === "paper") return luminance(p.primary) > 0.72 ? mix(p.primary, "#ffffff", 0.58) : mix(p.primary, "#ffffff", 0.86);
    if (role === "paperHard") return luminance(p.primary) > 0.72 ? mix(p.primary, "#ffffff", 0.42) : mix(p.primary, "#ffffff", 0.76);
    if (role === "primarySoft") return mix(p.primary, "#ffffff", 0.34);
    if (role === "primaryDeep") return mix(p.primary, "#000000", 0.18);
    if (role === "secondarySoft") return mix(p.secondary, "#ffffff", 0.18);
    if (role === "secondaryPaper") return mix(p.secondary, "#ffffff", 0.74);
    if (role === "tertiarySoft") return mix(p.tertiary, "#ffffff", 0.22);
    if (role === "tertiaryPaper") return mix(p.tertiary, "#ffffff", 0.66);
    if (role === "tertiaryDeep") return mix(p.tertiary, "#000000", 0.16);
    if (role === "white") return "#ffffff";
    if (role === "black") return "#111111";
    if (role === "cream") return "#fff4d2";
    return role;
  }

  function R(name, x, y, w, h, options = {}) {
    const region = {
      id: uid(), name, x, y, w, h,
      shape: "rect", radius: 0, rotation: 0, padding: 26,
      fill: "#ffffff", fillRole: null, fillNone: false,
      stroke: "#111111", strokeRole: null, strokeNone: true, strokeWidth: 0,
      acceptText: true, effect: "none", effectColor: "#111111", effectSize: 18,
      ...options
    };
    if (options.strokeNone === undefined && (options.stroke || options.strokeRole) && Number(options.strokeWidth) > 0) {
      region.strokeNone = false;
    }
    return region;
  }

  const REGION_TEXT_PRESETS = {
    hero: {
      fontFamily:"dotum", align:"left", bold:true, italic:false,
      lineHeight:.86, scaleX:.91, letterSpacing:-5,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:226, fontScale:1.20, gapScale:.48, accentWords:true
    },
    heroShadow: {
      fontFamily:"dotum", align:"left", bold:true, italic:false,
      lineHeight:.86, scaleX:.91, letterSpacing:-5,
      unicodeStyle:"none", effect:"shadow", effectColorRole:"secondary", outlineWidth:3,
      fontCap:220, fontScale:1.16, gapScale:.48, accentWords:false
    },
    heroOutline: {
      fontFamily:"dotum", align:"left", bold:true, italic:false,
      lineHeight:.86, scaleX:.91, letterSpacing:-5,
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
      fontFamily:"dotum", align:"center", bold:true, italic:false,
      lineHeight:.84, scaleX:.94, letterSpacing:-2,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:132, fontScale:1.10, gapScale:.40, accentWords:false
    },
    badgeOutline: {
      fontFamily:"dotum", align:"center", bold:true, italic:false,
      lineHeight:.84, scaleX:.94, letterSpacing:-2,
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
      fontFamily:"dotum", align:"left", bold:true, italic:false,
      lineHeight:.90, scaleX:.92, letterSpacing:-3,
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
      fontFamily:"dotum", align:"center", bold:true, italic:false,
      lineHeight:.82, scaleX:.88, letterSpacing:-3,
      unicodeStyle:"none", effect:"none", outlineWidth:0,
      fontCap:176, fontScale:1.20, gapScale:.30, accentWords:true
    },
    hotlineOutline: {
      fontFamily:"dotum", align:"center", bold:true, italic:false,
      lineHeight:.82, scaleX:.88, letterSpacing:-3,
      unicodeStyle:"none", effect:"outline", effectColorRole:"paper", outlineWidth:2,
      fontCap:174, fontScale:1.18, gapScale:.30, accentWords:true
    },
    note: {
      fontFamily:"batang", align:"center", bold:true, italic:false,
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
      styleMode: "auto", regionLocked: false,
      fontFamily: "dotum", fontSize: 54, align: "left",
      bold: true, italic: false, underline: false, strike: false,
      scaleX: 1, letterSpacing: -1, lineHeight: 1.08,
      effect: "none", outlineWidth: 3,
      colorMode: "auto", color: "#ffffff", effectColor: "#111111",
      gap: 12, unicodeStyle: "none", customUnicode: "★",
      prefixEnabled: false, prefixSymbol: "•", prefixGap: 12,
      rangeColors: [], manualX: null, manualY: null,
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
      effect: "none", effectColor: "#111111", effectSize: 20,
      label: "", labelSize: 72, labelColor: "#111111", imageFit: "cover", imageSrc: null,
      ...options
    };
  }

  const initialState = {
    orientation: "landscape",
    bleedMm: 0,
    regionGapReduction: 32,
    templateId: "street-alert",
    palette: { primary: "#ffd400", secondary: "#111111", tertiary: "#e62d20" },
    background: { mode:"solid", c1:"#ffd400", c2:"#ffd400", pattern:"none", patternColor:"#e62d20", angle:0, scale:48 },
    regions: [],
    elements: [],
    texts: [],
    posterBorder: { enabled:false, color:"#111111", width:12, radius:0 },
    selectedTextId: null,
    selectedRegionId: null,
    selectedElementId: null,
    jpgQuality: .92,
    showRegions: false
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
  let toastTimer = null;
  let unicodeTarget = null;
  const imageCache = new Map();
  const colorFields = [];
  const staticNumericControllers = new Map();
  const itemNumericDefaults = new Map();
  const textNumericDefaults = new Map();
  const globalNumericDefaults = {
    bleedMm: 0,
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
    const trimW = state.orientation === "portrait" ? 900 : 1600;
    const trimH = state.orientation === "portrait" ? 1600 : 900;
    const bleed = Math.round((Number(state.bleedMm) || 0) * 12);
    return { trimW, trimH, bleed, fullW: trimW + bleed * 2, fullH: trimH + bleed * 2 };
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
      prefixEnabled: text.prefixEnabled,
      prefixSymbol: text.prefixSymbol,
      prefixGap: text.prefixGap,
      rangeColors: text.rangeColors
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
    const seed = hashString(`${text.id}:${facts.raw}`);
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
        updateRegionControls();
        updateElementControls();
        renderRegionList();
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
    $("currentTemplateName").textContent = templateSpecs.find((x) => x.id === state.templateId)?.name || "사용자 템플릿";
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
    const wrap = document.createElement("div");
    wrap.className = "numeric-field numeric-stepper";
    const head = document.createElement("div");
    head.className = "numeric-field-head numeric-stepper-head";
    const title = document.createElement("span");
    title.textContent = labelText;
    const headRight = document.createElement("span");
    headRight.className = "numeric-field-head-right";
    const readout = document.createElement("b");
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "numeric-reset-button";
    reset.textContent = "↺ 원상복귀";
    reset.title = `${labelText} 원래값으로 복귀`;
    reset.setAttribute("aria-label", `${labelText} 원래값으로 복귀`);
    headRight.append(readout, reset);
    head.append(title, headRight);

    const body = document.createElement("div");
    body.className = "numeric-control-row numeric-stepper-body";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "step-button";
    minus.textContent = "−";
    minus.title = `${labelText} 줄이기`;
    const number = document.createElement("input");
    number.type = "text";
    number.inputMode = "decimal";
    number.autocomplete = "off";
    number.spellcheck = false;
    number.className = "numeric-direct-input";
    number.setAttribute("aria-label", `${labelText} 직접 입력`);
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "step-button";
    plus.textContent = "+";
    plus.title = `${labelText} 키우기`;
    body.append(minus, number, plus);

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.className = "numeric-range-input";
    range.setAttribute("aria-label", `${labelText} 슬라이더`);

    const defaultResolver = typeof options.defaultValue === "function"
      ? options.defaultValue
      : () => options.defaultValue ?? value;
    let committed = normalizeNumericValue(value, min, max, step, value);
    let editingStart = committed;
    let numberEditing = false;
    let numberCancelled = false;
    let rangeInteraction = false;
    let keyboardInteraction = false;

    const currentDefault = () => normalizeNumericValue(defaultResolver(), min, max, step, value);
    const updateReset = () => {
      const defaultValue = currentDefault();
      reset.disabled = Math.abs(committed - defaultValue) < Math.max(1e-8, step / 1000);
      reset.title = `${labelText} 원래값 ${formatter(defaultValue)}로 복귀`;
    };
    const syncDisplay = (next, { preserveDraft = false } = {}) => {
      committed = normalizeNumericValue(next, min, max, step, committed);
      if (!preserveDraft) number.value = String(committed);
      range.value = String(committed);
      readout.textContent = formatter(committed);
      updateReset();
      return committed;
    };
    const preview = (next, { preserveDraft = false } = {}) => {
      const fixed = syncDisplay(next, { preserveDraft });
      onInput(fixed);
      queueRender();
      return fixed;
    };
    const commitAtomic = (next) => {
      preview(next);
      markHistoryDirty(true);
    };
    syncDisplay(committed);

    minus.addEventListener("click", () => commitAtomic(committed - step));
    plus.addEventListener("click", () => commitAtomic(committed + step));
    reset.addEventListener("click", () => commitAtomic(currentDefault()));

    number.addEventListener("focus", () => {
      numberEditing = true;
      numberCancelled = false;
      editingStart = committed;
      beginHistoryInteraction();
      number.select();
    });
    number.addEventListener("input", () => {
      const parsed = parseNumericDraft(number.value);
      if (parsed === null) return;
      preview(parsed, { preserveDraft: true });
    });
    number.addEventListener("blur", () => {
      if (!numberEditing) return;
      const parsed = parseNumericDraft(number.value);
      if (numberCancelled) {
        syncDisplay(editingStart);
        endHistoryInteraction({ commit: false });
      } else {
        preview(parsed === null ? committed : parsed);
        endHistoryInteraction({ commit: true });
      }
      numberEditing = false;
      numberCancelled = false;
    });
    number.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        number.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        numberCancelled = true;
        preview(editingStart);
        number.blur();
      }
    });

    range.addEventListener("pointerdown", () => {
      if (rangeInteraction) return;
      rangeInteraction = true;
      beginHistoryInteraction();
    });
    range.addEventListener("input", () => preview(Number(range.value)));
    const finishRange = () => {
      if (!rangeInteraction) return;
      rangeInteraction = false;
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
      endHistoryInteraction({ commit: true });
    });
    range.addEventListener("blur", () => {
      if (!keyboardInteraction) return;
      keyboardInteraction = false;
      endHistoryInteraction({ commit: true });
    });

    wrap.append(head, body, range);
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

    const shell = document.createElement("div");
    shell.className = "static-numeric-field";
    const row = document.createElement("div");
    row.className = "numeric-control-row static-numeric-row";
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
    reset.textContent = "↺ 원상복귀";
    reset.setAttribute("aria-label", "원래값으로 복귀");
    row.append(minus, number, plus, reset);

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

  function markTextManual(text) {
    text.styleMode = "manual";
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
      customInput.addEventListener("input", () => manual(() => { text.customUnicode = customInput.value; text.unicodeStyle = "custom"; }));
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
    [state.texts[index], state.texts[next]] = [state.texts[next], state.texts[index]];
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
    syncSegmented("imageFit", element.imageFit || "cover");

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
      state.texts.forEach((text) => {
        text.styleMode = "auto";
        textNumericDefaults.delete(text.id);
        text.regionLocked = false;
        text.manualX = null;
        text.manualY = null;
      });
      autoArrangeTexts({ reassign: true, forceStyle: true, announce: true });
      renderTextList();
      queueRender();
    });

    $("addTextBtn").addEventListener("click", () => {
      const text = makeText("새로운 수달 소식\n여기에 문장을 입력하세요", { role: "body", styleMode: "auto" });
      state.texts.push(text);
      state.selectedTextId = text.id;
      autoArrangeTexts({ reassign: true, forceStyle: false });
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
        element[key] = value;
        if (key === "w" || key === "h") element[key] = Math.max(20, element[key]);
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
          if ((item.imageFit || "cover") === "contain") {
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
    const insertBetweenWords=(symbol)=>{
      const out=[];
      body.forEach((item)=>{
        if(/\s/.test(item.ch)) out.push({ch:` ${symbol} `,index:null});
        else out.push(item);
      });
      return out;
    };
    if(text.unicodeStyle==="slash") body=insertBetweenWords("/");
    else if(text.unicodeStyle==="dot") body=insertBetweenWords("·");
    else if(text.unicodeStyle==="star") body=insertBetweenWords("★");
    else if(text.unicodeStyle==="heart") body=insertBetweenWords("♥");
    else if(text.unicodeStyle==="block") body=insertBetweenWords("■");
    else if(text.unicodeStyle==="bullet") body=insertBetweenWords("•");
    else if(text.unicodeStyle==="custom") body=insertBetweenWords(text.customUnicode||"★");
    else if(text.unicodeStyle==="wrapQuote") body=[{ch:"『",index:null},...body,{ch:"』",index:null}];
    else if(text.unicodeStyle==="wrapPhone") body=[{ch:"☎ ",index:null},...body,{ch:" ☎",index:null}];
    else if(text.unicodeStyle==="wrapCard") body=[{ch:"♠ ",index:null},...body,{ch:" ♠",index:null}];
    else if(text.unicodeStyle==="glitch") {
      const marks=["@","*","●","/","₩"];
      const out=[]; let count=0;
      body.forEach((item)=>{out.push(item);if(item.ch.trim() && ++count%3===0)out.push({ch:marks[(count/3-1)%marks.length],index:null});});
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

  function layoutTextLines(c,text,fontSize,maxWidth){
    setTextFont(c,text,fontSize);
    let charStart=0;
    const lines=[];
    text.text.split("\n").forEach((raw)=>{
      lines.push(...wrapDecoratedLine(c,text,raw,charStart,maxWidth));
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


  function drawTokenLine(c,fragment,line,lineIndex,baseColor){
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
    const {bleed}=dimensions();
    targetCtx.save();targetCtx.translate(bleed,bleed);drawTexts(targetCtx,layout.fragments);targetCtx.restore();
    if(guides)drawGuides(targetCtx,layout.fragments);
    if(recordHits){
      layoutFragments=layout.fragments.map((f)=>({id:f.text.id,regionId:f.region.id,x:f.x,y:f.y,w:f.w,h:f.h}));
      regionHitBoxes=state.regions.map((r)=>({id:r.id,x:r.x,y:r.y,w:r.w,h:r.h}));
      elementHitBoxes=state.elements.map((e)=>{const g=elementGeometry(e);return {id:e.id,x:g.x,y:g.y,w:g.w,h:g.h};});
      $("layoutStatus").textContent=layout.overflow?"일부 문장 축소 배치":"영역 안 자동 배치";
      $("layoutStatus").style.color=layout.overflow?"#ffd49a":"#9ef0b5";
    }
  }

  function render(){renderQueued=false;updateCanvasMeta();renderTo(ctx,{guides:true,recordHits:true});}
  function queueRender(){markHistoryDirty(false);if(renderQueued)return;renderQueued=true;requestAnimationFrame(render);}

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
      state.selectedRegionId=id;state.selectedElementId=null;openToolTab("regions");renderRegionList();
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

  function resizeFromHandle(drag,point){
    const source=transformSource(drag.kind,drag.id);
    if(!source)return;
    const {trimW:W,trimH:H}=dimensions();
    const dx=point.x-drag.start.x,dy=point.y-drag.start.y;
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
    source.x=clamp(x,-w*.8,W-w*.05);source.y=clamp(y,-h*.8,H-h*.05);source.w=w;source.h=h;
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
      openToolTab("regions");renderRegionList();updateRegionControls();updateElementControls();queueRender();
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
          source.x=clamp(dragState.orig.x+dx,-dragState.orig.w*.8,W-dragState.orig.w*.05);
          source.y=clamp(dragState.orig.y+dy,-dragState.orig.h*.8,H-dragState.orig.h*.05);
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
    link.download=`otter-jjirasi-v14-${state.orientation}-${Date.now()}.${type}`;
    link.href=out.toDataURL(mime,quality);link.click();
    toast(`${type.toUpperCase()} 파일을 저장했습니다.`);
  }

  function setupColorFields(){
    createColorField("palettePrimaryField",()=>state.palette.primary,(v)=>{state.palette.primary=v;if(state.background.mode==="solid"){state.background.c1=v;state.background.c2=v;}},{allowNone:false,onCommit:()=>{autoStyleAssignedTexts({force:false});renderTextList();renderRegionList();renderTemplateGrid();}});
    createColorField("paletteSecondaryField",()=>state.palette.secondary,(v)=>{state.palette.secondary=v;},{allowNone:false,onCommit:()=>{autoStyleAssignedTexts({force:false});renderTextList();renderRegionList();renderTemplateGrid();}});
    createColorField("paletteTertiaryField",()=>state.palette.tertiary,(v)=>{state.palette.tertiary=v;state.background.patternColor=v;},{allowNone:false,onCommit:()=>{autoStyleAssignedTexts({force:false});renderTextList();renderRegionList();renderTemplateGrid();}});
    createColorField("regionFillField",()=>{const r=selectedRegion();return !r||r.fillNone?"none":resolveColor(r,"fill");},(v)=>{const r=selectedRegion();if(!r)return;if(v==="none")r.fillNone=true;else{r.fillNone=false;r.fill=v;r.fillRole=null;}renderRegionList();});
    createColorField("regionStrokeField",()=>{const r=selectedRegion();return !r||r.strokeNone?"none":resolveColor(r,"stroke");},(v)=>{const r=selectedRegion();if(!r)return;if(v==="none")r.strokeNone=true;else{r.strokeNone=false;r.stroke=v;r.strokeRole=null;}});
    createColorField("regionEffectColorField",()=>{const r=selectedRegion();return r?resolveColor(r,"effectColor"):"#111111";},(v)=>{const r=selectedRegion();if(r){r.effectColor=v;r.effectColorRole=null;}},{allowNone:false});
    createColorField("elementFillField",()=>{const e=selectedElement();return !e||e.fillNone?"none":e.fill;},(v)=>{const e=selectedElement();if(!e)return;if(v==="none")e.fillNone=true;else{e.fillNone=false;e.fill=v;}});
    createColorField("elementStrokeField",()=>{const e=selectedElement();return !e||e.strokeNone?"none":e.stroke;},(v)=>{const e=selectedElement();if(!e)return;if(v==="none")e.strokeNone=true;else{e.strokeNone=false;e.stroke=v;}});
    createColorField("elementEffectColorField",()=>selectedElement()?.effectColor||"#111111",(v)=>{const e=selectedElement();if(e)e.effectColor=v;},{allowNone:false});
    createColorField("elementLabelColorField",()=>selectedElement()?.labelColor||"#111111",(v)=>{const e=selectedElement();if(e)e.labelColor=v;},{allowNone:false});
    createColorField("backgroundColor1Field",()=>state.background.c1,(v)=>state.background.c1=v,{allowNone:false});
    createColorField("backgroundColor2Field",()=>state.background.c2,(v)=>state.background.c2=v,{allowNone:false});
    createColorField("patternColorField",()=>state.background.patternColor,(v)=>state.background.patternColor=v,{allowNone:false});
    createColorField("posterBorderColorField",()=>state.posterBorder.color,(v)=>state.posterBorder.color=v,{allowNone:false});
  }

  enhanceStaticNumericFields();
  bindControls();
  setupColorFields();
  applyTemplate("street-alert",{preserveTexts:false});
  initializeHistory();
  $("showRegions").checked=state.showRegions;
  renderUnicodeGrid("전체","");
  queueRender();
})();
