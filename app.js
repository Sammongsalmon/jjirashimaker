(() => {
  "use strict";

  const W = 1600;
  const H = 900;
  const SAFE = { x: 42, y: 38, w: 1516, h: 824 };
  const canvas = document.getElementById("posterCanvas");
  const ctx = canvas.getContext("2d");
  const sceneCanvas = document.createElement("canvas");
  sceneCanvas.width = W;
  sceneCanvas.height = H;
  const sceneCtx = sceneCanvas.getContext("2d", { willReadFrequently: true });

  const $ = (id) => document.getElementById(id);
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const deepClone = (value) => JSON.parse(JSON.stringify(value));

  const fontFamilies = {
    dotum: '"KoPubDotum", "Malgun Gothic", sans-serif',
    batang: '"KoPubBatang", "Batang", serif',
    gulim: '"Gulim", "Malgun Gothic", sans-serif'
  };

  const unicodeStyles = [
    { id: "none", name: "없음" },
    { id: "slashWords", name: "단어 사이 /" },
    { id: "dotWords", name: "단어 사이 ·" },
    { id: "starWords", name: "단어 사이 ☆" },
    { id: "heartWords", name: "단어 사이 ♥" },
    { id: "ampWrap", name: "&문장&" },
    { id: "syllableSlash", name: "글자/사이/슬래시" },
    { id: "symbolCycle", name: "@*●○ 교차" },
    { id: "currencyCycle", name: "$₩¥ 교차" },
    { id: "phoneWrap", name: "☎ 문장 ☎" },
    { id: "spadeWrap", name: "♠ 1/3/7 ♠" },
    { id: "blockWords", name: "■단어■구분" },
    { id: "cornerQuote", name: "『문장』" },
    { id: "bulletWords", name: "단어•구분" },
    { id: "glitch", name: "기호 난입" }
  ];

  const templates = [
    { id: "breaking", name: "속보 배너", thumb: "linear-gradient(#aeb0b3 0 34%, #050505 34% 44%, #bd0000 44%)" },
    { id: "cobalt", name: "코발트 전단", thumb: "linear-gradient(#0d3d87 0 38%, #080808 38% 48%, #fff 48% 77%, #ffe800 77%)" },
    { id: "neon", name: "네온 과제", thumb: "linear-gradient(90deg,#d700f5 0 22%,#fff 22% 77%,#20d64d 77%)" },
    { id: "impact", name: "충격 지구", thumb: "radial-gradient(circle,#fff 0 22%,#2673bf 23% 58%,#0f4f8e 59%)" },
    { id: "lime", name: "형광 연구", thumb: "linear-gradient(#fff000 0 24%,#fff 24% 66%,#2cff00 66%)" },
    { id: "orange", name: "오렌지 특보", thumb: "linear-gradient(135deg,#ff7a00 0 38%,#081e42 38% 72%,#fff0d8 72%)" },
    { id: "checker", name: "체커 선전", thumb: "conic-gradient(#111 0 25%,#ff2f9a 0 50%,#111 0 75%,#37e8ff 0) 0 0/28px 28px" },
    { id: "mono", name: "흑백 호외", thumb: "linear-gradient(#f4f1e8 0 30%,#111 30% 42%,#f4f1e8 42% 70%,#ffe500 70%)" },
    { id: "alert", name: "적색 경보", thumb: "linear-gradient(90deg,#cc001a 0 64%,#00d9ef 64%)" },
    { id: "candy", name: "캔디 방송", thumb: "linear-gradient(120deg,#7f25ff,#ff3d9d 50%,#00e3b8)" }
  ];

  function makeText(text, overrides = {}) {
    return {
      id: uid(),
      text,
      fontFamily: "dotum",
      fontSize: 76,
      unicodeStyle: "none",
      align: "left",
      bold: true,
      italic: false,
      underline: false,
      strike: false,
      scaleX: 1,
      letterSpacing: 0,
      effect: "outline",
      outlineWidth: 5,
      colorMode: "auto",
      color: "#ffffff",
      effectColor: "#101010",
      gap: 12,
      rangeColors: [],
      ...overrides
    };
  }

  const initialState = {
    templateId: "cobalt",
    primary: "#0d47a1",
    secondary1: "#ffeb00",
    secondary2: "#ff3b30",
    useSecondary2: false,
    selectedTextId: null,
    selectedElementId: null,
    texts: [
      makeText("지금껏 아무도 알려주지 않은 충격의 진실", { fontSize: 104, fontFamily: "batang", italic: true }),
      makeText("♠ 1 / 3 / 7 / 억 / 년 / 전 / 통 / 보 / 장 / 회 / 그 / 맛 ♠", { fontSize: 45, effect: "none", align: "center" }),
      makeText("기력이 허하고 중력이 부족하신 분", { fontSize: 58, colorMode: "custom", color: "#111111", effect: "none" }),
      makeText("암흑물질이 싹! 해결해 드립니다!", { fontSize: 72, colorMode: "custom", color: "#ffffff", effect: "shadow", effectColor: "#111111" }),
      makeText("무엇이든 과감하게 강조하고 반복하십시오", { fontSize: 68, unicodeStyle: "slashWords", fontFamily: "batang" })
    ],
    elements: [
      { id: uid(), type: "burst", x: 990, y: 310, w: 420, h: 270, fill: "#ffffff", stroke: "#111111", strokeWidth: 4, rotation: 0, flowMargin: 26, affectFlow: true, label: "충격", labelSize: 112, labelColor: "#252833", imageFit: "cover" }
    ],
    jpgQuality: 0.92
  };

  let state = deepClone(initialState);
  state.selectedTextId = state.texts[0].id;
  let layoutFragments = [];
  let renderQueued = false;
  let dragState = null;
  let activeTextarea = null;
  let overflowed = false;
  let toastTimer = null;

  function selectedText() {
    return state.texts.find((item) => item.id === state.selectedTextId) || null;
  }
  function selectedElement() {
    return state.elements.find((item) => item.id === state.selectedElementId) || null;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }
  function mix(a, b, amount) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
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
  function contrastText(color) {
    return luminance(color) > 0.43 ? "#111111" : "#ffffff";
  }

  function roundedRectPath(context, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
  }

  function drawBackground(context) {
    const p = state.primary;
    const s1 = state.secondary1;
    const s2 = state.useSecondary2 ? state.secondary2 : mix(p, s1, 0.48);
    const dark = mix(p, "#000000", 0.72);
    const light = mix(s1, "#ffffff", 0.72);
    const template = state.templateId;

    context.save();
    context.clearRect(0, 0, W, H);
    context.fillStyle = p;
    context.fillRect(0, 0, W, H);

    if (template === "breaking") {
      context.fillStyle = mix("#ffffff", p, 0.32);
      context.fillRect(60, 55, 1480, 270);
      context.fillStyle = dark;
      context.fillRect(60, 328, 1480, 60);
      context.fillStyle = s1;
      roundedRectPath(context, 60, 410, 1480, 420, 22);
      context.fill();
      context.fillStyle = "#090909";
      roundedRectPath(context, 1020, 430, 490, 380, 28);
      context.fill();
      context.fillStyle = s2;
      context.beginPath();
      context.arc(270, 190, 130, 0, Math.PI * 2);
      context.fill();
    } else if (template === "cobalt") {
      context.fillStyle = dark;
      context.fillRect(0, 335, W, 74);
      context.fillStyle = mix("#ffffff", p, 0.08);
      roundedRectPath(context, 35, 430, 1000, 210, 22);
      context.fill();
      context.fillStyle = s1;
      roundedRectPath(context, 1055, 420, 510, 430, 26);
      context.fill();
      context.fillStyle = mix(p, "#000000", 0.2);
      context.fillRect(0, 660, 1040, 6);
    } else if (template === "neon") {
      context.fillStyle = mix(p, "#ffffff", 0.08);
      roundedRectPath(context, 320, 25, 930, 820, 28);
      context.fill();
      context.fillStyle = "#080808";
      context.fillRect(330, 250, 910, 82);
      const pills = [s2, s1, mix(s1, "#00ff40", 0.6), mix(p, "#00d5ff", 0.6)];
      pills.forEach((color, i) => {
        context.fillStyle = color;
        context.beginPath();
        context.ellipse(1350, 160 + i * 190, 175, 68, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(0,0,0,.82)";
        context.beginPath();
        context.ellipse(1375, 182 + i * 190, 175, 68, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = color;
        context.beginPath();
        context.ellipse(1350, 160 + i * 190, 175, 68, 0, 0, Math.PI * 2);
        context.fill();
      });
    } else if (template === "impact") {
      const grad = context.createRadialGradient(800, 445, 70, 800, 445, 520);
      grad.addColorStop(0, mix("#ffffff", s1, 0.12));
      grad.addColorStop(0.35, mix(p, "#2ea1d8", 0.35));
      grad.addColorStop(1, mix(p, "#000000", 0.38));
      context.fillStyle = grad;
      context.fillRect(0, 0, W, H);
      context.strokeStyle = "rgba(255,255,255,.28)";
      context.lineWidth = 5;
      context.beginPath();
      context.ellipse(760, 430, 510, 230, -0.12, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(255,255,255,.15)";
      context.beginPath();
      context.arc(420, 240, 170, 0, Math.PI * 2);
      context.fill();
    } else if (template === "lime") {
      context.fillStyle = s1;
      roundedRectPath(context, 30, 28, 1540, 240, 22);
      context.fill();
      context.fillStyle = "#ffffff";
      roundedRectPath(context, 30, 285, 1540, 330, 22);
      context.fill();
      context.fillStyle = s2;
      context.beginPath();
      context.ellipse(280, 440, 235, 150, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = mix(p, "#000000", 0.2);
      context.fillRect(0, 630, W, 8);
    } else if (template === "orange") {
      const grad = context.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, s1);
      grad.addColorStop(0.52, p);
      grad.addColorStop(1, dark);
      context.fillStyle = grad;
      context.fillRect(0, 0, W, H);
      context.fillStyle = light;
      roundedRectPath(context, 70, 100, 840, 320, 24);
      context.fill();
      context.fillStyle = s2;
      roundedRectPath(context, 970, 70, 520, 360, 30);
      context.fill();
      context.fillStyle = "rgba(255,255,255,.92)";
      roundedRectPath(context, 170, 500, 1260, 300, 22);
      context.fill();
    } else if (template === "checker") {
      const size = 90;
      for (let y = 0; y < H; y += size) {
        for (let x = 0; x < W; x += size) {
          context.fillStyle = ((x / size + y / size) % 2 === 0) ? dark : p;
          context.fillRect(x, y, size, size);
        }
      }
      context.fillStyle = "rgba(255,255,255,.95)";
      roundedRectPath(context, 90, 75, 1420, 250, 24);
      context.fill();
      context.fillStyle = s1;
      roundedRectPath(context, 90, 360, 620, 430, 24);
      context.fill();
      context.fillStyle = s2;
      roundedRectPath(context, 745, 360, 765, 430, 24);
      context.fill();
    } else if (template === "mono") {
      context.fillStyle = "#f3f0e6";
      context.fillRect(0, 0, W, H);
      context.fillStyle = "#111111";
      context.fillRect(0, 250, W, 94);
      context.fillRect(0, 710, W, 18);
      context.fillStyle = s1;
      context.fillRect(0, 725, W, 175);
      context.strokeStyle = "#111111";
      context.lineWidth = 5;
      context.strokeRect(40, 38, 1520, 820);
      context.fillStyle = s2;
      context.beginPath();
      context.arc(1280, 500, 170, 0, Math.PI * 2);
      context.fill();
    } else if (template === "alert") {
      context.fillStyle = p;
      context.fillRect(0, 0, W, H);
      context.fillStyle = dark;
      context.fillRect(1020, 0, 580, H);
      context.fillStyle = s1;
      context.fillRect(40, 45, 930, 230);
      context.fillStyle = "#ffffff";
      context.fillRect(40, 305, 930, 270);
      context.fillStyle = s2;
      context.fillRect(40, 605, 930, 250);
      context.strokeStyle = "rgba(255,255,255,.45)";
      context.lineWidth = 4;
      context.strokeRect(1045, 35, 510, 820);
    } else if (template === "candy") {
      const grad = context.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, p);
      grad.addColorStop(.5, s2);
      grad.addColorStop(1, s1);
      context.fillStyle = grad;
      context.fillRect(0, 0, W, H);
      context.globalAlpha = .24;
      for (let i = 0; i < 7; i++) {
        context.fillStyle = i % 2 ? "#ffffff" : "#000000";
        context.beginPath();
        context.arc(180 + i * 250, 120 + (i % 3) * 240, 110 + (i % 2) * 40, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.fillStyle = "rgba(255,255,255,.9)";
      roundedRectPath(context, 65, 70, 1470, 270, 44);
      context.fill();
      context.fillStyle = "rgba(0,0,0,.82)";
      roundedRectPath(context, 65, 380, 900, 420, 44);
      context.fill();
      context.fillStyle = "rgba(255,255,255,.9)";
      roundedRectPath(context, 1000, 380, 535, 420, 44);
      context.fill();
    }
    context.restore();
  }

  function shapePath(context, element) {
    const { type, w, h } = element;
    context.beginPath();
    if (type === "rect" || type === "image") {
      context.roundRect(-w / 2, -h / 2, w, h, Math.min(28, w * .08, h * .08));
    } else if (type === "circle") {
      context.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (type === "heart") {
      const x = -w / 2;
      const y = -h / 2;
      context.moveTo(x + w / 2, y + h * .92);
      context.bezierCurveTo(x + w * .08, y + h * .64, x + w * .05, y + h * .25, x + w * .28, y + h * .18);
      context.bezierCurveTo(x + w * .43, y + h * .13, x + w * .5, y + h * .24, x + w / 2, y + h * .31);
      context.bezierCurveTo(x + w * .5, y + h * .24, x + w * .57, y + h * .13, x + w * .72, y + h * .18);
      context.bezierCurveTo(x + w * .95, y + h * .25, x + w * .92, y + h * .64, x + w / 2, y + h * .92);
    } else if (type === "burst") {
      const spikes = 18;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = -Math.PI / 2 + (Math.PI * i) / spikes;
        const radiusX = (i % 2 === 0 ? .5 : .36) * w;
        const radiusY = (i % 2 === 0 ? .5 : .36) * h;
        const px = Math.cos(angle) * radiusX;
        const py = Math.sin(angle) * radiusY;
        if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.closePath();
    }
  }

  function drawImageFit(context, image, w, h, fit) {
    const scale = fit === "contain" ? Math.min(w / image.width, h / image.height) : Math.max(w / image.width, h / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    context.drawImage(image, -dw / 2, -dh / 2, dw, dh);
  }

  function drawElement(context, element) {
    context.save();
    context.translate(element.x + element.w / 2, element.y + element.h / 2);
    context.rotate((element.rotation || 0) * Math.PI / 180);
    shapePath(context, element);
    if (element.type === "image" && element.image) {
      context.save();
      context.clip();
      context.fillStyle = element.fill || "#dddddd";
      context.fillRect(-element.w / 2, -element.h / 2, element.w, element.h);
      drawImageFit(context, element.image, element.w, element.h, element.imageFit || "cover");
      context.restore();
    } else {
      context.fillStyle = element.fill || "#ffffff";
      context.fill();
    }
    if ((element.strokeWidth || 0) > 0) {
      shapePath(context, element);
      context.strokeStyle = element.stroke || "#111111";
      context.lineWidth = element.strokeWidth || 3;
      context.stroke();
    }
    if (element.label) {
      context.font = `700 ${element.labelSize || 64}px ${fontFamilies.dotum}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = element.labelColor || contrastText(element.fill || "#ffffff");
      const maxWidth = element.w * .72;
      const measured = context.measureText(element.label).width;
      const scale = measured > maxWidth ? maxWidth / measured : 1;
      context.save();
      context.scale(scale, 1);
      context.fillText(element.label, 0, 0);
      context.restore();
    }
    context.restore();
  }

  function elementBounds(element, margin = 0) {
    return {
      x: element.x - margin,
      y: element.y - margin,
      w: element.w + margin * 2,
      h: element.h + margin * 2
    };
  }

  function drawElements(context) {
    state.elements.forEach((element) => drawElement(context, element));
  }

  function originalGlyphs(text) {
    const glyphs = [];
    let index = 0;
    for (const ch of text) {
      glyphs.push({ ch, sourceIndex: index });
      index += ch.length;
    }
    return glyphs;
  }

  function inserted(ch, sourceIndex = -1) {
    return { ch, sourceIndex };
  }

  function transformGlyphs(item) {
    const base = originalGlyphs(item.text || "");
    const style = item.unicodeStyle || "none";
    if (style === "none") return base;
    if (style === "slashWords" || style === "dotWords" || style === "starWords" || style === "heartWords" || style === "bulletWords") {
      const symbol = { slashWords: "/", dotWords: "·", starWords: "☆", heartWords: "♥", bulletWords: "•" }[style];
      return base.map((g) => (/\s/.test(g.ch) ? inserted(symbol, g.sourceIndex) : g));
    }
    if (style === "ampWrap") return [inserted("&", 0), ...base, inserted("&", item.text.length)];
    if (style === "phoneWrap") return [inserted("☎", 0), inserted(" ", 0), ...base, inserted(" ", item.text.length), inserted("☎", item.text.length)];
    if (style === "spadeWrap") return [inserted("♠", 0), inserted(" ", 0), ...base, inserted(" ", item.text.length), inserted("♠", item.text.length)];
    if (style === "cornerQuote") return [inserted("『", 0), ...base, inserted("』", item.text.length)];
    if (style === "blockWords") return [inserted("■", 0), ...base.flatMap((g) => (/\s/.test(g.ch) ? [inserted("■", g.sourceIndex)] : [g])), inserted("■", item.text.length)];
    if (style === "syllableSlash") {
      const result = [];
      base.forEach((g, i) => {
        result.push(g);
        if (i < base.length - 1 && !/\s/.test(g.ch) && !/\s/.test(base[i + 1].ch)) result.push(inserted("/", base[i + 1].sourceIndex));
      });
      return result;
    }
    if (style === "symbolCycle" || style === "currencyCycle") {
      const symbols = style === "symbolCycle" ? ["@", "*", "●", "○"] : ["$", "₩", "¥"];
      const result = [];
      let n = 0;
      base.forEach((g, i) => {
        result.push(g);
        if (i < base.length - 1 && !/\s/.test(g.ch) && !/\s/.test(base[i + 1].ch)) {
          result.push(inserted(symbols[n % symbols.length], base[i + 1].sourceIndex));
          n += 1;
        }
      });
      return result;
    }
    if (style === "glitch") {
      const symbols = ["@", "*", "/", "·", "☆", "$", "●"];
      const result = [];
      base.forEach((g, i) => {
        result.push(g);
        if (!/\s/.test(g.ch) && i % 3 === 1) result.push(inserted(symbols[i % symbols.length], g.sourceIndex));
      });
      return result;
    }
    return base;
  }

  function setFont(context, item, fontSize) {
    const style = item.italic ? "italic" : "normal";
    const weight = item.bold ? 700 : 500;
    context.font = `${style} ${weight} ${fontSize}px ${fontFamilies[item.fontFamily] || fontFamilies.dotum}`;
  }

  function glyphWidth(context, glyph, item) {
    return context.measureText(glyph.ch).width + item.letterSpacing;
  }

  function fitGlyphs(glyphs, start, maxWidth, item, fontSize) {
    setFont(ctx, item, fontSize);
    const available = maxWidth / item.scaleX;
    let width = 0;
    let end = start;
    let forcedBreak = false;
    while (end < glyphs.length) {
      const g = glyphs[end];
      if (g.ch === "\n") {
        forcedBreak = true;
        end += 1;
        break;
      }
      const nextWidth = width + glyphWidth(ctx, g, item);
      if (nextWidth > available && end > start) break;
      if (nextWidth > available && end === start) {
        end += 1;
        width = nextWidth;
        break;
      }
      width = nextWidth;
      end += 1;
    }
    return { end, width: Math.max(0, width - item.letterSpacing), forcedBreak };
  }

  function freeIntervals(y, lineHeight) {
    let intervals = [[SAFE.x, SAFE.x + SAFE.w]];
    const obstacles = state.elements
      .filter((element) => element.affectFlow)
      .map((element) => elementBounds(element, element.flowMargin || 0))
      .filter((b) => b.y < y + lineHeight && b.y + b.h > y);

    for (const obstacle of obstacles) {
      const next = [];
      for (const [a, b] of intervals) {
        const left = obstacle.x;
        const right = obstacle.x + obstacle.w;
        if (right <= a || left >= b) {
          next.push([a, b]);
        } else {
          if (left > a) next.push([a, Math.max(a, left)]);
          if (right < b) next.push([Math.min(b, right), b]);
        }
      }
      intervals = next;
    }
    return intervals.filter(([a, b]) => b - a >= 48).sort((A, B) => A[0] - B[0]);
  }

  function alignX(interval, width, align) {
    if (align === "center") return interval[0] + (interval[1] - interval[0] - width) / 2;
    if (align === "right") return interval[1] - width;
    return interval[0];
  }

  function layoutTexts() {
    const attempts = [1, .94, .88, .82, .76, .7, .64, .58];
    overflowed = false;
    for (const globalScale of attempts) {
      const fragments = [];
      let y = SAFE.y;
      let complete = true;
      for (const item of state.texts) {
        const glyphs = transformGlyphs(item);
        if (!glyphs.length) continue;
        const fontSize = Math.max(18, Math.round(item.fontSize * globalScale));
        const lineHeight = Math.ceil(fontSize * 1.16);
        let index = 0;
        let guard = 0;
        while (index < glyphs.length && y + lineHeight <= SAFE.y + SAFE.h && guard < 500) {
          guard += 1;
          const intervals = freeIntervals(y, lineHeight)
            .filter(([a, b]) => b - a >= Math.max(80, fontSize * .9));
          if (!intervals.length) {
            y += Math.max(8, Math.floor(lineHeight * .42));
            continue;
          }
          let wroteLine = false;
          for (const interval of intervals) {
            while (index < glyphs.length && /\s/.test(glyphs[index].ch) && glyphs[index].ch !== "\n") index += 1;
            if (index >= glyphs.length) break;
            if (glyphs[index].ch === "\n") {
              index += 1;
              wroteLine = true;
              break;
            }
            const maxWidth = interval[1] - interval[0];
            const fit = fitGlyphs(glyphs, index, maxWidth, item, fontSize);
            if (fit.end <= index) continue;
            const actualWidth = fit.width * item.scaleX;
            fragments.push({
              item,
              glyphs: glyphs.slice(index, fit.end).filter((g) => g.ch !== "\n"),
              x: alignX(interval, actualWidth, item.align),
              y,
              width: actualWidth,
              fontSize,
              lineHeight
            });
            index = fit.end;
            wroteLine = true;
            if (fit.forcedBreak) break;
          }
          if (wroteLine) y += lineHeight;
          else y += Math.max(8, Math.floor(lineHeight * .42));
        }
        if (index < glyphs.length) {
          complete = false;
          break;
        }
        y += Math.round(item.gap * globalScale);
      }
      if (complete) return fragments;
      if (globalScale === attempts[attempts.length - 1]) overflowed = true;
    }
    return [];
  }

  function sampleAutoColor(x, y) {
    const px = sceneCtx.getImageData(clamp(Math.round(x), 0, W - 1), clamp(Math.round(y), 0, H - 1), 1, 1).data;
    const lum = (0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]) / 255;
    return lum > .56 ? "#111111" : "#ffffff";
  }

  function glyphColor(item, glyph, x, y) {
    const range = item.rangeColors.find((entry) => glyph.sourceIndex >= entry.start && glyph.sourceIndex < entry.end);
    if (range) return range.color;
    if (item.colorMode === "custom") return item.color;
    return sampleAutoColor(x, y);
  }

  function drawFragment(context, fragment) {
    const item = fragment.item;
    const { fontSize } = fragment;
    setFont(context, item, fontSize);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    const baseline = fontSize;
    context.save();
    context.translate(fragment.x, fragment.y);
    context.scale(item.scaleX, 1);
    let x = 0;
    const advances = [];
    for (const glyph of fragment.glyphs) {
      const actualX = fragment.x + x * item.scaleX;
      const color = glyphColor(item, glyph, actualX, fragment.y + fontSize * .5);
      context.save();
      if (item.effect === "shadow") {
        context.shadowColor = item.effectColor;
        context.shadowOffsetX = Math.max(2, fontSize * .08);
        context.shadowOffsetY = Math.max(2, fontSize * .08);
        context.shadowBlur = Math.max(0, fontSize * .035);
      }
      if (item.effect === "hollow") {
        context.shadowColor = "transparent";
        context.lineJoin = "round";
        context.strokeStyle = item.effectColor;
        context.lineWidth = Math.max(2, item.outlineWidth + 1);
        context.strokeText(glyph.ch, x + fontSize * .09, baseline + fontSize * .09);
      }
      if (item.effect === "outline" || item.effect === "shadow") {
        context.lineJoin = "round";
        context.strokeStyle = item.effectColor;
        context.lineWidth = item.outlineWidth;
        if (item.outlineWidth > 0) context.strokeText(glyph.ch, x, baseline);
      }
      context.fillStyle = color;
      context.fillText(glyph.ch, x, baseline);
      context.restore();
      const advance = glyphWidth(context, glyph, item);
      advances.push({ x, advance });
      x += advance;
    }
    const visualWidth = Math.max(0, x - item.letterSpacing);
    context.strokeStyle = item.colorMode === "custom" ? item.color : sampleAutoColor(fragment.x + fragment.width / 2, fragment.y + fontSize * .5);
    context.lineWidth = Math.max(2, fontSize * .045);
    if (item.underline) {
      context.beginPath();
      context.moveTo(0, baseline + fontSize * .11);
      context.lineTo(visualWidth, baseline + fontSize * .11);
      context.stroke();
    }
    if (item.strike) {
      context.beginPath();
      context.moveTo(0, baseline - fontSize * .34);
      context.lineTo(visualWidth, baseline - fontSize * .34);
      context.stroke();
    }
    context.restore();
  }

  function drawSelection(context) {
    const element = selectedElement();
    if (!element) return;
    context.save();
    context.strokeStyle = "#ffea00";
    context.lineWidth = 4;
    context.setLineDash([10, 7]);
    context.strokeRect(element.x - 4, element.y - 4, element.w + 8, element.h + 8);
    context.setLineDash([]);
    const handles = resizeHandles(element);
    context.fillStyle = "#ffea00";
    context.strokeStyle = "#111111";
    context.lineWidth = 2;
    handles.forEach((h) => {
      context.fillRect(h.x - 8, h.y - 8, 16, 16);
      context.strokeRect(h.x - 8, h.y - 8, 16, 16);
    });
    context.restore();
  }

  function render() {
    renderQueued = false;
    drawBackground(sceneCtx);
    drawElements(sceneCtx);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(sceneCanvas, 0, 0);
    layoutFragments = layoutTexts();
    layoutFragments.forEach((fragment) => drawFragment(ctx, fragment));
    drawSelection(ctx);
    const status = $("layoutStatus");
    if (overflowed) {
      status.textContent = "문장이 넘칩니다 — 크기를 줄여 주세요";
      status.classList.add("warn");
    } else {
      status.textContent = `${state.texts.length}개 문장 자동 배치됨`;
      status.classList.remove("warn");
    }
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  function renderTemplates() {
    const grid = $("templateGrid");
    grid.innerHTML = "";
    templates.forEach((template) => {
      const button = document.createElement("button");
      button.className = `template-card${state.templateId === template.id ? " active" : ""}`;
      button.innerHTML = `<span class="template-thumb" style="background:${template.thumb}"></span><strong>${template.name}</strong><br><small>${template.id}</small>`;
      button.addEventListener("click", () => {
        state.templateId = template.id;
        renderTemplates();
        queueRender();
      });
      grid.appendChild(button);
    });
  }

  function renderTextList() {
    const list = $("textList");
    list.innerHTML = "";
    state.texts.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = `text-card${item.id === state.selectedTextId ? " active" : ""}`;
      card.dataset.id = item.id;
      const label = document.createElement("div");
      label.className = "text-card-index";
      label.textContent = `문장 ${index + 1}`;
      const textarea = document.createElement("textarea");
      textarea.value = item.text;
      textarea.placeholder = "넣을 문장을 입력하세요";
      textarea.addEventListener("focus", () => {
        activeTextarea = textarea;
        selectText(item.id);
      });
      textarea.addEventListener("click", () => selectText(item.id));
      textarea.addEventListener("input", () => {
        item.text = textarea.value;
        queueRender();
      });
      const actions = document.createElement("div");
      actions.className = "text-card-actions";
      const up = document.createElement("button");
      up.textContent = "↑";
      up.title = "위로";
      up.addEventListener("click", () => moveText(index, -1));
      const down = document.createElement("button");
      down.textContent = "↓";
      down.title = "아래로";
      down.addEventListener("click", () => moveText(index, 1));
      const duplicate = document.createElement("button");
      duplicate.textContent = "복제";
      duplicate.addEventListener("click", () => duplicateText(item.id));
      const del = document.createElement("button");
      del.textContent = "삭제";
      del.addEventListener("click", () => deleteText(item.id));
      actions.append(up, down, duplicate, del);
      card.append(label, textarea, actions);
      list.appendChild(card);
    });
  }

  function selectText(id) {
    state.selectedTextId = id;
    state.selectedElementId = null;
    renderTextList();
    syncTextControls();
    syncElementControls();
    queueRender();
  }

  function moveText(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= state.texts.length) return;
    [state.texts[index], state.texts[next]] = [state.texts[next], state.texts[index]];
    renderTextList();
    queueRender();
  }

  function duplicateText(id) {
    const index = state.texts.findIndex((item) => item.id === id);
    if (index < 0) return;
    const copy = deepClone(state.texts[index]);
    copy.id = uid();
    state.texts.splice(index + 1, 0, copy);
    state.selectedTextId = copy.id;
    renderTextList();
    syncTextControls();
    queueRender();
  }

  function deleteText(id) {
    if (state.texts.length <= 1) {
      showToast("문장은 최소 한 개 필요합니다.");
      return;
    }
    const index = state.texts.findIndex((item) => item.id === id);
    state.texts.splice(index, 1);
    if (state.selectedTextId === id) state.selectedTextId = state.texts[Math.max(0, index - 1)].id;
    renderTextList();
    syncTextControls();
    queueRender();
  }

  function populateUnicodeStyles() {
    const select = $("unicodeStyle");
    select.innerHTML = unicodeStyles.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
  }

  function syncTextControls() {
    const item = selectedText();
    const controls = $("textControls");
    if (!item) {
      controls.classList.add("disabled-panel");
      return;
    }
    controls.classList.remove("disabled-panel");
    $("fontFamily").value = item.fontFamily;
    $("fontSize").value = item.fontSize;
    $("unicodeStyle").value = item.unicodeStyle;
    $("textAlign").value = item.align;
    $("boldToggle").checked = item.bold;
    $("italicToggle").checked = item.italic;
    $("underlineToggle").checked = item.underline;
    $("strikeToggle").checked = item.strike;
    $("scaleX").value = Math.round(item.scaleX * 100);
    $("scaleXValue").textContent = `${Math.round(item.scaleX * 100)}%`;
    $("letterSpacing").value = item.letterSpacing;
    $("letterSpacingValue").textContent = item.letterSpacing;
    $("textEffect").value = item.effect;
    $("outlineWidth").value = item.outlineWidth;
    $("colorMode").value = item.colorMode;
    $("textColor").value = item.color;
    $("effectColor").value = item.effectColor;
    $("textGap").value = item.gap;
    renderRangeColorList();
  }

  function renderRangeColorList() {
    const item = selectedText();
    const list = $("rangeColorList");
    list.innerHTML = "";
    if (!item) return;
    item.rangeColors.forEach((entry, index) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const preview = item.text.slice(entry.start, entry.end) || `${entry.start}-${entry.end}`;
      chip.innerHTML = `<span class="chip-swatch" style="background:${entry.color}"></span><span>${escapeHtml(preview.slice(0, 10))}</span>`;
      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        item.rangeColors.splice(index, 1);
        renderRangeColorList();
        queueRender();
      });
      chip.appendChild(remove);
      list.appendChild(chip);
    });
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  function bindTextControl(id, event, key, parse = (v) => v) {
    $(id).addEventListener(event, (e) => {
      const item = selectedText();
      if (!item) return;
      item[key] = parse(e.target.type === "checkbox" ? e.target.checked : e.target.value);
      syncTextControls();
      queueRender();
    });
  }

  function addShape(type) {
    const defaults = {
      rect: { w: 390, h: 220, label: "", labelSize: 72 },
      circle: { w: 280, h: 280, label: "", labelSize: 72 },
      heart: { w: 300, h: 270, label: "", labelSize: 64 },
      burst: { w: 380, h: 270, label: "충격", labelSize: 100 }
    }[type];
    const element = {
      id: uid(), type,
      x: W * .58, y: H * .34,
      w: defaults.w, h: defaults.h,
      fill: state.secondary1, stroke: "#111111", strokeWidth: 4,
      rotation: 0, flowMargin: 24, affectFlow: true,
      label: defaults.label, labelSize: defaults.labelSize,
      labelColor: contrastText(state.secondary1), imageFit: "cover"
    };
    state.elements.push(element);
    state.selectedElementId = element.id;
    state.selectedTextId = null;
    renderTextList();
    syncTextControls();
    syncElementControls();
    queueRender();
  }

  function addPhoto(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxW = 560;
        const maxH = 420;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const element = {
          id: uid(), type: "image", image, src: reader.result,
          x: 870, y: 260,
          w: Math.max(180, image.width * scale), h: Math.max(120, image.height * scale),
          fill: "#dddddd", stroke: "#111111", strokeWidth: 4,
          rotation: 0, flowMargin: 28, affectFlow: true,
          label: "", labelSize: 64, labelColor: "#ffffff", imageFit: "cover"
        };
        state.elements.push(element);
        state.selectedElementId = element.id;
        state.selectedTextId = null;
        renderTextList();
        syncTextControls();
        syncElementControls();
        queueRender();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function syncElementControls() {
    const element = selectedElement();
    const panel = $("elementControls");
    if (!element) {
      panel.classList.add("disabled-panel");
      return;
    }
    panel.classList.remove("disabled-panel");
    $("elementW").value = Math.round(element.w);
    $("elementH").value = Math.round(element.h);
    $("elementFill").value = element.fill || "#ffffff";
    $("elementStroke").value = element.stroke || "#111111";
    $("elementRotation").value = element.rotation || 0;
    $("rotationValue").textContent = `${element.rotation || 0}°`;
    $("flowMargin").value = element.flowMargin || 0;
    $("flowMarginValue").textContent = element.flowMargin || 0;
    $("affectFlow").checked = element.affectFlow !== false;
    $("elementLabel").value = element.label || "";
    $("elementLabelSize").value = element.labelSize || 64;
    $("elementLabelColor").value = element.labelColor || "#111111";
    $("imageFit").value = element.imageFit || "cover";
    $("imageFit").disabled = element.type !== "image";
  }

  function bindElementControl(id, event, key, parse = (v) => v) {
    $(id).addEventListener(event, (e) => {
      const element = selectedElement();
      if (!element) return;
      element[key] = parse(e.target.type === "checkbox" ? e.target.checked : e.target.value);
      syncElementControls();
      queueRender();
    });
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (W / rect.width), y: (event.clientY - rect.top) * (H / rect.height) };
  }

  function hitElement(point) {
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const e = state.elements[i];
      if (point.x >= e.x && point.x <= e.x + e.w && point.y >= e.y && point.y <= e.y + e.h) return e;
    }
    return null;
  }

  function resizeHandles(element) {
    return [
      { key: "nw", x: element.x, y: element.y },
      { key: "ne", x: element.x + element.w, y: element.y },
      { key: "sw", x: element.x, y: element.y + element.h },
      { key: "se", x: element.x + element.w, y: element.y + element.h }
    ];
  }

  function hitHandle(point, element) {
    if (!element) return null;
    const radius = 18;
    return resizeHandles(element).find((h) => Math.abs(point.x - h.x) <= radius && Math.abs(point.y - h.y) <= radius) || null;
  }

  canvas.addEventListener("pointerdown", (event) => {
    const point = canvasPoint(event);
    const current = selectedElement();
    const handle = hitHandle(point, current);
    if (handle && current) {
      dragState = { mode: "resize", handle: handle.key, start: point, original: { x: current.x, y: current.y, w: current.w, h: current.h }, id: current.id };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    const hit = hitElement(point);
    if (hit) {
      state.selectedElementId = hit.id;
      state.selectedTextId = null;
      dragState = { mode: "move", id: hit.id, dx: point.x - hit.x, dy: point.y - hit.y };
      canvas.setPointerCapture(event.pointerId);
      renderTextList();
      syncTextControls();
      syncElementControls();
      queueRender();
    } else {
      state.selectedElementId = null;
      syncElementControls();
      queueRender();
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragState) return;
    const point = canvasPoint(event);
    const element = state.elements.find((e) => e.id === dragState.id);
    if (!element) return;
    if (dragState.mode === "move") {
      element.x = clamp(point.x - dragState.dx, 0, W - element.w);
      element.y = clamp(point.y - dragState.dy, 0, H - element.h);
    } else if (dragState.mode === "resize") {
      const o = dragState.original;
      let x1 = o.x;
      let y1 = o.y;
      let x2 = o.x + o.w;
      let y2 = o.y + o.h;
      if (dragState.handle.includes("w")) x1 = clamp(point.x, 0, x2 - 40);
      if (dragState.handle.includes("e")) x2 = clamp(point.x, x1 + 40, W);
      if (dragState.handle.includes("n")) y1 = clamp(point.y, 0, y2 - 40);
      if (dragState.handle.includes("s")) y2 = clamp(point.y, y1 + 40, H);
      element.x = x1;
      element.y = y1;
      element.w = x2 - x1;
      element.h = y2 - y1;
    }
    syncElementControls();
    queueRender();
  });

  function endPointer(event) {
    if (dragState && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    dragState = null;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  document.addEventListener("keydown", (event) => {
    if ((event.key === "Delete" || event.key === "Backspace") && selectedElement() && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      deleteSelectedElement();
    }
  });

  function deleteSelectedElement() {
    const id = state.selectedElementId;
    if (!id) return;
    state.elements = state.elements.filter((e) => e.id !== id);
    state.selectedElementId = null;
    syncElementControls();
    queueRender();
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function exportCanvas(type) {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const mime = type === "jpg" ? "image/jpeg" : "image/png";
    const ext = type === "jpg" ? "jpg" : "png";
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = W;
    exportCanvas.height = H;
    const exportCtx = exportCanvas.getContext("2d");
    if (type === "jpg") {
      exportCtx.fillStyle = "#ffffff";
      exportCtx.fillRect(0, 0, W, H);
    }
    const selected = state.selectedElementId;
    state.selectedElementId = null;
    render();
    exportCtx.drawImage(canvas, 0, 0);
    state.selectedElementId = selected;
    queueRender();
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jjirasi-${stamp}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`${ext.toUpperCase()} 저장을 시작했습니다.`);
    }, mime, state.jpgQuality);
  }

  function resetState() {
    if (!confirm("현재 작업을 지우고 처음 상태로 돌아갈까요?")) return;
    state = deepClone(initialState);
    state.selectedTextId = state.texts[0].id;
    hydrateImages();
    syncGlobalControls();
    renderTemplates();
    renderTextList();
    syncTextControls();
    syncElementControls();
    queueRender();
  }

  function hydrateImages() {
    state.elements.forEach((e) => {
      if (e.type === "image" && e.src && !e.image) {
        const image = new Image();
        image.onload = queueRender;
        image.src = e.src;
        e.image = image;
      }
    });
  }

  function syncGlobalControls() {
    $("primaryColor").value = state.primary;
    $("secondaryColor1").value = state.secondary1;
    $("secondaryColor2").value = state.secondary2;
    $("useSecondary2").checked = state.useSecondary2;
    $("secondary2Wrap").classList.toggle("hidden", !state.useSecondary2);
    $("jpgQuality").value = Math.round(state.jpgQuality * 100);
    $("jpgQualityValue").textContent = `${Math.round(state.jpgQuality * 100)}%`;
  }

  function bindUI() {
    $("addTextBtn").addEventListener("click", () => {
      const item = makeText("새 문장을 입력하세요", { fontSize: 64 });
      state.texts.push(item);
      state.selectedTextId = item.id;
      state.selectedElementId = null;
      renderTextList();
      syncTextControls();
      syncElementControls();
      queueRender();
      setTimeout(() => {
        const card = document.querySelector(`.text-card[data-id="${item.id}"] textarea`);
        card?.focus();
        card?.select();
      }, 0);
    });

    $("primaryColor").addEventListener("input", (e) => { state.primary = e.target.value; queueRender(); });
    $("secondaryColor1").addEventListener("input", (e) => { state.secondary1 = e.target.value; queueRender(); });
    $("secondaryColor2").addEventListener("input", (e) => { state.secondary2 = e.target.value; queueRender(); });
    $("useSecondary2").addEventListener("change", (e) => {
      state.useSecondary2 = e.target.checked;
      $("secondary2Wrap").classList.toggle("hidden", !state.useSecondary2);
      queueRender();
    });

    bindTextControl("fontFamily", "change", "fontFamily");
    bindTextControl("fontSize", "input", "fontSize", Number);
    bindTextControl("unicodeStyle", "change", "unicodeStyle");
    bindTextControl("textAlign", "change", "align");
    bindTextControl("boldToggle", "change", "bold", Boolean);
    bindTextControl("italicToggle", "change", "italic", Boolean);
    bindTextControl("underlineToggle", "change", "underline", Boolean);
    bindTextControl("strikeToggle", "change", "strike", Boolean);
    bindTextControl("scaleX", "input", "scaleX", (v) => Number(v) / 100);
    bindTextControl("letterSpacing", "input", "letterSpacing", Number);
    bindTextControl("textEffect", "change", "effect");
    bindTextControl("outlineWidth", "input", "outlineWidth", Number);
    bindTextControl("colorMode", "change", "colorMode");
    bindTextControl("textColor", "input", "color");
    bindTextControl("effectColor", "input", "effectColor");
    bindTextControl("textGap", "input", "gap", Number);

    $("applyRangeColorBtn").addEventListener("click", () => {
      const item = selectedText();
      if (!item || !activeTextarea || activeTextarea.closest(".text-card")?.dataset.id !== item.id) {
        showToast("먼저 선택한 문장의 입력창에서 글자를 드래그하세요.");
        return;
      }
      const start = activeTextarea.selectionStart;
      const end = activeTextarea.selectionEnd;
      if (start === end) {
        showToast("색을 바꿀 글자를 드래그해 선택하세요.");
        return;
      }
      item.rangeColors.push({ start, end, color: $("rangeColor").value });
      renderRangeColorList();
      queueRender();
    });

    document.querySelectorAll("[data-add-shape]").forEach((button) => {
      button.addEventListener("click", () => addShape(button.dataset.addShape));
    });
    $("addPhotoBtn").addEventListener("click", () => $("photoInput").click());
    $("photoInput").addEventListener("change", (e) => {
      addPhoto(e.target.files?.[0]);
      e.target.value = "";
    });

    bindElementControl("elementW", "input", "w", Number);
    bindElementControl("elementH", "input", "h", Number);
    bindElementControl("elementFill", "input", "fill");
    bindElementControl("elementStroke", "input", "stroke");
    bindElementControl("elementRotation", "input", "rotation", Number);
    bindElementControl("flowMargin", "input", "flowMargin", Number);
    bindElementControl("affectFlow", "change", "affectFlow", Boolean);
    bindElementControl("elementLabel", "input", "label");
    bindElementControl("elementLabelSize", "input", "labelSize", Number);
    bindElementControl("elementLabelColor", "input", "labelColor");
    bindElementControl("imageFit", "change", "imageFit");
    $("deleteElementBtn").addEventListener("click", deleteSelectedElement);

    $("jpgQuality").addEventListener("input", (e) => {
      state.jpgQuality = Number(e.target.value) / 100;
      $("jpgQualityValue").textContent = `${e.target.value}%`;
    });
    $("exportPngBtn").addEventListener("click", () => exportCanvas("png"));
    $("exportPngBtn2").addEventListener("click", () => exportCanvas("png"));
    $("exportJpgBtn").addEventListener("click", () => exportCanvas("jpg"));
    $("exportJpgBtn2").addEventListener("click", () => exportCanvas("jpg"));
    $("rerenderBtn").addEventListener("click", () => { queueRender(); showToast("자동 배치를 다시 계산했습니다."); });
    $("resetBtn").addEventListener("click", resetState);
  }

  async function init() {
    populateUnicodeStyles();
    bindUI();
    syncGlobalControls();
    renderTemplates();
    renderTextList();
    syncTextControls();
    syncElementControls();
    try { await document.fonts.ready; } catch (_) {}
    render();
  }

  init();
})();
