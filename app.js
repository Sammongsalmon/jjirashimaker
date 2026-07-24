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
      id: "headline-rule",
      name: "호외 한 줄",
      caption: "헤드라인 · 기사 · 콜아웃",
      palette: ["#f3ecdf", "#111111", "#ff3b30"],
      bg: { mode: "solid", c1: "#f3ecdf", c2: "#ffffff", pattern: "grid", patternColor: "#111111", angle: 0, scale: 54 },
      border: { enabled: true, color: "#111111", width: 12, radius: 0 },
      regions: [
        R("대제목", .045, .045, .91, .22, { fillNone: true, padding: 18 }),
        R("검은 가로선", .035, .285, .93, .025, { shape: "line", fillRole: "secondary", acceptText: false, padding: 0 }),
        R("기사 본문", .045, .345, .595, .60, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 18, padding: 34 }),
        R("원형 특보", .675, .345, .28, .275, { shape: "ellipse", fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, padding: 34 }),
        R("검은 연락처", .675, .665, .28, .28, { fillRole: "secondary", radius: 18, padding: 28 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    },
    {
      id: "label-market",
      name: "노랑 상점 전단",
      caption: "상단 띠 · 큰 카드 · 2단 배지",
      palette: ["#ffd400", "#111111", "#0057ff"],
      bg: { mode: "solid", c1: "#ffd400", c2: "#ffffff", pattern: "dots", patternColor: "#111111", angle: 0, scale: 48 },
      border: { enabled: true, color: "#111111", width: 10, radius: 0 },
      regions: [
        R("검은 상호", .04, .045, .92, .18, { fillRole: "secondary", radius: 12, padding: 22 }),
        R("흰 안내판", .04, .265, .60, .69, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 7, radius: 28, padding: 38 }),
        R("파랑 배지", .675, .265, .285, .285, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 7, radius: 24, padding: 28 }),
        R("빨강 접수판", .675, .59, .285, .365, { fill: "#ff3158", strokeRole: "secondary", strokeWidth: 7, radius: 24, padding: 28 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    },
    {
      id: "blue-bulletin",
      name: "파랑 속보판",
      caption: "백색 제목 · 본문 · 원형 특보",
      palette: ["#0757c9", "#ffffff", "#ffe000"],
      bg: { mode: "solid", c1: "#0757c9", c2: "#ffffff", pattern: "grid", patternColor: "#ffffff", angle: 0, scale: 58 },
      border: { enabled: true, color: "#111111", width: 10, radius: 0 },
      regions: [
        R("백색 제목", .04, .045, .92, .215, { fillRole: "secondary", stroke: "#111111", strokeWidth: 6, radius: 16, padding: 26 }),
        R("백색 기사", .04, .30, .585, .655, { fillRole: "secondary", stroke: "#111111", strokeWidth: 6, radius: 22, padding: 38 }),
        R("노랑 특보", .66, .30, .30, .30, { shape: "ellipse", fillRole: "tertiary", stroke: "#111111", strokeWidth: 6, padding: 38 }),
        R("검은 결론", .66, .655, .30, .30, { fill: "#111111", radius: 22, padding: 30 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    },
    {
      id: "red-directory",
      name: "빨강 전화번호부",
      caption: "대제목 · 속보 띠 · 3열 기사",
      palette: ["#ee3027", "#111111", "#ffe23b"],
      bg: { mode: "solid", c1: "#ee3027", c2: "#ffffff", pattern: "stripes", patternColor: "#111111", angle: 0, scale: 50 },
      border: { enabled: true, color: "#111111", width: 12, radius: 0 },
      regions: [
        R("크림 대제목", .04, .045, .92, .205, { fill: "#fff5dc", strokeRole: "secondary", strokeWidth: 6, padding: 24 }),
        R("검은 속보", .04, .285, .92, .105, { fillRole: "secondary", padding: 16 }),
        R("기사 왼쪽", .04, .43, .285, .525, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 14, padding: 26 }),
        R("기사 가운데", .3575, .43, .285, .525, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, radius: 14, padding: 26 }),
        R("기사 오른쪽", .675, .43, .285, .525, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 14, padding: 26 })
      ],
      textSlots: [0, 2, 3, 4, 1]
    },
    {
      id: "pink-tickets",
      name: "분홍 접수표",
      caption: "상호 띠 · 티켓 3장 · 하단 번호",
      palette: ["#ff4f9a", "#111111", "#36d8ff"],
      bg: { mode: "solid", c1: "#ff4f9a", c2: "#ffffff", pattern: "dots", patternColor: "#111111", angle: 0, scale: 42 },
      border: { enabled: true, color: "#111111", width: 10, radius: 0 },
      regions: [
        R("검은 상단", .04, .045, .92, .17, { fillRole: "secondary", radius: 16, padding: 20 }),
        R("흰 티켓", .04, .255, .92, .16, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 18, padding: 22 }),
        R("하늘 티켓", .04, .45, .92, .16, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, radius: 18, padding: 22 }),
        R("노랑 티켓", .04, .645, .92, .16, { fill: "#ffe33b", strokeRole: "secondary", strokeWidth: 6, radius: 18, padding: 22 }),
        R("검은 번호", .04, .84, .92, .115, { fillRole: "secondary", radius: 16, padding: 16 })
      ],
      textSlots: [0, 1, 2, 3, 4]
    },
    {
      id: "mint-notice",
      name: "민트 공지판",
      caption: "검은 제목 · 백색 본문 · 우측 메모",
      palette: ["#67e5c4", "#111111", "#2357d7"],
      bg: { mode: "solid", c1: "#67e5c4", c2: "#ffffff", pattern: "grid", patternColor: "#111111", angle: 0, scale: 56 },
      border: { enabled: true, color: "#111111", width: 10, radius: 0 },
      regions: [
        R("검은 공지", .05, .05, .90, .19, { fillRole: "secondary", radius: 10, padding: 22 }),
        R("흰 본문", .05, .285, .56, .665, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 24, padding: 36 }),
        R("파랑 메모", .645, .285, .305, .285, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, radius: 24, padding: 30 }),
        R("크림 메모", .645, .61, .305, .34, { fill: "#fff3ca", strokeRole: "secondary", strokeWidth: 6, radius: 24, padding: 30 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    },
    {
      id: "orange-counter",
      name: "주황 안내창구",
      caption: "세로 표찰 · 3단 안내 카드",
      palette: ["#ff7a00", "#111111", "#fff0c7"],
      bg: { mode: "solid", c1: "#ff7a00", c2: "#ffffff", pattern: "stripes", patternColor: "#111111", angle: 0, scale: 54 },
      border: { enabled: true, color: "#111111", width: 12, radius: 0 },
      regions: [
        R("검은 세로판", .04, .05, .275, .90, { fillRole: "secondary", radius: 16, padding: 28 }),
        R("크림 제목", .35, .05, .61, .28, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, radius: 22, padding: 28 }),
        R("흰 안내", .35, .37, .61, .34, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 22, padding: 30 }),
        R("빨강 마감", .35, .75, .61, .20, { fill: "#f02d3a", strokeRole: "secondary", strokeWidth: 6, radius: 22, padding: 22 })
      ],
      textSlots: [1, 0, 2, 2, 3]
    },
    {
      id: "violet-call",
      name: "보라 콜센터",
      caption: "백색 헤드 · 검은 본문 · 컬러 배지",
      palette: ["#7e35d9", "#111111", "#ff59a6"],
      bg: { mode: "solid", c1: "#7e35d9", c2: "#ffffff", pattern: "dots", patternColor: "#111111", angle: 0, scale: 44 },
      border: { enabled: true, color: "#111111", width: 10, radius: 0 },
      regions: [
        R("백색 헤드", .05, .05, .90, .205, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 26, padding: 26 }),
        R("검은 상담", .05, .30, .555, .65, { fillRole: "secondary", radius: 26, padding: 36 }),
        R("분홍 원", .645, .30, .305, .27, { shape: "ellipse", fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, padding: 34 }),
        R("하늘 배지", .645, .61, .305, .15, { fill: "#45def2", strokeRole: "secondary", strokeWidth: 6, radius: 60, padding: 18 }),
        R("노랑 번호", .645, .80, .305, .15, { fill: "#ffe13b", strokeRole: "secondary", strokeWidth: 6, radius: 16, padding: 18 })
      ],
      textSlots: [0, 1, 2, 1, 4]
    },
    {
      id: "lime-lab-clean",
      name: "형광 연구소",
      caption: "검은 헤드 · 백색 연구 · 결론 2칸",
      palette: ["#b8ff00", "#111111", "#21d8ff"],
      bg: { mode: "solid", c1: "#b8ff00", c2: "#ffffff", pattern: "grid", patternColor: "#111111", angle: 0, scale: 58 },
      border: { enabled: true, color: "#111111", width: 12, radius: 0 },
      regions: [
        R("검은 연구명", .04, .045, .92, .19, { fillRole: "secondary", padding: 22 }),
        R("백색 연구", .04, .275, .92, .43, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 7, radius: 20, padding: 34 }),
        R("하늘 결론", .04, .75, .585, .205, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 7, radius: 20, padding: 24 }),
        R("검은 확인", .665, .75, .295, .205, { fillRole: "secondary", radius: 20, padding: 24 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    },
    {
      id: "cyan-archive",
      name: "하늘 기록보관소",
      caption: "대형 기사 · 우측 정보 3칸",
      palette: ["#3bd2f0", "#123c85", "#ffe235"],
      bg: { mode: "solid", c1: "#3bd2f0", c2: "#ffffff", pattern: "grid", patternColor: "#123c85", angle: 0, scale: 58 },
      border: { enabled: true, color: "#123c85", width: 10, radius: 0 },
      regions: [
        R("백색 대문", .04, .05, .65, .90, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 7, radius: 24, padding: 40 }),
        R("남색 요약", .725, .05, .235, .42, { fillRole: "secondary", radius: 22, padding: 28 }),
        R("노랑 표찰", .725, .515, .235, .19, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, radius: 18, padding: 20 }),
        R("백색 번호", .725, .75, .235, .20, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 18, padding: 20 })
      ],
      textSlots: [0, 1, 2, 0, 3]
    },
    {
      id: "black-sticker",
      name: "검정 스티커판",
      caption: "백색 제목 · 좌우 카드 · 노랑 결론",
      palette: ["#111111", "#ff55a5", "#26d9ef"],
      bg: { mode: "solid", c1: "#111111", c2: "#ffffff", pattern: "dots", patternColor: "#ffffff", angle: 0, scale: 46 },
      border: { enabled: true, color: "#ffffff", width: 8, radius: 0 },
      regions: [
        R("백색 제목", .04, .05, .92, .20, { fill: "#ffffff", radius: 18, padding: 26 }),
        R("분홍 카드", .04, .30, .44, .395, { fillRole: "secondary", stroke: "#ffffff", strokeWidth: 6, radius: 22, padding: 30 }),
        R("하늘 카드", .52, .30, .44, .395, { fillRole: "tertiary", stroke: "#ffffff", strokeWidth: 6, radius: 22, padding: 30 }),
        R("노랑 결론", .04, .74, .92, .21, { fill: "#ffe000", radius: 18, padding: 24 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    },
    {
      id: "cream-classified",
      name: "크림 생활정보",
      caption: "적색 헤드 · 2×2 분류광고",
      palette: ["#f3ead5", "#111111", "#f23b35"],
      bg: { mode: "solid", c1: "#f3ead5", c2: "#ffffff", pattern: "grid", patternColor: "#111111", angle: 0, scale: 64 },
      border: { enabled: true, color: "#111111", width: 12, radius: 0 },
      regions: [
        R("적색 헤드", .035, .04, .93, .18, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, padding: 20 }),
        R("분류 1", .04, .26, .44, .30, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, padding: 28 }),
        R("분류 2", .52, .26, .44, .30, { fillRole: "secondary", padding: 28 }),
        R("분류 3", .04, .60, .44, .35, { fill: "#ffe03b", strokeRole: "secondary", strokeWidth: 6, padding: 28 }),
        R("분류 4", .52, .60, .44, .35, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, padding: 28 })
      ],
      textSlots: [0, 1, 2, 3, 4]
    },
    {
      id: "white-urgent",
      name: "백색 긴급공고",
      caption: "적색 헤드 · 큰 기사 · 특보 2칸",
      palette: ["#ffffff", "#111111", "#ff2e3f"],
      bg: { mode: "solid", c1: "#ffffff", c2: "#ffffff", pattern: "grid", patternColor: "#111111", angle: 0, scale: 56 },
      border: { enabled: true, color: "#111111", width: 14, radius: 0 },
      regions: [
        R("적색 긴급", .04, .05, .92, .18, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, padding: 20 }),
        R("백색 기사", .04, .275, .64, .675, { fillNone: true, strokeRole: "secondary", strokeWidth: 7, padding: 36 }),
        R("노랑 원형", .72, .275, .24, .28, { shape: "ellipse", fill: "#ffe13b", strokeRole: "secondary", strokeWidth: 6, padding: 30 }),
        R("검은 속보", .72, .60, .24, .35, { fillRole: "secondary", radius: 18, padding: 28 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    },
    {
      id: "green-phonebook",
      name: "초록 연락망",
      caption: "제목 · 안내 2줄 · 하단 배지",
      palette: ["#22d45f", "#111111", "#ffe13b"],
      bg: { mode: "solid", c1: "#22d45f", c2: "#ffffff", pattern: "grid", patternColor: "#111111", angle: 0, scale: 54 },
      border: { enabled: true, color: "#111111", width: 10, radius: 0 },
      regions: [
        R("검은 제목", .04, .045, .92, .19, { fillRole: "secondary", radius: 14, padding: 22 }),
        R("흰 안내 1", .04, .285, .92, .17, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 16, padding: 20 }),
        R("흰 안내 2", .04, .495, .92, .17, { fill: "#ffffff", strokeRole: "secondary", strokeWidth: 6, radius: 16, padding: 20 }),
        R("노랑 접수", .04, .705, .585, .25, { fillRole: "tertiary", strokeRole: "secondary", strokeWidth: 6, radius: 18, padding: 26 }),
        R("빨강 전화", .665, .705, .295, .25, { shape: "ellipse", fill: "#ff3158", strokeRole: "secondary", strokeWidth: 6, padding: 30 })
      ],
      textSlots: [0, 1, 2, 3, 4]
    },
    {
      id: "navy-broadcast",
      name: "남색 방송국",
      caption: "노랑 헤드 · 백색 본문 · 우측 2단",
      palette: ["#112f78", "#ffe13b", "#34d7ef"],
      bg: { mode: "solid", c1: "#112f78", c2: "#ffffff", pattern: "grid", patternColor: "#ffffff", angle: 0, scale: 60 },
      border: { enabled: true, color: "#ffffff", width: 8, radius: 0 },
      regions: [
        R("노랑 방송명", .04, .05, .92, .20, { fillRole: "secondary", stroke: "#111111", strokeWidth: 6, radius: 18, padding: 24 }),
        R("백색 사연", .04, .295, .60, .655, { fill: "#ffffff", stroke: "#111111", strokeWidth: 6, radius: 22, padding: 36 }),
        R("하늘 주파수", .68, .295, .28, .28, { fillRole: "tertiary", stroke: "#111111", strokeWidth: 6, radius: 22, padding: 28 }),
        R("분홍 신청곡", .68, .62, .28, .33, { fill: "#ff4fa0", stroke: "#111111", strokeWidth: 6, radius: 22, padding: 28 })
      ],
      textSlots: [0, 1, 2, 1, 3]
    }
  ];

  function makeText(text, overrides = {}) {
    return {
      id: uid(), text, regionId: null, order: 0, role: "body",
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
    const defaults = type === "band" ? { w: 520, h: 120 } : type === "circle" ? { w: 260, h: 260 } : { w: 360, h: 240 };
    return {
      id: uid(), type, x, y, w: defaults.w, h: defaults.h,
      fill: "#f4e900", fillNone: false, stroke: "#111111", strokeNone: false, strokeWidth: 4,
      radius: type === "band" ? 60 : 0, rotation: 0,
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
  let activeTextarea = null;
  let renderQueued = false;
  let toastTimer = null;
  let unicodeTarget = null;
  const imageCache = new Map();
  const colorFields = [];

  function dimensions() {
    const trimW = state.orientation === "portrait" ? 900 : 1600;
    const trimH = state.orientation === "portrait" ? 1600 : 900;
    const bleed = Math.round((Number(state.bleedMm) || 0) * 12);
    return { trimW, trimH, bleed, fullW: trimW + bleed * 2, fullH: trimH + bleed * 2 };
  }

  function resolveColor(item, prop) {
    const role = item[`${prop}Role`];
    return role ? state.palette[role] : item[prop];
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
    headline: { fontFamily:"dotum", fontSize:72, align:"left", bold:true, italic:false, lineHeight:1.05, scaleX:.97, letterSpacing:-2, effect:"outline", outlineWidth:2, colorMode:"auto", gap:12 },
    bullet: { fontFamily:"dotum", fontSize:44, align:"left", bold:true, italic:false, lineHeight:1.15, scaleX:1, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:10 },
    callout: { fontFamily:"dotum", fontSize:38, align:"center", bold:true, italic:false, lineHeight:1.08, scaleX:.99, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:8 },
    body: { fontFamily:"dotum", fontSize:48, align:"left", bold:true, italic:false, lineHeight:1.10, scaleX:1, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:10 },
    footer: { fontFamily:"batang", fontSize:38, align:"center", bold:true, italic:false, lineHeight:1.06, scaleX:.99, letterSpacing:-1, effect:"none", outlineWidth:2, colorMode:"auto", gap:8 },
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

  function assignTextsToTemplate(spec, { restyle = false } = {}) {
    const accepting = state.regions.filter((r) => r.acceptText && r.shape !== "line");
    const orders = new Map(accepting.map((r) => [r.id, 0]));
    const fallbackRoles = ["headline", "bullet", "callout", "body", "footer", "tag"];

    state.texts.forEach((text, index) => {
      if (!text.role) text.role = fallbackRoles[index] || "body";
      const slotIndex = Number(spec.textSlots?.[index]);
      let region = Number.isFinite(slotIndex) ? accepting[clamp(slotIndex, 0, Math.max(0, accepting.length - 1))] : null;
      if (!region) {
        const roleMatch = accepting.find((r) => (r.textRoles || []).includes(text.role));
        region = roleMatch || accepting[index % Math.max(1, accepting.length)] || null;
      }
      text.regionId = region?.id || null;
      text.order = region ? (orders.get(region.id) || 0) : index;
      if (region) orders.set(region.id, text.order + 1);
      if (restyle) applyRoleStyle(text, text.role);
      text.manualX = null;
      text.manualY = null;
    });
  }

  function applyTemplate(templateId, { preserveTexts = true } = {}) {
    const spec = templateSpecs.find((t) => t.id === templateId) || templateSpecs[0];
    const { trimW: W, trimH: H } = dimensions();
    state.templateId = spec.id;
    state.palette = { primary: spec.palette[0], secondary: spec.palette[1], tertiary: spec.palette[2] };
    state.background = deepClone(spec.bg);
    state.background.mode = "solid";
    state.background.c2 = state.background.c1;
    state.background.pattern = "none";
    state.regions = spec.regions.map((r) => cloneTemplateRegion(r, W, H));
    state.posterBorder = spec.border
      ? { enabled:Boolean(spec.border.enabled), color:spec.border.color || "#111111", width:Number(spec.border.width) || 0, radius:Number(spec.border.radius) || 0 }
      : { enabled:false, color:"#111111", width:0, radius:0 };
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
    const map = { primary: spec.palette[0], secondary: spec.palette[1], tertiary: spec.palette[2] };
    return role ? map[role] : region[prop];
  }

  function drawTemplateThumbnail(target, spec) {
    const c = target.getContext("2d");
    const W = target.width = 320;
    const H = target.height = 180;
    c.clearRect(0, 0, W, H);
    c.fillStyle = spec.bg.c1;
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
        const fill = r.fillNone ? spec.bg.c1 : thumbColor(spec,r,"fill");
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
    label.append(input);
    return label;
  }

  function openUnicodeBrowser(target, hint) {
    unicodeTarget = target;
    $("unicodeTargetHint").textContent = hint;
    $("unicodeSearch").value = "";
    renderUnicodeGrid("전체", "");
    $("unicodeDialog").showModal();
  }

  function renderTextList() {
    const list = $("textList");
    list.replaceChildren();
    const { trimW, trimH } = dimensions();
    const accepting = state.regions.filter((r) => r.acceptText);

    state.texts.forEach((text, index) => {
      const card = document.createElement("article");
      card.className = `text-card${state.selectedTextId === text.id ? " active" : ""}`;
      card.dataset.textId = text.id;
      const head = document.createElement("div");
      head.className = "text-card-head";
      const grip = document.createElement("div"); grip.className = "drag-grip"; grip.textContent = String(index + 1).padStart(2, "0");
      const textarea = document.createElement("textarea");
      textarea.className = "text-input"; textarea.value = text.text; textarea.rows = Math.max(2, Math.min(5, text.text.split("\n").length + 1));
      textarea.addEventListener("focus", () => { state.selectedTextId = text.id; activeTextarea = textarea; list.querySelectorAll(".text-card").forEach((node) => node.classList.toggle("active", node.dataset.textId === text.id)); queueRender(); });
      textarea.addEventListener("click", () => { state.selectedTextId = text.id; activeTextarea = textarea; });
      textarea.addEventListener("input", () => { text.text = textarea.value; queueRender(); });
      textarea.addEventListener("select", () => { activeTextarea = textarea; });
      const actions = document.createElement("div"); actions.className = "text-card-actions";
      const up = document.createElement("button"); up.className = "small-button"; up.type = "button"; up.textContent = "↑";
      const down = document.createElement("button"); down.className = "small-button"; down.type = "button"; down.textContent = "↓";
      const remove = document.createElement("button"); remove.className = "small-button"; remove.type = "button"; remove.textContent = "×";
      up.addEventListener("click", () => moveTextInList(text.id, -1));
      down.addEventListener("click", () => moveTextInList(text.id, 1));
      remove.addEventListener("click", () => {
        if (state.texts.length === 1) return toast("문장은 하나 이상 필요합니다.");
        state.texts = state.texts.filter((x) => x.id !== text.id);
        state.selectedTextId = state.texts[Math.max(0, index - 1)]?.id || null;
        renderTextList(); queueRender();
      });
      actions.append(up, down, remove);
      head.append(grip, textarea, actions);
      head.addEventListener("pointerdown", (event) => {
        if (event.target.closest("textarea,button,input,select")) return;
        state.selectedTextId = text.id; list.querySelectorAll(".text-card").forEach((node) => node.classList.toggle("active", node.dataset.textId === text.id)); queueRender();
      });
      card.append(head);

      const controls = document.createElement("div");
      controls.className = "inline-text-controls";
      const title = document.createElement("p"); title.className = "control-title"; title.textContent = "선택 문장 꾸미기";
      controls.append(title);

      const row1 = document.createElement("div"); row1.className = "field-grid three";
      const fontSelect = makeSelect([["dotum","KoPub 돋움"],["batang","KoPub 바탕"],["gulim","굴림체"]], text.fontFamily);
      fontSelect.addEventListener("change", () => { text.fontFamily = fontSelect.value; queueRender(); });
      const fontSize = document.createElement("input"); fontSize.type = "number"; fontSize.min = 12; fontSize.max = 300; fontSize.value = text.fontSize;
      fontSize.addEventListener("input", () => { text.fontSize = clamp(Number(fontSize.value),12,300); queueRender(); });
      const regionSelect = document.createElement("select");
      accepting.forEach((region) => { const o = document.createElement("option"); o.value = region.id; o.textContent = region.name; o.selected = text.regionId === region.id; regionSelect.append(o); });
      regionSelect.addEventListener("change", () => { text.regionId = regionSelect.value; text.manualX = null; text.manualY = null; normalizeTextOrders(); queueRender(); });
      row1.append(labeledControl("폰트", fontSelect), labeledControl("크기", fontSize), labeledControl("글자 영역", regionSelect));
      controls.append(row1);

      const row2 = document.createElement("div"); row2.className = "field-grid three";
      const align = makeSelect([["left","왼쪽"],["center","가운데"],["right","오른쪽"]], text.align);
      align.addEventListener("change", () => { text.align = align.value; queueRender(); });
      const unicode = makeSelect(UNICODE_PRESETS, text.unicodeStyle);
      unicode.addEventListener("change", () => { text.unicodeStyle = unicode.value; queueRender(); renderTextList(); });
      const lineHeight = rangeControl("줄 간격", text.lineHeight, .8, 1.8, .02, (v) => `${v.toFixed(2)}배`, (v) => text.lineHeight = v);
      row2.append(labeledControl("정렬", align), labeledControl("유니코드 연출", unicode), lineHeight);
      controls.append(row2);

      const unicodeRow = document.createElement("div"); unicodeRow.className = "field-grid two";
      const customWrap = document.createElement("div"); customWrap.innerHTML = '<span class="field-label">직접 기호</span>';
      const customInputRow = document.createElement("div"); customInputRow.className = "unicode-row";
      const customInput = document.createElement("input"); customInput.value = text.customUnicode || "★";
      customInput.addEventListener("input", () => { text.customUnicode = customInput.value; queueRender(); });
      const customBrowse = document.createElement("button"); customBrowse.type = "button"; customBrowse.className = "button"; customBrowse.textContent = "찾아보기";
      customBrowse.addEventListener("click", () => openUnicodeBrowser((char) => { text.customUnicode = char; text.unicodeStyle = "custom"; renderTextList(); queueRender(); }, "선택한 문장의 단어 사이 기호로 넣습니다."));
      customInputRow.append(customInput, customBrowse); customWrap.append(customInputRow);

      const prefixWrap = document.createElement("div"); prefixWrap.innerHTML = '<span class="field-label">각 줄 앞 기호</span>';
      const prefixInputRow = document.createElement("div"); prefixInputRow.className = "unicode-row";
      const prefixInput = document.createElement("input"); prefixInput.value = text.prefixSymbol || "•";
      prefixInput.addEventListener("input", () => { text.prefixSymbol = prefixInput.value; text.prefixEnabled = true; queueRender(); });
      const prefixBrowse = document.createElement("button"); prefixBrowse.type = "button"; prefixBrowse.className = "button"; prefixBrowse.textContent = "찾아보기";
      prefixBrowse.addEventListener("click", () => openUnicodeBrowser((char) => { text.prefixSymbol = char; text.prefixEnabled = true; renderTextList(); queueRender(); }, "선택한 문장의 각 줄 앞에 붙일 기호입니다."));
      prefixInputRow.append(prefixInput, prefixBrowse); prefixWrap.append(prefixInputRow);
      unicodeRow.append(customWrap, prefixWrap); controls.append(unicodeRow);

      const toggles = document.createElement("div"); toggles.className = "toggle-row";
      [["bold","볼드"],["italic","이탤릭"],["underline","밑줄"],["strike","취소선"],["prefixEnabled","줄 앞 기호 사용"]].forEach(([key,labelText]) => {
        const l = document.createElement("label"); const i = document.createElement("input"); i.type="checkbox"; i.checked = Boolean(text[key]);
        i.addEventListener("change", () => { text[key] = i.checked; queueRender(); }); l.append(i, labelText); toggles.append(l);
      });
      controls.append(toggles);

      const row3 = document.createElement("div"); row3.className = "field-grid three";
      row3.append(
        rangeControl("글자 폭", text.scaleX * 100, 50, 180, 1, (v) => `${Math.round(v)}%`, (v) => text.scaleX = v / 100),
        rangeControl("자간", text.letterSpacing, -12, 36, 1, (v) => String(v), (v) => text.letterSpacing = v),
        rangeControl("줄 앞 간격", text.prefixGap, 0, 60, 1, (v) => String(v), (v) => text.prefixGap = v)
      );
      controls.append(row3);

      const row4 = document.createElement("div"); row4.className = "field-grid three";
      const effect = makeSelect([["none","없음"],["outline","외곽선"],["shadow","그림자"],["hollow","빈 그림자"]], text.effect);
      effect.addEventListener("change", () => { text.effect = effect.value; queueRender(); });
      const outline = document.createElement("input"); outline.type="number"; outline.min=0; outline.max=30; outline.value=text.outlineWidth;
      outline.addEventListener("input", () => { text.outlineWidth = Number(outline.value); queueRender(); });
      const gap = document.createElement("input"); gap.type="number"; gap.min=0; gap.max=120; gap.value=text.gap;
      gap.addEventListener("input", () => { text.gap = Number(gap.value); queueRender(); });
      row4.append(labeledControl("효과", effect), labeledControl("외곽선/그림자 크기", outline), labeledControl("문장 아래 여백", gap));
      controls.append(row4);

      const row5 = document.createElement("div"); row5.className = "field-grid three";
      const colorMode = makeSelect([["auto","배경 따라 자동"],["custom","직접 선택"]], text.colorMode);
      colorMode.addEventListener("change", () => { text.colorMode = colorMode.value; queueRender(); });
      const textColorHost = document.createElement("div"); textColorHost.innerHTML = '<span class="field-label">본문 색</span>';
      makeInlineColorControl(textColorHost, () => text.color, (v) => { text.color = v; text.colorMode = "custom"; });
      const effectColorHost = document.createElement("div"); effectColorHost.innerHTML = '<span class="field-label">효과 색</span>';
      makeInlineColorControl(effectColorHost, () => text.effectColor, (v) => text.effectColor = v);
      row5.append(labeledControl("색상 방식", colorMode), textColorHost, effectColorHost); controls.append(row5);

      const rangeBox = document.createElement("div"); rangeBox.className = "range-color-box";
      rangeBox.innerHTML = "<p>위 입력창에서 글자를 드래그한 뒤 색상을 적용하세요. 줄바꿈을 포함한 부분 선택도 가능합니다.</p>";
      const inline = document.createElement("div"); inline.className = "range-color-controls";
      let selectedRangeColor = "#F4E900";
      const rangeColorHost = document.createElement("div");
      rangeColorHost.innerHTML = '<span class="field-label">선택 부분 색</span>';
      makeInlineColorControl(rangeColorHost, () => selectedRangeColor, (value) => { selectedRangeColor = value; });
      const apply = document.createElement("button"); apply.type="button"; apply.className="button button-accent"; apply.textContent="선택 글자 색 적용";
      apply.addEventListener("click", () => {
        const ta = card.querySelector("textarea");
        const start = ta.selectionStart; const end = ta.selectionEnd;
        if (start === end) return toast("먼저 입력창에서 일부 글자를 선택하세요.");
        text.rangeColors.push({ start, end, color: selectedRangeColor });
        renderTextList(); queueRender();
      });
      inline.append(rangeColorHost, apply); rangeBox.append(inline);
      const chips = document.createElement("div"); chips.className="chips";
      text.rangeColors.forEach((range, ri) => {
        const chip = document.createElement("span"); chip.className="chip"; chip.style.borderColor=range.color;
        chip.innerHTML = `${range.start + 1}–${range.end} <button type="button">×</button>`;
        chip.querySelector("button").addEventListener("click", () => { text.rangeColors.splice(ri,1); renderTextList(); queueRender(); });
        chips.append(chip);
      });
      rangeBox.append(chips); controls.append(rangeBox);

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
    $("regionControls").classList.toggle("is-disabled", !region);
    if (!region) {
      $("selectedRegionName").textContent = "선택된 영역 없음";
      $("selectedRegionBadge").textContent = "미리보기에서 선택";
      colorFields.forEach((f) => f.update());
      return;
    }
    $("selectedRegionName").textContent = region.name;
    $("selectedRegionBadge").textContent = region.acceptText ? "문장 영역" : "장식 영역";
    $("regionX").value = round(region.x); $("regionY").value = round(region.y);
    $("regionW").value = round(region.w); $("regionH").value = round(region.h);
    $("regionShape").value = region.shape;
    $("regionRadius").value = region.radius; $("regionRadiusValue").textContent = round(region.radius);
    $("regionPadding").value = region.padding; $("regionPaddingValue").textContent = round(region.padding);
    $("regionStrokeWidth").value = region.strokeWidth;
    $("regionRotation").value = region.rotation; $("regionRotationValue").textContent = `${round(region.rotation)}°`;
    $("regionAcceptText").value = region.acceptText ? "yes" : "no";
    $("regionEffect").value = region.effect; $("regionEffectSize").value = region.effectSize;
    colorFields.forEach((f) => f.update());
  }

  function updateElementControls() {
    const element = selectedElement();
    $("elementControls").classList.toggle("is-disabled", !element);
    if (!element) {
      $("selectedElementName").textContent = "선택된 요소 없음";
      $("selectedElementBadge").textContent = "미리보기에서 선택";
      colorFields.forEach((f) => f.update());
      return;
    }
    const labels = { rect:"사각형", band:"띠", circle:"원형", heart:"하트", burst:"뾰족 말풍선", image:"사진" };
    $("selectedElementName").textContent = labels[element.type] || "요소";
    $("selectedElementBadge").textContent = element.type === "image" ? "사진" : "도형";
    $("elementX").value = round(element.x); $("elementY").value = round(element.y);
    $("elementW").value = round(element.w); $("elementH").value = round(element.h);
    $("elementStrokeWidth").value = element.strokeWidth;
    $("elementRadius").value = element.radius; $("elementRadiusValue").textContent = round(element.radius);
    $("elementRotation").value = element.rotation; $("rotationValue").textContent = `${round(element.rotation)}°`;
    $("flowMargin").value = element.flowMargin; $("flowMarginValue").textContent = round(element.flowMargin);
    $("affectFlow").checked = element.affectFlow;
    $("elementEffect").value = element.effect; $("elementEffectSize").value = element.effectSize;
    $("elementLabel").value = element.label || ""; $("elementLabelSize").value = element.labelSize;
    $("imageFit").value = element.imageFit || "cover";
    colorFields.forEach((f) => f.update());
  }

  function syncBackgroundControls() {
    $("orientation").value = state.orientation;
    $("bleedMm").value = String(state.bleedMm);
    $("backgroundMode").value = state.background.mode;
    $("gradientAngle").value = state.background.angle; $("gradientAngleValue").textContent = `${round(state.background.angle)}°`;
    $("patternType").value = state.background.pattern;
    $("patternScale").value = state.background.scale; $("patternScaleValue").textContent = round(state.background.scale);
    $("posterBorderEnabled").checked = state.posterBorder.enabled;
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
    document.querySelectorAll(".tool-tab").forEach((tab) => tab.addEventListener("click", () => {
      document.querySelectorAll(".tool-tab").forEach((x) => x.classList.toggle("active", x === tab));
      document.querySelectorAll(".tool-pane").forEach((pane) => pane.classList.toggle("active", pane.dataset.toolPane === tab.dataset.toolTab));
    }));

    $("addTextBtn").addEventListener("click", () => {
      const region = state.regions.find((r) => r.acceptText && (r.textRoles || []).includes("body")) || state.regions.find((r) => r.acceptText);
      const text = makeText(`새 수달 제보
여기에 문장을 입력하세요`, {
        role:"body",
        ...ROLE_STYLE_DEFAULTS.body,
        fontSize:46,
        regionId: region?.id || null,
        order: state.texts.filter((x) => x.regionId === region?.id).length
      });
      state.texts.push(text); state.selectedTextId = text.id; renderTextList(); queueRender();
    });

    $("addRegionBtn").addEventListener("click", () => {
      const { trimW: W, trimH: H } = dimensions();
      const region = R(`새 영역 ${state.regions.length + 1}`, Math.round(W*.18), Math.round(H*.18), Math.round(W*.45), Math.round(H*.28), { fill:"#ffffff", stroke:"#111111", strokeWidth:4, radius:24, padding:30 });
      state.regions.push(region); state.selectedRegionId = region.id; state.selectedElementId = null;
      renderRegionList(); updateRegionControls(); updateElementControls(); queueRender();
    });

    document.querySelectorAll("[data-add-shape]").forEach((button) => button.addEventListener("click", () => {
      const { trimW: W, trimH: H } = dimensions();
      const type = button.dataset.addShape;
      const element = makeElement(type, Math.round(W*.34), Math.round(H*.34), type === "heart" ? { fill:"#ff4f9a" } : {});
      state.elements.push(element); state.selectedElementId = element.id; state.selectedRegionId = null;
      updateElementControls(); updateRegionControls(); queueRender();
    }));

    $("addPhotoBtn").addEventListener("click", () => $("photoInput").click());
    $("photoInput").addEventListener("change", () => {
      const file = $("photoInput").files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const { trimW: W, trimH: H } = dimensions();
        const element = makeElement("image", Math.round(W*.3), Math.round(H*.25), { w:Math.round(W*.38), h:Math.round(H*.48), imageSrc:String(reader.result), fillNone:true, stroke:"#ffffff", strokeWidth:5, radius:20 });
        state.elements.push(element); state.selectedElementId = element.id; state.selectedRegionId = null;
        updateElementControls(); updateRegionControls(); queueRender();
      };
      reader.readAsDataURL(file); $("photoInput").value = "";
    });

    ["regionX","regionY","regionW","regionH"].forEach((id) => bindValue(id, () => 0, (v) => { const r=selectedRegion(); if (r) r[{regionX:"x",regionY:"y",regionW:"w",regionH:"h"}[id]]=v; }));
    bindValue("regionShape",()=>"rect",(v)=>{const r=selectedRegion(); if(r) r.shape=v;},"change");
    bindValue("regionRadius",()=>0,(v)=>{const r=selectedRegion(); if(r) r.radius=v;},"input",()=>$("regionRadiusValue").textContent=$("regionRadius").value);
    bindValue("regionPadding",()=>0,(v)=>{const r=selectedRegion(); if(r) r.padding=v;},"input",()=>$("regionPaddingValue").textContent=$("regionPadding").value);
    bindValue("regionStrokeWidth",()=>0,(v)=>{const r=selectedRegion(); if(r) r.strokeWidth=v;});
    bindValue("regionRotation",()=>0,(v)=>{const r=selectedRegion(); if(r) r.rotation=v;},"input",()=>$("regionRotationValue").textContent=`${$("regionRotation").value}°`);
    bindValue("regionAcceptText",()=>"yes",(v)=>{const r=selectedRegion(); if(r) r.acceptText=v==="yes";},"change",()=>{ renderRegionList(); renderTextList(); });
    bindValue("regionEffect",()=>"none",(v)=>{const r=selectedRegion(); if(r) r.effect=v;},"change");
    bindValue("regionEffectSize",()=>0,(v)=>{const r=selectedRegion(); if(r) r.effectSize=v;});
    $("deleteRegionBtn").addEventListener("click", () => {
      const r=selectedRegion(); if(!r) return;
      if(state.regions.length===1) return toast("영역은 하나 이상 필요합니다.");
      state.regions=state.regions.filter((x)=>x.id!==r.id);
      const replacement=state.regions.find((x)=>x.acceptText);
      state.texts.filter((t)=>t.regionId===r.id).forEach((t)=>{t.regionId=replacement?.id||null;t.manualX=null;t.manualY=null;});
      state.selectedRegionId=null; renderRegionList(); renderTextList(); updateRegionControls(); queueRender();
    });

    ["elementX","elementY","elementW","elementH"].forEach((id) => bindValue(id,()=>0,(v)=>{const e=selectedElement(); if(e) e[{elementX:"x",elementY:"y",elementW:"w",elementH:"h"}[id]]=v;}));
    bindValue("elementStrokeWidth",()=>0,(v)=>{const e=selectedElement(); if(e)e.strokeWidth=v;});
    bindValue("elementRadius",()=>0,(v)=>{const e=selectedElement();if(e)e.radius=v;},"input",()=>$("elementRadiusValue").textContent=$("elementRadius").value);
    bindValue("elementRotation",()=>0,(v)=>{const e=selectedElement();if(e)e.rotation=v;},"input",()=>$("rotationValue").textContent=`${$("elementRotation").value}°`);
    bindValue("flowMargin",()=>0,(v)=>{const e=selectedElement();if(e)e.flowMargin=v;},"input",()=>$("flowMarginValue").textContent=$("flowMargin").value);
    $("affectFlow").addEventListener("change",()=>{const e=selectedElement();if(e)e.affectFlow=$("affectFlow").checked;queueRender();});
    bindValue("elementEffect",()=>"none",(v)=>{const e=selectedElement();if(e)e.effect=v;},"change");
    bindValue("elementEffectSize",()=>0,(v)=>{const e=selectedElement();if(e)e.effectSize=v;});
    bindValue("elementLabel",()=>"",(v)=>{const e=selectedElement();if(e)e.label=v;});
    bindValue("elementLabelSize",()=>0,(v)=>{const e=selectedElement();if(e)e.labelSize=v;});
    bindValue("imageFit",()=>"cover",(v)=>{const e=selectedElement();if(e)e.imageFit=v;},"change");
    $("deleteElementBtn").addEventListener("click",()=>{const e=selectedElement();if(!e)return;state.elements=state.elements.filter((x)=>x.id!==e.id);state.selectedElementId=null;updateElementControls();queueRender();});

    $("orientation").addEventListener("change", () => changeOrientation($("orientation").value));
    $("bleedMm").addEventListener("change",()=>{state.bleedMm=Number($("bleedMm").value);updateCanvasMeta();queueRender();});
    bindValue("backgroundMode",()=>"solid",(v)=>state.background.mode=v,"change");
    bindValue("gradientAngle",()=>0,(v)=>state.background.angle=v,"input",()=>$("gradientAngleValue").textContent=`${$("gradientAngle").value}°`);
    bindValue("patternType",()=>"dots",(v)=>state.background.pattern=v,"change");
    bindValue("patternScale",()=>48,(v)=>state.background.scale=v,"input",()=>$("patternScaleValue").textContent=$("patternScale").value);
    $("posterBorderEnabled").addEventListener("change",()=>{state.posterBorder.enabled=$("posterBorderEnabled").checked;queueRender();});
    bindValue("posterBorderWidth",()=>0,(v)=>state.posterBorder.width=v,"input",()=>$("posterBorderWidthValue").textContent=$("posterBorderWidth").value);
    bindValue("posterBorderRadius",()=>0,(v)=>state.posterBorder.radius=v,"input",()=>$("posterBorderRadiusValue").textContent=$("posterBorderRadius").value);
    $("jpgQuality").addEventListener("input",()=>{state.jpgQuality=Number($("jpgQuality").value)/100;$("jpgQualityValue").textContent=`${$("jpgQuality").value}%`;});
    $("showRegions").addEventListener("change",()=>{state.showRegions=$("showRegions").checked;queueRender();});

    $("resetBtn").addEventListener("click",()=>{state=deepClone(initialState);applyTemplate("label-market",{preserveTexts:false});toast("처음 상태로 되돌렸습니다.");});
    [["exportPngBtn","png"],["exportPngBtn2","png"],["exportJpgBtn","jpg"],["exportJpgBtn2","jpg"]].forEach(([id,type])=>$(id).addEventListener("click",()=>exportImage(type)));
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
    if(item.effect === "none") return;
    if(item.effect === "shadow") { c.shadowColor=item.effectColor||"#111111"; c.shadowBlur=Math.max(0,item.effectSize*.35); c.shadowOffsetX=item.effectSize*.55; c.shadowOffsetY=item.effectSize*.55; }
    if(item.effect === "glow") { c.shadowColor=item.effectColor||"#ffffff"; c.shadowBlur=item.effectSize; c.shadowOffsetX=0; c.shadowOffsetY=0; }
  }

  function drawRegion(c, region) {
    withItemTransform(c,region,()=>{
      c.save(); applyShapeEffect(c,region);
      if(region.shape === "line") {
        if(!region.fillNone){c.fillStyle=resolveColor(region,"fill");roundedRectPath(c,region.x,region.y,region.w,Math.max(2,region.h),region.radius);c.fill();}
      } else {
        shapePath(c,region);
        if(region.effect === "hollow") {
          c.save(); c.translate(region.effectSize*.45,region.effectSize*.45); shapePath(c,region); c.strokeStyle=region.effectColor; c.lineWidth=Math.max(3,region.effectSize*.28); c.stroke(); c.restore();
        }
        if(!region.fillNone){c.fillStyle=resolveColor(region,"fill");c.fill();}
        if(!region.strokeNone && region.strokeWidth>0){shapePath(c,region);c.strokeStyle=resolveColor(region,"stroke");c.lineWidth=region.strokeWidth;c.stroke();}
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
    withItemTransform(c,element,()=>{
      c.save(); applyShapeEffect(c,element);
      if(element.effect === "hollow") {
        c.save(); c.translate(element.effectSize*.45,element.effectSize*.45); shapePath(c,element); c.strokeStyle=element.effectColor;c.lineWidth=Math.max(3,element.effectSize*.28);c.stroke();c.restore();
      }
      if(element.type === "image") {
        shapePath(c,element); c.clip();
        if(!element.fillNone){c.fillStyle=element.fill;c.fillRect(element.x,element.y,element.w,element.h);}
        const img=getImage(element.imageSrc);
        if(img?.complete && img.naturalWidth){
          const ir=img.naturalWidth/img.naturalHeight, er=element.w/element.h;
          let dw,dh,dx,dy;
          if((element.imageFit||"cover")==="contain"){
            if(ir>er){dw=element.w;dh=dw/ir;dx=element.x;dy=element.y+(element.h-dh)/2;}
            else{dh=element.h;dw=dh*ir;dy=element.y;dx=element.x+(element.w-dw)/2;}
          } else {
            if(ir>er){dh=element.h;dw=dh*ir;dy=element.y;dx=element.x+(element.w-dw)/2;}
            else{dw=element.w;dh=dw/ir;dx=element.x;dy=element.y+(element.h-dh)/2;}
          }
          c.drawImage(img,dx,dy,dw,dh);
        }
        c.restore();
        c.save();
        if(!element.strokeNone && element.strokeWidth>0){shapePath(c,element);c.strokeStyle=element.stroke;c.lineWidth=element.strokeWidth;c.stroke();}
      } else {
        shapePath(c,element);
        if(!element.fillNone){c.fillStyle=element.fill;c.fill();}
        if(!element.strokeNone && element.strokeWidth>0){shapePath(c,element);c.strokeStyle=element.stroke;c.lineWidth=element.strokeWidth;c.stroke();}
      }
      c.shadowColor="transparent";
      if(element.label){
        c.fillStyle=element.labelColor||"#111111"; c.font=`700 ${element.labelSize||64}px ${fontFamilies.dotum}`; c.textAlign="center";c.textBaseline="middle";
        const maxW=element.w*.82; const measured=c.measureText(element.label).width; const sx=Math.min(1,maxW/Math.max(1,measured));
        c.save(); c.translate(element.x+element.w/2,element.y+element.h/2);c.scale(sx,1);c.fillText(element.label,0,0);c.restore();
      }
      c.restore();
    });
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
    return state.elements.filter((e)=>e.affectFlow).map((e)=>{
      const m=e.flowMargin||0;
      return {x:e.x-m,y:e.y-m,w:e.w+m*2,h:e.h+m*2,id:e.id};
    }).filter((r)=>r.w>0&&r.h>0);
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
    c.save(); c.translate(startX,y); c.scale(sx,1); c.textAlign="left";c.textBaseline="alphabetic";
    let pen=0;
    const effect=text.effect;
    if(effect==="shadow"){c.shadowColor=text.effectColor;c.shadowBlur=Math.max(0,text.outlineWidth*.9);c.shadowOffsetX=text.outlineWidth*1.4;c.shadowOffsetY=text.outlineWidth*1.4;}
    for(const token of line.tokens){
      for(const ch of token.ch){
        const color=colorAtIndex(text,token.index,baseColor);
        c.fillStyle=color;
        if(effect==="hollow"){
          c.save();c.shadowColor="transparent";c.strokeStyle=text.effectColor;c.lineWidth=Math.max(2,text.outlineWidth);c.strokeText(ch,pen+text.outlineWidth*1.4,text.outlineWidth*1.4);c.restore();
        }
        if(effect==="outline"){c.strokeStyle=text.effectColor;c.lineJoin="round";c.lineWidth=Math.max(0,text.outlineWidth*2);c.strokeText(ch,pen,0);}
        c.fillText(ch,pen,0);
        pen+=c.measureText(ch).width+text.letterSpacing;
      }
    }
    c.shadowColor="transparent";
    const drawW=Math.max(0,pen-text.letterSpacing);
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
      c.save(); shapePath(c,fragment.region);c.clip();
      fragment.lines.forEach((line,i)=>drawTokenLine(c,fragment,line,i,base));
      c.restore();
    });
  }

  function drawGuides(c,fragments){
    const {bleed}=dimensions();
    c.save();c.translate(bleed,bleed);
    state.regions.forEach((r)=>{
      if(!state.showRegions&&r.id!==state.selectedRegionId)return;
      c.save();c.setLineDash([10,8]);c.lineWidth=3;c.strokeStyle=r.id===state.selectedRegionId?"#f4e900":"rgba(255,255,255,.64)";
      shapePath(c,r);c.stroke();
      if(r.acceptText){const b=regionContentBox(r);c.strokeStyle="rgba(91,240,255,.75)";c.lineWidth=2;c.strokeRect(b.x,b.y,b.w,b.h);}
      c.restore();
    });
    state.elements.forEach((e)=>{
      if(e.id!==state.selectedElementId)return;
      c.save();c.strokeStyle="#f4e900";c.lineWidth=4;c.setLineDash([12,7]);c.strokeRect(e.x,e.y,e.w,e.h);
      c.fillStyle="#f4e900";c.fillRect(e.x+e.w-12,e.y+e.h-12,24,24);c.restore();
    });
    fragments.forEach((f)=>{
      if(f.text.id!==state.selectedTextId)return;
      c.save();c.strokeStyle="#67e8a5";c.lineWidth=3;c.setLineDash([8,6]);c.strokeRect(f.x,f.y,f.w,f.h);c.restore();
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
      elementHitBoxes=state.elements.map((e)=>({id:e.id,x:e.x,y:e.y,w:e.w,h:e.h}));
      $("layoutStatus").textContent=layout.overflow?"일부 문장 축소 배치":"영역 안 자동 배치";
      $("layoutStatus").style.color=layout.overflow?"#ffd49a":"#9ef0b5";
    }
  }

  function render(){renderQueued=false;updateCanvasMeta();renderTo(ctx,{guides:true,recordHits:true});}
  function queueRender(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(render);}

  function canvasPoint(event){
    const rect=canvas.getBoundingClientRect();
    const {bleed}=dimensions();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width-bleed,y:(event.clientY-rect.top)*canvas.height/rect.height-bleed};
  }
  const contains=(b,p,pad=0)=>p.x>=b.x-pad&&p.x<=b.x+b.w+pad&&p.y>=b.y-pad&&p.y<=b.y+b.h+pad;
  function hitText(p,exclude=null){return [...layoutFragments].reverse().find((b)=>b.id!==exclude&&contains(b,p))||null;}
  function hitElement(p){return [...elementHitBoxes].reverse().find((b)=>contains(b,p))||null;}
  function hitRegion(p,acceptOnly=false){return [...regionHitBoxes].reverse().find((b)=>contains(b,p)&&(!acceptOnly||state.regions.find((r)=>r.id===b.id)?.acceptText))||null;}

  function openToolTab(name){
    const tab=document.querySelector(`.tool-tab[data-tool-tab="${name}"]`);if(!tab)return;
    document.querySelectorAll(".tool-tab").forEach((x)=>x.classList.toggle("active",x===tab));
    document.querySelectorAll(".tool-pane").forEach((pane)=>pane.classList.toggle("active",pane.dataset.toolPane===name));
  }

  canvas.addEventListener("pointerdown",(event)=>{
    const p=canvasPoint(event);
    const textHit=hitText(p);
    if(textHit){
      const text=state.texts.find((t)=>t.id===textHit.id);if(!text)return;
      state.selectedTextId=text.id;state.selectedElementId=null;state.selectedRegionId=null;
      dragState={type:"text",id:text.id,start:p,orig:{regionId:text.regionId,order:text.order,manualX:text.manualX,manualY:text.manualY},baseX:text.manualX??textHit.x,baseY:text.manualY??textHit.y,moved:false};
      canvas.setPointerCapture(event.pointerId);renderTextList();updateElementControls();updateRegionControls();queueRender();return;
    }
    const elementHit=hitElement(p);
    if(elementHit){
      const e=state.elements.find((x)=>x.id===elementHit.id);if(!e)return;
      state.selectedElementId=e.id;state.selectedRegionId=null;
      const resize=Math.hypot(p.x-(e.x+e.w),p.y-(e.y+e.h))<34;
      dragState={type:resize?"elementResize":"elementMove",id:e.id,start:p,orig:{x:e.x,y:e.y,w:e.w,h:e.h},moved:false};
      canvas.setPointerCapture(event.pointerId);openToolTab("elements");updateElementControls();updateRegionControls();queueRender();return;
    }
    const regionHit=hitRegion(p);
    if(regionHit){
      const r=state.regions.find((x)=>x.id===regionHit.id);if(!r)return;
      state.selectedRegionId=r.id;state.selectedElementId=null;
      const resize=Math.hypot(p.x-(r.x+r.w),p.y-(r.y+r.h))<34;
      dragState={type:resize?"regionResize":"regionMove",id:r.id,start:p,orig:{x:r.x,y:r.y,w:r.w,h:r.h},moved:false};
      canvas.setPointerCapture(event.pointerId);openToolTab("regions");renderRegionList();updateRegionControls();updateElementControls();queueRender();return;
    }
    state.selectedElementId=null;state.selectedRegionId=null;updateElementControls();updateRegionControls();renderRegionList();queueRender();
  });

  canvas.addEventListener("pointermove",(event)=>{
    if(!dragState)return;
    const p=canvasPoint(event),dx=p.x-dragState.start.x,dy=p.y-dragState.start.y;
    if(Math.abs(dx)+Math.abs(dy)>3)dragState.moved=true;
    const {trimW:W,trimH:H}=dimensions();
    if(dragState.type==="text"){
      const t=state.texts.find((x)=>x.id===dragState.id);if(!t)return;
      const region=state.regions.find((r)=>r.id===t.regionId);if(!region)return;
      const box=regionContentBox(region);
      t.manualX=clamp(dragState.baseX+dx,box.x,box.x+box.w-20);
      t.manualY=clamp(dragState.baseY+dy,box.y,box.y+box.h-20);
    }else if(dragState.type==="elementMove"){
      const e=state.elements.find((x)=>x.id===dragState.id);if(!e)return;
      e.x=clamp(dragState.orig.x+dx,-e.w*.8,W-e.w*.2);e.y=clamp(dragState.orig.y+dy,-e.h*.8,H-e.h*.2);updateElementControls();
    }else if(dragState.type==="elementResize"){
      const e=state.elements.find((x)=>x.id===dragState.id);if(!e)return;
      e.w=clamp(dragState.orig.w+dx,30,W*1.5);e.h=clamp(dragState.orig.h+dy,30,H*1.5);updateElementControls();
    }else if(dragState.type==="regionMove"){
      const r=state.regions.find((x)=>x.id===dragState.id);if(!r)return;
      r.x=clamp(dragState.orig.x+dx,-r.w*.8,W-r.w*.2);r.y=clamp(dragState.orig.y+dy,-r.h*.8,H-r.h*.2);updateRegionControls();
    }else if(dragState.type==="regionResize"){
      const r=state.regions.find((x)=>x.id===dragState.id);if(!r)return;
      r.w=clamp(dragState.orig.w+dx,30,W*1.5);r.h=clamp(dragState.orig.h+dy,20,H*1.5);updateRegionControls();
    }
    queueRender();
  });

  function finishPointer(event){
    if(!dragState)return;
    const p=canvasPoint(event);
    if(dragState.type==="text"){
      const a=state.texts.find((x)=>x.id===dragState.id);
      const target=hitText(p,a.id);
      if(a&&target){
        const b=state.texts.find((x)=>x.id===target.id);
        if(b){
          const bPos={regionId:b.regionId,order:b.order,manualX:b.manualX,manualY:b.manualY};
          a.regionId=bPos.regionId;a.order=bPos.order;a.manualX=bPos.manualX;a.manualY=bPos.manualY;
          b.regionId=dragState.orig.regionId;b.order=dragState.orig.order;b.manualX=dragState.orig.manualX;b.manualY=dragState.orig.manualY;
          toast("두 문장의 위치를 바꿨습니다.");
        }
      }else if(a){
        const regionHit=hitRegion(p,true);
        if(regionHit&&regionHit.id!==a.regionId){
          a.regionId=regionHit.id;a.order=state.texts.filter((t)=>t.regionId===regionHit.id&&t.id!==a.id).length;
          const region=state.regions.find((r)=>r.id===regionHit.id),box=regionContentBox(region);
          a.manualX=clamp(p.x,box.x,box.x+box.w-20);a.manualY=clamp(p.y,box.y,box.y+box.h-20);
          toast(`“${region.name}” 영역으로 옮겼습니다.`);
        }
      }
      normalizeTextOrders();renderTextList();
    }
    try{canvas.releasePointerCapture(event.pointerId);}catch{}
    dragState=null;renderRegionList();queueRender();
  }
  canvas.addEventListener("pointerup",finishPointer);
  canvas.addEventListener("pointercancel",finishPointer);

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
    createColorField("palettePrimaryField",()=>state.palette.primary,(v)=>{state.palette.primary=v;state.background.c1=v;},{allowNone:false,onCommit:()=>{renderRegionList();}});
    createColorField("paletteSecondaryField",()=>state.palette.secondary,(v)=>{state.palette.secondary=v;state.background.c2=v;},{allowNone:false,onCommit:()=>{renderRegionList();}});
    createColorField("paletteTertiaryField",()=>state.palette.tertiary,(v)=>{state.palette.tertiary=v;state.background.patternColor=v;},{allowNone:false,onCommit:()=>{renderRegionList();}});
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
  $("showRegions").checked=state.showRegions;
  renderUnicodeGrid("전체","");
  queueRender();
})();
