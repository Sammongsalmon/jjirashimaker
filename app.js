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

  function paletteColor(role, palette) {
    const p = palette || state.palette || { primary: "#ffd400", secondary: "#111111", tertiary: "#0057ff" };
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

  const templateSpecs = [
    {
      id: "label-market",
      name: "큰 제목 · 본문 2칸",
      caption: "제목과 원형 강조, 아래 비대칭 2칸",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("큰 제목", .035, .045, .660, .300, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("원형 강조", .735, .055, .220, .250, { shape:"ellipse", fillRole:"tertiary", strokeNone:true, padding:28, effect:"shadow", effectColor:"#111111", effectSize:10, textRoles:["callout","tag"] }),
        R("큰 본문", .050, .405, .565, .390, { fillRole:"paper", strokeNone:true, radius:30, padding:30, textRoles:["body","bullet"] }),
        R("짧은 강조", .660, .440, .300, .320, { fillRole:"secondary", strokeNone:true, radius:22, padding:28, textRoles:["callout","body"] }),
        R("아래 문구", .055, .840, .885, .105, { fillNone:true, padding:2, textRoles:["footer","tag"] })
      ],
      textSlots:[0,2,1,3,4]
    },
    {
      id: "apothecary-band",
      name: "중앙 띠 · 본문 + 원형",
      caption: "큰 제목 아래 전폭 띠, 본문과 원형 강조",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("큰 제목", .040, .040, .920, .220, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("중앙 띠", 0, .295, 1, .125, { fillRole:"secondary", radius:0, padding:20, textRoles:["callout","tag"] }),
        R("본문 카드", .055, .475, .600, .310, { fillRole:"paper", strokeNone:true, radius:20, padding:30, textRoles:["body","bullet"] }),
        R("원형 강조", .700, .455, .250, .280, { shape:"ellipse", fillRole:"tertiary", strokeNone:true, padding:34, textRoles:["callout","tag"] }),
        R("아래 문구", .055, .835, .890, .105, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,2,3,2,4]
    },
    {
      id: "blue-bulletin",
      name: "큰 카드 · 우측 2칸",
      caption: "왼쪽 큰 카드와 오른쪽 원형·세로 카드",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("제목 카드", .045, .055, .615, .225, { fillRole:"paper", strokeNone:true, radius:32, padding:26, effect:"shadow", effectColor:"#111111", effectSize:9, textRoles:["headline"] }),
        R("본문 카드", .045, .320, .615, .465, { fillRole:"paper", strokeNone:true, radius:28, padding:32, textRoles:["body","bullet"] }),
        R("원형 강조", .705, .065, .245, .255, { shape:"ellipse", fillRole:"tertiary", strokeNone:true, padding:30, textRoles:["callout","tag"] }),
        R("세로 카드", .700, .370, .255, .415, { fillRole:"secondary", strokeNone:true, radius:18, padding:28, textRoles:["body","callout"] }),
        R("아래 문구", .055, .835, .890, .105, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,1,2,1,4]
    },
    {
      id: "phonebook-dense",
      name: "상단 제목 · 3단 정보",
      caption: "전폭 머리말 아래 3단 카드와 하단 문구",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("상단 띠", 0, .040, 1, .125, { fillRole:"secondary", radius:0, padding:20, textRoles:["headline","callout"] }),
        R("왼쪽 정보", .040, .225, .290, .430, { fillRole:"paper", strokeNone:true, radius:10, padding:24, textRoles:["body","bullet"] }),
        R("가운데 강조", .355, .225, .290, .430, { fillRole:"tertiary", strokeNone:true, radius:10, padding:24, textRoles:["callout","body"] }),
        R("오른쪽 정보", .670, .225, .290, .430, { fillRole:"paper", strokeNone:true, radius:10, padding:24, textRoles:["body","bullet"] }),
        R("하단 문구", .055, .770, .890, .150, { fillNone:true, padding:2, textRoles:["footer","tag"] })
      ],
      textSlots:[0,1,2,3,4]
    },
    {
      id: "coupon-strip",
      name: "제목 · 가로 카드 3줄",
      caption: "큰 제목 아래 서로 다른 길이의 카드 3개",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("큰 제목", .045, .045, .900, .190, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("첫 카드", .055, .285, .730, .130, { fillRole:"paper", strokeNone:true, radius:20, padding:18, textRoles:["body","callout"] }),
        R("둘째 카드", .180, .465, .765, .130, { fillRole:"tertiary", strokeNone:true, radius:20, padding:18, textRoles:["callout","bullet"] }),
        R("셋째 카드", .055, .645, .625, .130, { fillRole:"paper", strokeNone:true, radius:20, padding:18, textRoles:["body","tag"] }),
        R("아래 문구", .560, .820, .390, .110, { fillNone:true, padding:2, textRoles:["footer","tag"] })
      ],
      textSlots:[0,1,2,3,4]
    },
    {
      id: "five-elements",
      name: "세로 제목 · 카드 + 타원",
      caption: "왼쪽 세로판, 오른쪽 제목·본문·타원",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("세로 제목", .030, .045, .205, .875, { fillRole:"secondary", strokeNone:true, radius:0, padding:24, textRoles:["headline","tag"] }),
        R("상단 제목", .275, .055, .680, .220, { fillRole:"paper", strokeNone:true, radius:24, padding:26, textRoles:["headline"] }),
        R("본문 카드", .275, .335, .445, .390, { fillRole:"paper", strokeNone:true, radius:22, padding:30, textRoles:["body","bullet"] }),
        R("타원 강조", .755, .350, .215, .280, { shape:"ellipse", fillRole:"tertiary", strokeNone:true, padding:28, textRoles:["callout","tag"] }),
        R("아래 문구", .300, .795, .650, .120, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[1,2,3,0,4]
    },
    {
      id: "earth-shock",
      name: "중앙 폭발 · 좌우 설명",
      caption: "뾰족 말풍선 중심의 3열 충격 구성",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("상단 제목", .035, .040, .930, .225, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("왼쪽 설명", .045, .330, .270, .330, { fillNone:true, padding:6, textRoles:["body","bullet"] }),
        R("중앙 폭발", .340, .300, .330, .370, { shape:"burst", fillRole:"paper", strokeRole:"secondary", strokeWidth:5, strokeNone:false, padding:44, effect:"shadow", effectColor:"#111111", effectSize:12, textRoles:["callout","tag"] }),
        R("오른쪽 설명", .695, .330, .260, .330, { fillNone:true, padding:6, textRoles:["body","bullet"] }),
        R("아래 큰 문구", .055, .760, .890, .170, { fillNone:true, padding:2, textRoles:["footer","callout"] })
      ],
      textSlots:[0,1,2,3,4]
    },
    {
      id: "plain-rule",
      name: "한 줄 구분 · 본문 + 원형",
      caption: "얇은 선 하나로 제목과 내용을 나눈 기본형",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("큰 제목", .045, .055, .910, .245, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("구분선", .040, .345, .920, .025, { shape:"line", fillRole:"secondary", acceptText:false, radius:0, padding:0 }),
        R("본문", .055, .425, .560, .350, { fillNone:true, padding:8, textRoles:["body","bullet"] }),
        R("원형 강조", .680, .410, .265, .300, { shape:"ellipse", fillRole:"tertiary", strokeNone:true, padding:34, textRoles:["callout","tag"] }),
        R("짧은 보조", .620, .760, .330, .105, { fillRole:"secondary", strokeNone:true, radius:0, padding:18, textRoles:["tag","footer"] }),
        R("아래 문구", .055, .835, .480, .090, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,1,2,1,4]
    },
    {
      id: "round-card",
      name: "큰 카드 · 우측 배지",
      caption: "한 장짜리 큰 카드와 오른쪽 강조 2칸",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("큰 카드 제목", .060, .070, .610, .220, { fillRole:"paper", strokeNone:true, radius:40, padding:32, effect:"shadow", effectColor:"#111111", effectSize:11, textRoles:["headline"] }),
        R("큰 카드 본문", .060, .275, .610, .500, { fillRole:"paper", strokeNone:true, radius:40, padding:36, textRoles:["body","bullet"] }),
        R("우측 어두운 카드", .710, .160, .245, .285, { fillRole:"secondary", strokeNone:true, radius:26, padding:28, textRoles:["callout","body"] }),
        R("우측 원형", .725, .530, .220, .245, { shape:"ellipse", fillRole:"tertiary", strokeNone:true, padding:28, textRoles:["tag","callout"] }),
        R("아래 문구", .080, .845, .860, .095, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,1,2,1,4]
    },
    {
      id: "sticker-chaos",
      name: "겹친 원 · 카드 2개",
      caption: "배경 원과 비대칭 카드가 겹치는 구성",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("배경 큰 원", -.070, .065, .290, .330, { shape:"ellipse", fillRole:"tertiary", acceptText:false, strokeNone:true, padding:0 }),
        R("상단 제목", .105, .055, .735, .230, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("작은 원", .790, .055, .195, .215, { shape:"ellipse", fillRole:"paper", strokeNone:true, padding:24, textRoles:["tag","callout"] }),
        R("왼쪽 카드", .055, .365, .555, .355, { fillRole:"paper", strokeNone:true, radius:18, padding:30, textRoles:["body","bullet"] }),
        R("오른쪽 카드", .650, .345, .300, .340, { fillRole:"tertiary", strokeNone:true, radius:18, padding:28, textRoles:["callout","body"] }),
        R("아래 문구", .420, .800, .530, .120, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,2,1,3,4]
    },
    {
      id: "shop-window",
      name: "큰 머리말 · 본문 + 보조 2칸",
      caption: "큰 머리말 아래 본문과 작은 카드 2개",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("큰 머리말", .045, .045, .910, .170, { fillNone:true, padding:2, textRoles:["headline","callout"] }),
        R("큰 본문", .060, .255, .580, .520, { fillRole:"paper", strokeNone:true, radius:8, padding:36, textRoles:["body","bullet"] }),
        R("오른쪽 위", .680, .255, .275, .225, { fillRole:"tertiary", strokeNone:true, radius:16, padding:26, textRoles:["callout","tag"] }),
        R("오른쪽 아래", .680, .545, .275, .230, { fillRole:"secondary", strokeNone:true, radius:16, padding:26, textRoles:["body","callout"] }),
        R("아래 문구", .065, .835, .880, .100, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,1,2,1,4]
    },
    {
      id: "notice-split",
      name: "제목 · 본문 + 목록",
      caption: "넓은 제목과 본문, 오른쪽 목록 카드",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("넓은 제목", .040, .050, .700, .240, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("상단 작은 카드", .765, .055, .195, .235, { fillRole:"secondary", strokeNone:true, radius:16, padding:22, textRoles:["tag","callout"] }),
        R("본문 카드", .055, .355, .625, .395, { fillRole:"paper", strokeNone:true, radius:22, padding:32, textRoles:["body","bullet"] }),
        R("목록 카드", .720, .355, .240, .395, { fillRole:"tertiary", strokeNone:true, radius:22, padding:26, textRoles:["bullet","body"] }),
        R("아래 문구", .055, .825, .890, .110, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,2,1,3,4]
    },
    {
      id: "memo-badge",
      name: "제목 · 원형 + 메모 2칸",
      caption: "상단 제목과 큰 배지, 아래 메모 카드 2개",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("상단 제목", .045, .050, .575, .245, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("큰 원형", .660, .045, .300, .310, { shape:"ellipse", fillRole:"secondary", strokeNone:true, padding:38, textRoles:["callout","tag"] }),
        R("왼쪽 메모", .060, .380, .550, .390, { fillRole:"paper", strokeNone:true, radius:20, padding:32, textRoles:["body","bullet"] }),
        R("오른쪽 메모", .660, .415, .300, .355, { fillRole:"tertiary", strokeNone:true, radius:20, padding:30, textRoles:["callout","body"] }),
        R("아래 문구", .055, .835, .890, .100, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,2,1,3,4]
    },
    {
      id: "black-zine",
      name: "중앙 띠 · 기사 2칸",
      caption: "밝은 제목 카드와 중앙 띠, 아래 기사 2개",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#ffffff", width:0, radius:0 },
      regions: [
        R("제목 카드", .040, .045, .920, .235, { fillRole:"paper", strokeNone:true, radius:18, padding:28, textRoles:["headline"] }),
        R("중앙 띠", 0, .335, 1, .125, { fillRole:"secondary", radius:0, padding:22, textRoles:["callout","tag"] }),
        R("왼쪽 기사", .050, .520, .405, .275, { fillRole:"tertiary", strokeNone:true, radius:14, padding:26, textRoles:["body","bullet"] }),
        R("오른쪽 기사", .500, .520, .450, .275, { fillRole:"paper", strokeNone:true, radius:14, padding:26, textRoles:["body","callout"] }),
        R("아래 문구", .055, .845, .890, .095, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,2,1,3,4]
    },
    {
      id: "stamp-bottom",
      name: "제목 · 본문 + 큰 원",
      caption: "넓은 제목 아래 본문과 대형 원형 강조",
      bg: { mode:"solid", role:"primary", pattern:"none", scale:48 },
      border: { enabled:false, color:"#111111", width:0, radius:0 },
      regions: [
        R("넓은 제목", .035, .045, .930, .250, { fillNone:true, padding:2, textRoles:["headline"] }),
        R("본문 카드", .055, .365, .545, .350, { fillRole:"paper", strokeNone:true, radius:24, padding:30, textRoles:["body","bullet"] }),
        R("큰 원형", .635, .340, .320, .355, { shape:"ellipse", fillRole:"tertiary", strokeNone:true, padding:38, textRoles:["callout","tag"] }),
        R("짧은 강조", .085, .735, .390, .115, { fillRole:"secondary", strokeNone:true, radius:0, padding:20, textRoles:["callout","tag"] }),
        R("아래 큰 문구", .035, .855, .930, .100, { fillNone:true, padding:2, textRoles:["footer"] })
      ],
      textSlots:[0,1,2,1,4]
    }
  ];
  function makeText(text, overrides = {}) {
    return {
      id: uid(), text, regionId: null, order: 0, role: "body",
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
    templateId: "label-market",
    palette: { primary: "#ffd400", secondary: "#111111", tertiary: "#0057ff" },
    background: { mode:"solid", c1:"#ffd400", c2:"#ffd400", pattern:"dots", patternColor:"#111111", angle:0, scale:48 },
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

  const HISTORY_LIMIT = 80;
  let historyPast = [];
  let historyFuture = [];
  let historyLastSnapshot = "";
  let historyTimer = null;
  let historyReady = false;
  let historyRestoring = false;

  function snapshotState() {
    return JSON.stringify(state);
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

  function markHistoryDirty(immediate = false) {
    if (!historyReady || historyRestoring) return;
    clearTimeout(historyTimer);
    if (immediate) commitHistorySnapshot();
    else historyTimer = setTimeout(commitHistorySnapshot, 520);
  }

  function restoreHistorySnapshot(snapshot) {
    historyRestoring = true;
    try {
      state = JSON.parse(snapshot);
      layoutFragments = [];
      regionHitBoxes = [];
      elementHitBoxes = [];
      dragState = null;
      transformTarget = null;
      pendingLongPress = null;
      if (autoArrangeTimer) clearTimeout(autoArrangeTimer);
      refreshAllUI();
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
    return region;
  }

  const ROLE_STYLE_DEFAULTS = {
    headline: { fontFamily:"dotum", fontSize:78, align:"left", bold:true, italic:false, lineHeight:1.02, scaleX:.95, letterSpacing:-3, effect:"outline", outlineWidth:2, colorMode:"auto", gap:8 },
    bullet: { fontFamily:"dotum", fontSize:44, align:"left", bold:true, italic:false, lineHeight:1.12, scaleX:1, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:8 },
    callout: { fontFamily:"dotum", fontSize:42, align:"center", bold:true, italic:false, lineHeight:1.04, scaleX:.98, letterSpacing:-1, effect:"outline", outlineWidth:1, colorMode:"auto", gap:6 },
    body: { fontFamily:"dotum", fontSize:50, align:"left", bold:true, italic:false, lineHeight:1.06, scaleX:.98, letterSpacing:-2, effect:"none", outlineWidth:2, colorMode:"auto", gap:8 },
    footer: { fontFamily:"batang", fontSize:40, align:"center", bold:true, italic:false, lineHeight:1.04, scaleX:.98, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:6 },
    tag: { fontFamily:"dotum", fontSize:30, align:"center", bold:true, italic:false, lineHeight:1.04, scaleX:1, letterSpacing:0, effect:"none", outlineWidth:2, colorMode:"auto", gap:6 }
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
    const facts = textFacts(text);
    if (facts.hasContact) return "footer";
    if (facts.hasBullet) return "bullet";
    if (index === 0 && facts.compact >= 14) return "headline";
    if (facts.compact <= 10) return "tag";
    if (facts.compact <= 26 && facts.lines.length <= 2) return "callout";
    if (facts.lines.length >= 3 && facts.compact <= 70) return "bullet";
    if (index === 0) return "headline";
    return "body";
  }

  function regionTextScore(region, role, facts, occupied) {
    const box = regionContentBox(region);
    const area = box.w * box.h;
    const aspect = box.w / Math.max(1, box.h);
    const potential = Math.sqrt(area / Math.max(5, facts.compact + facts.lines.length * 5));
    const roleTarget = { headline: 100, body: 56, bullet: 50, callout: 72, footer: 48, tag: 62 }[role] || 54;
    let score = 80 - Math.abs(potential - roleTarget) * .34;
    const hints = region.textRoles || [];
    if (hints.includes(role)) score += 76 - hints.indexOf(role) * 9;
    if (region.shape === "ellipse" || region.shape === "burst") {
      score += ["callout", "tag"].includes(role) ? 48 : -92;
      if (facts.compact > 34) score -= 78;
      if (occupied > 0) score -= 240 * occupied;
    }
    if (aspect > 4.2) score += ["headline", "footer", "tag", "callout"].includes(role) ? 32 : -24;
    if (aspect < .78) score += ["tag", "footer", "callout"].includes(role) ? 18 : -20;
    if (role === "body" && area > 170000) score += 20;
    if (role === "headline" && (region.y < dimensions().trimH * .34 || area > 180000)) score += 18;
    if (role === "footer" && region.y > dimensions().trimH * .62) score += 24;
    score += (Number(region.emphasis) || 1) * 14;
    const occupancyPenalty = area > 260000 ? 48 : area > 190000 ? 96 : 172;
    score -= occupied * occupancyPenalty;
    if (occupied > 0 && area < 190000) score -= 220 * occupied;
    if (occupied > 0 && aspect > 4.2) score -= 190 * occupied;
    return score;
  }

  function autoDecoration(text, role, region) {
    const facts = textFacts(text);
    const seed = hashString(`${text.id}:${facts.raw}`);
    const regionBg = region.fillNone ? state.background.c1 : resolveColor(region, "fill");
    const baseColor = contrastText(regionBg);
    const opposite = luminance(baseColor) > .5 ? mix(state.palette.secondary, "#000000", .18) : mix(state.palette.tertiary, "#ffffff", .18);
    text.bold = role !== "footer" || seed % 3 !== 0;
    text.italic = role === "callout" && seed % 5 === 0;
    text.underline = false;
    text.strike = false;
    text.colorMode = "auto";
    text.effectColor = opposite;
    text.prefixEnabled = false;
    text.prefixGap = 10;
    text.customUnicode = ["★", "※", "◆", "☎"][seed % 4];

    if (role === "headline") {
      text.fontFamily = "dotum";
      text.align = region.w / Math.max(1, region.h) > 3.6 ? "center" : "left";
      text.lineHeight = facts.lines.length > 1 ? .98 : .92;
      text.scaleX = facts.compact < 18 ? 1.08 : .96;
      text.letterSpacing = facts.compact < 18 ? -1 : -3;
      text.unicodeStyle = facts.compact <= 18 && facts.words >= 2 ? (seed % 2 ? "slash" : "dot") : "none";
      text.effect = facts.compact <= 48 ? "extrude" : "outline";
      text.outlineWidth = facts.compact <= 24 ? 11 : 5;
    } else if (role === "callout") {
      text.fontFamily = "dotum";
      text.align = "center";
      text.lineHeight = .98;
      text.scaleX = facts.compact <= 12 ? 1.12 : 1;
      text.letterSpacing = facts.compact <= 12 ? 0 : -1;
      text.unicodeStyle = ["wrapQuote", "wrapCard", "custom"][seed % 3];
      text.effect = ["extrude", "outline", "hollow"][seed % 3];
      text.outlineWidth = text.effect === "extrude" ? 9 : 3;
    } else if (role === "tag") {
      text.fontFamily = seed % 3 === 0 ? "batang" : "dotum";
      text.align = "center";
      text.lineHeight = .94;
      text.scaleX = 1.12;
      text.letterSpacing = 0;
      text.unicodeStyle = ["wrapQuote", "wrapPhone", "custom"][seed % 3];
      text.effect = seed % 2 ? "extrude" : "outline";
      text.outlineWidth = text.effect === "extrude" ? 8 : 3;
    } else if (role === "bullet") {
      text.fontFamily = "dotum";
      text.align = "left";
      text.lineHeight = 1.08;
      text.scaleX = .99;
      text.letterSpacing = -1;
      text.unicodeStyle = "none";
      text.prefixEnabled = !facts.hasBullet;
      text.prefixSymbol = ["•", "■", "★", "♥"][seed % 4];
      text.effect = region.fillNone ? "outline" : "none";
      text.outlineWidth = 2;
    } else if (role === "footer") {
      text.fontFamily = seed % 2 ? "batang" : "dotum";
      text.align = "center";
      text.lineHeight = .98;
      text.scaleX = 1;
      text.letterSpacing = -1;
      text.unicodeStyle = /☎|☏|✆/.test(facts.raw) ? "none" : "wrapPhone";
      text.effect = "outline";
      text.outlineWidth = 2;
    } else {
      text.fontFamily = seed % 5 === 0 ? "batang" : "dotum";
      text.align = "left";
      text.lineHeight = facts.lines.length >= 3 ? 1.10 : 1.04;
      text.scaleX = .98;
      text.letterSpacing = -2;
      text.unicodeStyle = "none";
      text.effect = "none";
      text.outlineWidth = 2;
    }
  }

  function fitTextFontSize(c, text, box, targetHeight, role, emphasis = 1) {
    const caps = { headline: 210, callout: 180, tag: 150, bullet: 90, footer: 112, body: 96 };
    let low = 12;
    let high = Math.max(18, Math.min(caps[role] || 100, box.h * .92, box.w * .48) * clamp(emphasis, .76, 1.4));
    const fits = (size) => {
      const lines = layoutTextLines(c, text, size, box.w);
      const height = Math.max(size * text.lineHeight, lines.length * size * text.lineHeight);
      const widest = Math.max(1, ...lines.map((line) => line.width * text.scaleX));
      return height <= targetHeight + 1 && widest <= box.w + 1;
    };
    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid; else high = mid;
    }
    return Math.max(12, Math.floor(low));
  }

  function autoStyleAssignedTexts({ force = false } = {}) {
    const groups = new Map();
    state.texts.forEach((text, index) => {
      text.autoRole = inferTextRole(text, index);
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
        const factor = { headline: 1.34, callout: 1.14, tag: .88, bullet: 1.02, footer: .82, body: 1.16 }[role] || 1;
        const shortBoost = facts.compact <= 14 ? 1.34 : facts.compact <= 26 ? 1.16 : 1;
        return clamp(Math.sqrt(facts.compact + 8) * factor * shortBoost, 2.5, 14);
      });
      const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
      const gapBudget = Math.max(0, styled.length - 1) * 10;
      styled.forEach((text, index) => {
        const role = text.autoRole || "body";
        autoDecoration(text, role, region);
        const targetHeight = styled.length === 1
          ? box.h
          : Math.max(36, (box.h - gapBudget) * weights[index] / totalWeight);
        const facts = textFacts(text);
        const emphasis = (Number(region.emphasis) || 1) * (facts.compact <= 14 ? 1.18 : 1);
        text.fontSize = fitTextFontSize(sceneCtx, text, box, targetHeight, role, emphasis);
        text.gap = Math.round(clamp(text.fontSize * .14, 5, 20));
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
        const priority = ({ footer: 170, headline: 160, bullet: 130, body: 120, callout: 110, tag: 105 }[role] || 100) + facts.compact;
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

  function assignTextsToTemplate(spec, { restyle = false } = {}) {
    state.texts.forEach((text, index) => {
      if (!text.styleMode) text.styleMode = "auto";
      text.role = inferTextRole(text, index);
      text.autoRole = text.role;
      text.regionLocked = false;
      text.manualX = null;
      text.manualY = null;
    });
    autoArrangeTexts({ reassign: true, forceStyle: restyle });
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
    state.posterBorder = spec.border
      ? { enabled:Boolean(spec.border.enabled), color:spec.border.color || state.palette.secondary || "#111111", width:Number(spec.border.width) || 0, radius:Number(spec.border.radius) || 0 }
      : { enabled:false, color:state.palette.secondary || "#111111", width:0, radius:0 };
    state.selectedRegionId = null;
    state.selectedElementId = null;

    const resetTexts = !preserveTexts || !state.texts.length;
    if (resetTexts) {
      state.texts = [
        makeText(`수달이 왜 이렇게 귀엽냐는 질문에
과학계는 아직 답을 못했습니다`, { role:"headline", ...ROLE_STYLE_DEFAULTS.headline }),
        makeText(`•물 위에 둥둥
•배 위에는 조개
•마음에는 입덕`, { role:"bullet", ...ROLE_STYLE_DEFAULTS.bullet }),
        makeText(`전/국/수/달/긴/급/속/보
귀여움 기준치 초과`, { role:"callout", ...ROLE_STYLE_DEFAULTS.callout }),
        makeText(`오늘도 수달은 아무것도 안 했지만
이미 홍보에 성공했습니다`, { role:"body", ...ROLE_STYLE_DEFAULTS.body }),
        makeText("☎ 입덕 상담은 지금 바로 ☎", { role:"footer", unicodeStyle:"none", ...ROLE_STYLE_DEFAULTS.footer })
      ];
    }

    assignTextsToTemplate(spec, { restyle: resetTexts });
    if (!state.texts.some((t) => t.id === state.selectedTextId)) state.selectedTextId = state.texts[0]?.id || null;
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
      button.className = `region-chip${state.selectedRegionId === region.id ? " active" : ""}`;
      const color = region.fillNone ? "transparent" : resolveColor(region, "fill");
      button.innerHTML = `<span class="region-dot"></span>${index + 1}. ${region.name}`;
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

  function rangeControl(labelText, value, min, max, step, formatter, onInput) {
    const label = document.createElement("label");
    const b = document.createElement("b");
    b.textContent = formatter(value);
    label.append(document.createTextNode(`${labelText} `), b);
    const input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    input.addEventListener("input", () => { b.textContent = formatter(Number(input.value)); onInput(Number(input.value)); queueRender(); });
    input.addEventListener("pointerup", () => markHistoryDirty(true));
    input.addEventListener("change", () => markHistoryDirty(true));
    label.append(input);
    return label;
  }

  function numericStepperControl(labelText, value, min, max, step, formatter, onInput) {
    const wrap = document.createElement("div");
    wrap.className = "numeric-stepper";
    const head = document.createElement("div");
    head.className = "numeric-stepper-head";
    const title = document.createElement("span");
    title.textContent = labelText;
    const readout = document.createElement("b");
    head.append(title, readout);

    const body = document.createElement("div");
    body.className = "numeric-stepper-body";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "step-button";
    minus.textContent = "−";
    minus.title = `${labelText} 줄이기`;
    const number = document.createElement("input");
    number.type = "number";
    number.min = min;
    number.max = max;
    number.step = step;
    number.inputMode = "decimal";
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "step-button";
    plus.textContent = "+";
    plus.title = `${labelText} 키우기`;
    body.append(minus, number, plus);

    const range = document.createElement("input");
    range.type = "range";
    range.min = min;
    range.max = max;
    range.step = step;

    const normalize = (next) => {
      const numeric = Number(next);
      const fallback = Number(value) || min;
      const clamped = clamp(Number.isFinite(numeric) ? numeric : fallback, min, max);
      const steps = Math.round((clamped - min) / step);
      const fixed = min + steps * step;
      return step < 1 ? Number(fixed.toFixed(2)) : Math.round(fixed);
    };
    let committed = normalize(value);
    let editingStart = committed;
    const syncDisplay = (next) => {
      committed = normalize(next);
      number.value = String(committed);
      range.value = String(committed);
      readout.textContent = formatter(committed);
      return committed;
    };
    const preview = (next) => {
      const fixed = normalize(next);
      range.value = String(fixed);
      readout.textContent = formatter(fixed);
      onInput(fixed);
      queueRender();
      return fixed;
    };
    syncDisplay(committed);

    minus.addEventListener("click", () => {
      const fixed = syncDisplay(committed - step);
      onInput(fixed);
      queueRender();
      markHistoryDirty(true);
    });
    plus.addEventListener("click", () => {
      const fixed = syncDisplay(committed + step);
      onInput(fixed);
      queueRender();
      markHistoryDirty(true);
    });
    number.addEventListener("focus", () => { editingStart = committed; });
    number.addEventListener("input", () => {
      const raw = number.value.trim();
      if (raw === "" || raw === "-" || raw === "." || raw === "-.") return;
      if (!Number.isFinite(Number(raw))) return;
      preview(Number(raw));
    });
    number.addEventListener("change", () => {
      const raw = number.value.trim();
      const fixed = syncDisplay(raw === "" ? committed : Number(raw));
      onInput(fixed);
      queueRender();
      markHistoryDirty(true);
    });
    number.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); number.blur(); }
      if (event.key === "Escape") {
        event.preventDefault();
        const fixed = syncDisplay(editingStart);
        onInput(fixed);
        queueRender();
        number.blur();
      }
    });
    range.addEventListener("input", () => {
      const fixed = syncDisplay(Number(range.value));
      onInput(fixed);
      queueRender();
    });
    range.addEventListener("pointerup", () => markHistoryDirty(true));
    range.addEventListener("change", () => markHistoryDirty(true));

    wrap.append(head, body, range);
    return wrap;
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
    return ({ none: "효과 없음", outline: "외곽선", shadow: "그림자", hollow: "빈 그림자", extrude: "입체" })[value] || "효과 없음";
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
      const fontSize = numericStepperControl("크기", text.fontSize, 12, 300, 1, (value) => `${Math.round(value)}px`, (value) => manual(() => { text.fontSize = clamp(Number(value), 12, 300); }));
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
      const lineHeight = rangeControl("줄 간격", text.lineHeight, .8, 1.8, .02, (value) => `${value.toFixed(2)}배`, (value) => manual(() => { text.lineHeight = value; }));
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
        rangeControl("글자 폭", text.scaleX * 100, 50, 180, 1, (value) => `${Math.round(value)}%`, (value) => manual(() => { text.scaleX = value / 100; })),
        rangeControl("자간", text.letterSpacing, -12, 36, 1, (value) => String(value), (value) => manual(() => { text.letterSpacing = value; })),
        rangeControl("줄 앞 간격", text.prefixGap, 0, 60, 1, (value) => String(value), (value) => manual(() => { text.prefixGap = value; }))
      );
      settingsBody.append(row3);

      const row4 = document.createElement("div"); row4.className = "field-grid three";
      const effect = makeSelect([["none", "없음"], ["outline", "외곽선"], ["shadow", "그림자"], ["hollow", "빈 그림자"], ["extrude", "입체"]], text.effect);
      effect.addEventListener("change", () => manual(() => { text.effect = effect.value; }));
      const outline = document.createElement("input"); outline.type = "number"; outline.min = 0; outline.max = 48; outline.value = text.outlineWidth;
      outline.addEventListener("input", () => manual(() => { text.outlineWidth = Number(outline.value); }));
      const gap = document.createElement("input"); gap.type = "number"; gap.min = 0; gap.max = 120; gap.value = text.gap;
      gap.addEventListener("input", () => manual(() => { text.gap = Number(gap.value); }));
      row4.append(labeledControl("효과", effect), labeledControl("효과 두께", outline), labeledControl("문장 아래 여백", gap));
      settingsBody.append(row4);

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
      colorFields.forEach((field) => field.update());
      return;
    }
    const active = transformTarget?.kind === "region" && transformTarget.id === region.id;
    $("selectedRegionName").textContent = region.name;
    $("selectedRegionBadge").textContent = active ? "캔버스 조작 중" : (region.acceptText ? "문장 영역" : "장식 영역");
    $("toggleRegionTransformBtn").textContent = active ? "핸들 닫기" : "핸들 열기";
    $("regionX").value = round(region.x); $("regionY").value = round(region.y);
    $("regionW").value = round(region.w); $("regionH").value = round(region.h);
    $("regionShape").value = region.shape;
    $("regionRadius").value = region.radius; $("regionRadiusValue").textContent = round(region.radius);
    $("regionPadding").value = region.padding; $("regionPaddingValue").textContent = round(region.padding);
    $("regionStrokeWidth").value = region.strokeWidth;
    $("regionRotation").value = region.rotation; $("regionRotationValue").textContent = `${round(region.rotation)}°`;
    syncSegmented("regionAcceptText", region.acceptText ? "yes" : "no");
    $("regionEffect").value = region.effect; $("regionEffectSize").value = region.effectSize;
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
      colorFields.forEach((field) => field.update());
      return;
    }
    const labels = { rect:"사각형", band:"띠", circle:"원형", heart:"하트", burst:"뾰족 말풍선", image:"사진" };
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

    ["regionX", "regionY", "regionW", "regionH"].forEach((id) => bindValue(id, () => 0, (value) => {
      const region = selectedRegion();
      if (!region) return;
      const key = { regionX: "x", regionY: "y", regionW: "w", regionH: "h" }[id];
      region[key] = value;
      if (key === "w" || key === "h") region[key] = Math.max(20, region[key]);
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
    $("bleedMm").addEventListener("change", () => { state.bleedMm = Number($("bleedMm").value); updateCanvasMeta(); queueRender(); });
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
      transformTarget = null;
      applyTemplate("label-market", { preserveTexts: false });
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
    state.regions.forEach((r)=>{r.x*=sx;r.y*=sy;r.w*=sx;r.h*=sy;r.padding*=Math.min(sx,sy);});
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

  function applyShapeEffect(c, item) {
    if (item.effect === "shadow") {
      c.shadowColor = item.effectColor || "#111111";
      c.shadowBlur = Math.max(0, item.effectSize * .35);
      c.shadowOffsetX = item.effectSize * .55;
      c.shadowOffsetY = item.effectSize * .55;
    } else if (item.effect === "glow") {
      c.shadowColor = item.effectColor || "#ffffff";
      c.shadowBlur = item.effectSize;
      c.shadowOffsetX = 0;
      c.shadowOffsetY = 0;
    }
  }

  function drawShapeExtrusion(c, item) {
    if (item.effect !== "extrude") return;
    const depth = clamp(Number(item.effectSize) || 16, 3, 70);
    const step = depth > 34 ? 2 : 1;
    const base = item.effectColor || "#111111";
    c.save();
    c.shadowColor = "rgba(0,0,0,.42)";
    c.shadowBlur = Math.max(4, depth * .42);
    c.shadowOffsetX = depth * .74;
    c.shadowOffsetY = depth * .78;
    c.translate(depth * .62, depth * .62);
    shapePath(c, item);
    c.fillStyle = mix(base, "#000000", .30);
    c.fill();
    c.restore();
    for (let offset = depth; offset >= 1; offset -= step) {
      const ratio = offset / depth;
      c.save();
      c.translate(offset * .58, offset * .58);
      shapePath(c, item);
      c.fillStyle = mix(base, "#000000", .10 + ratio * .22);
      c.fill();
      if (!item.strokeNone && item.strokeWidth > 0) {
        shapePath(c, item);
        c.strokeStyle = mix(base, "#000000", .32);
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
          c.strokeStyle = region.effectColor;
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
      applyShapeEffect(c, item);
      if (item.effect === "hollow") {
        c.save();
        c.translate(item.effectSize * .45, item.effectSize * .45);
        shapePath(c, item);
        c.strokeStyle = item.effectColor;
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
      let cursorY=centerSingle?box.y+Math.max(0,(box.h-groupHeight)/2):box.y;

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
      c.save();
      c.shadowColor="rgba(0,0,0,.48)";
      c.shadowBlur=Math.max(3,depth*.65);
      c.shadowOffsetX=depth*.84;
      c.shadowOffsetY=depth*.9;
      drawGlyphs(depth*.62,depth*.62,mix(text.effectColor||"#111111","#000000",.28));
      c.restore();
      const step=depth>24?2:1;
      for(let offset=depth;offset>=1;offset-=step){
        const ratio=offset/depth;
        drawGlyphs(offset*.58,offset*.58,mix(text.effectColor||"#111111","#000000",.08+ratio*.22));
      }
    }else if(effect==="shadow"){
      c.save();
      c.shadowColor=text.effectColor;
      c.shadowBlur=Math.max(0,thickness*.9);
      c.shadowOffsetX=thickness*1.4;
      c.shadowOffsetY=thickness*1.4;
      drawGlyphs();
      c.restore();
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
      if(dragState.kind==="region")autoStyleAssignedTexts({force:false});
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
    dragState=null;renderRegionList();updateRegionControls();updateElementControls();queueRender();markHistoryDirty(true);
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
    link.download=`otter-jjirasi-${state.orientation}-${Date.now()}.${type}`;
    link.href=out.toDataURL(mime,quality);link.click();
    toast(`${type.toUpperCase()} 파일을 저장했습니다.`);
  }

  function setupColorFields(){
    createColorField("palettePrimaryField",()=>state.palette.primary,(v)=>{state.palette.primary=v;if(state.background.mode==="solid"){state.background.c1=v;state.background.c2=v;}},{allowNone:false,onCommit:()=>{renderRegionList();renderTemplateGrid();}});
    createColorField("paletteSecondaryField",()=>state.palette.secondary,(v)=>{state.palette.secondary=v;},{allowNone:false,onCommit:()=>{renderRegionList();renderTemplateGrid();}});
    createColorField("paletteTertiaryField",()=>state.palette.tertiary,(v)=>{state.palette.tertiary=v;state.background.patternColor=v;},{allowNone:false,onCommit:()=>{renderRegionList();renderTemplateGrid();}});
    createColorField("regionFillField",()=>{const r=selectedRegion();return !r||r.fillNone?"none":resolveColor(r,"fill");},(v)=>{const r=selectedRegion();if(!r)return;if(v==="none")r.fillNone=true;else{r.fillNone=false;r.fill=v;r.fillRole=null;}renderRegionList();});
    createColorField("regionStrokeField",()=>{const r=selectedRegion();return !r||r.strokeNone?"none":resolveColor(r,"stroke");},(v)=>{const r=selectedRegion();if(!r)return;if(v==="none")r.strokeNone=true;else{r.strokeNone=false;r.stroke=v;r.strokeRole=null;}});
    createColorField("regionEffectColorField",()=>selectedRegion()?.effectColor||"#111111",(v)=>{const r=selectedRegion();if(r)r.effectColor=v;},{allowNone:false});
    createColorField("elementFillField",()=>{const e=selectedElement();return !e||e.fillNone?"none":e.fill;},(v)=>{const e=selectedElement();if(!e)return;if(v==="none")e.fillNone=true;else{e.fillNone=false;e.fill=v;}});
    createColorField("elementStrokeField",()=>{const e=selectedElement();return !e||e.strokeNone?"none":e.stroke;},(v)=>{const e=selectedElement();if(!e)return;if(v==="none")e.strokeNone=true;else{e.strokeNone=false;e.stroke=v;}});
    createColorField("elementEffectColorField",()=>selectedElement()?.effectColor||"#111111",(v)=>{const e=selectedElement();if(e)e.effectColor=v;},{allowNone:false});
    createColorField("elementLabelColorField",()=>selectedElement()?.labelColor||"#111111",(v)=>{const e=selectedElement();if(e)e.labelColor=v;},{allowNone:false});
    createColorField("backgroundColor1Field",()=>state.background.c1,(v)=>state.background.c1=v,{allowNone:false});
    createColorField("backgroundColor2Field",()=>state.background.c2,(v)=>state.background.c2=v,{allowNone:false});
    createColorField("patternColorField",()=>state.background.patternColor,(v)=>state.background.patternColor=v,{allowNone:false});
    createColorField("posterBorderColorField",()=>state.posterBorder.color,(v)=>state.posterBorder.color=v,{allowNone:false});
  }

  bindControls();
  setupColorFields();
  applyTemplate("label-market",{preserveTexts:false});
  initializeHistory();
  $("showRegions").checked=state.showRegions;
  renderUnicodeGrid("전체","");
  queueRender();
})();
