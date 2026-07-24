cat > install-all-fonts.sh <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

FONT_DIR="assets/fonts"
mkdir -p "$FONT_DIR"

command -v unzip >/dev/null 2>&1 || {
  echo "오류: unzip 명령을 찾지 못했습니다." >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || {
  echo "오류: python3 명령을 찾지 못했습니다." >&2
  exit 1
}

[[ -f styles.css ]] || {
  echo "오류: styles.css를 찾지 못했습니다." >&2
  echo "저장소 최상위에서 실행하세요." >&2
  exit 1
}

[[ -f app.js ]] || {
  echo "오류: app.js를 찾지 못했습니다." >&2
  echo "저장소 최상위에서 실행하세요." >&2
  exit 1
}

TMP_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_ROOT"
}

trap cleanup EXIT

lower_extension() {
  local value="$1"
  printf '%s' "${value,,}"
}

copy_first_font() {
  local source_dir="$1"
  local destination_base="$2"

  local source_file
  source_file="$(
    find "$source_dir" -type f \
      \( -iname '*.ttf' -o -iname '*.otf' \) \
      -print -quit
  )"

  if [[ -z "$source_file" ]]; then
    return 1
  fi

  local extension
  extension="$(lower_extension "${source_file##*.}")"

  rm -f \
    "${destination_base}.ttf" \
    "${destination_base}.otf"

  cp -f "$source_file" "${destination_base}.${extension}"

  echo "  설치: ${destination_base}.${extension}"
}

copy_matching_font() {
  local source_dir="$1"
  local destination_base="$2"
  shift 2

  local source_file=""
  local pattern

  for pattern in "$@"; do
    source_file="$(
      find "$source_dir" -type f \
        \( -iname '*.ttf' -o -iname '*.otf' \) \
        -iname "$pattern" \
        -print -quit
    )"

    if [[ -n "$source_file" ]]; then
      break
    fi
  done

  if [[ -z "$source_file" ]]; then
    return 1
  fi

  local extension
  extension="$(lower_extension "${source_file##*.}")"

  rm -f \
    "${destination_base}.ttf" \
    "${destination_base}.otf"

  cp -f "$source_file" "${destination_base}.${extension}"

  echo "  설치: ${destination_base}.${extension}"
}

echo
echo "========================================"
echo "1. Pretendard Variable 설치"
echo "========================================"

PRETENDARD_DEST="$FONT_DIR/PretendardVariable.woff2"

if [[ -f "$PRETENDARD_DEST" ]]; then
  echo "  이미 설치됨: $PRETENDARD_DEST"
else
  PRETENDARD_SOURCE="$(
    find . -maxdepth 4 -type f \
      -iname 'PretendardVariable.woff2' \
      ! -path "./$FONT_DIR/*" \
      -print -quit
  )"

  if [[ -z "$PRETENDARD_SOURCE" ]]; then
    echo "오류: PretendardVariable.woff2를 찾지 못했습니다." >&2
    exit 1
  fi

  mv -f "$PRETENDARD_SOURCE" "$PRETENDARD_DEST"
  echo "  이동 완료: $PRETENDARD_DEST"
fi

echo
echo "========================================"
echo "2. KoPub 폰트 설치"
echo "========================================"

KOPUB_REQUIRED=(
  "KoPubBatang-Light"
  "KoPubBatang-Medium"
  "KoPubBatang-Bold"
  "KoPubDotum-Light"
  "KoPubDotum-Medium"
  "KoPubDotum-Bold"
)

KOPUB_NEEDS_INSTALL=0

for base in "${KOPUB_REQUIRED[@]}"; do
  if [[ ! -f "$FONT_DIR/$base.otf" && ! -f "$FONT_DIR/$base.ttf" ]]; then
    KOPUB_NEEDS_INSTALL=1
    break
  fi
done

if [[ "$KOPUB_NEEDS_INSTALL" -eq 1 ]]; then
  KOPUB_ZIP="KOPUB2.0_OTF_FONTS.zip"

  if [[ ! -f "$KOPUB_ZIP" ]]; then
    echo "오류: $KOPUB_ZIP 파일을 찾지 못했습니다." >&2
    exit 1
  fi

  KOPUB_TMP="$TMP_ROOT/kopub"
  mkdir -p "$KOPUB_TMP"

  unzip -q -o "$KOPUB_ZIP" -d "$KOPUB_TMP"

  copy_matching_font \
    "$KOPUB_TMP" \
    "$FONT_DIR/KoPubBatang-Light" \
    '*KoPub*Batang*Light*' \
    '*Batang*Light*' ||
    {
      echo "오류: KoPub 바탕 Light를 찾지 못했습니다." >&2
      exit 1
    }

  copy_matching_font \
    "$KOPUB_TMP" \
    "$FONT_DIR/KoPubBatang-Medium" \
    '*KoPub*Batang*Medium*' \
    '*Batang*Medium*' ||
    {
      echo "오류: KoPub 바탕 Medium을 찾지 못했습니다." >&2
      exit 1
    }

  copy_matching_font \
    "$KOPUB_TMP" \
    "$FONT_DIR/KoPubBatang-Bold" \
    '*KoPub*Batang*Bold*' \
    '*Batang*Bold*' ||
    {
      echo "오류: KoPub 바탕 Bold를 찾지 못했습니다." >&2
      exit 1
    }

  copy_matching_font \
    "$KOPUB_TMP" \
    "$FONT_DIR/KoPubDotum-Light" \
    '*KoPub*Dotum*Light*' \
    '*Dotum*Light*' ||
    {
      echo "오류: KoPub 돋움 Light를 찾지 못했습니다." >&2
      exit 1
    }

  copy_matching_font \
    "$KOPUB_TMP" \
    "$FONT_DIR/KoPubDotum-Medium" \
    '*KoPub*Dotum*Medium*' \
    '*Dotum*Medium*' ||
    {
      echo "오류: KoPub 돋움 Medium을 찾지 못했습니다." >&2
      exit 1
    }

  copy_matching_font \
    "$KOPUB_TMP" \
    "$FONT_DIR/KoPubDotum-Bold" \
    '*KoPub*Dotum*Bold*' \
    '*Dotum*Bold*' ||
    {
      echo "오류: KoPub 돋움 Bold를 찾지 못했습니다." >&2
      exit 1
    }
else
  echo "  KoPub 폰트가 이미 설치되어 있습니다."
fi

echo
echo "========================================"
echo "3. 조선 폰트 8종 설치"
echo "========================================"

CHOSUN_CODES=(
  ChosunSm
  ChosunKm
  ChosunKg
  ChosunSg
  ChosunBg
  ChosunGu
  ChosunLo
  ChosunGs
)

for code in "${CHOSUN_CODES[@]}"; do
  if [[ -f "$FONT_DIR/$code.ttf" || -f "$FONT_DIR/$code.otf" ]]; then
    echo "  이미 설치됨: $code"
    continue
  fi

  zip_file="${code}.zip"

  if [[ ! -f "$zip_file" ]]; then
    echo "오류: $zip_file 파일을 찾지 못했습니다." >&2
    exit 1
  fi

  zip_tmp="$TMP_ROOT/$code"
  mkdir -p "$zip_tmp"

  unzip -q -o "$zip_file" -d "$zip_tmp"

  copy_first_font "$zip_tmp" "$FONT_DIR/$code" ||
    {
      echo "오류: $zip_file 안에서 TTF 또는 OTF 파일을 찾지 못했습니다." >&2
      exit 1
    }
done

echo
echo "========================================"
echo "4. CSS 및 JavaScript 연결"
echo "========================================"

BACKUP_TAG="$(date +%Y%m%d-%H%M%S)"

cp -f styles.css "styles.css.backup-$BACKUP_TAG"
cp -f app.js "app.js.backup-$BACKUP_TAG"

if [[ -f index.html ]]; then
  cp -f index.html "index.html.backup-$BACKUP_TAG"
fi

python3 <<'PY'
from pathlib import Path
import re

font_dir = Path("assets/fonts")
styles_path = Path("styles.css")
app_path = Path("app.js")
index_path = Path("index.html")


def find_font(base: str) -> tuple[str, str]:
    candidates = [
        (font_dir / f"{base}.woff2", "woff2"),
        (font_dir / f"{base}.ttf", "truetype"),
        (font_dir / f"{base}.otf", "opentype"),
    ]

    for path, font_format in candidates:
        if path.exists():
            return path.as_posix(), font_format

    raise SystemExit(f"폰트 파일을 찾지 못했습니다: {base}")


def font_face(
    family: str,
    base: str,
    weight: str,
    style: str = "normal",
) -> str:
    path, font_format = find_font(base)

    return f'''@font-face {{
  font-family: "{family}";
  src: url("{path}") format("{font_format}");
  font-style: {style};
  font-weight: {weight};
  font-display: swap;
}}'''


pretendard_path, pretendard_format = find_font(
    "PretendardVariable"
)

font_blocks = [
    f'''@font-face {{
  font-family: "PretendardVariable";
  src: url("{pretendard_path}") format("{pretendard_format}");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}}''',

    font_face("KoPubBatang", "KoPubBatang-Light", "300"),
    font_face("KoPubBatang", "KoPubBatang-Medium", "500"),
    font_face("KoPubBatang", "KoPubBatang-Bold", "700"),

    font_face("KoPubDotum", "KoPubDotum-Light", "300"),
    font_face("KoPubDotum", "KoPubDotum-Medium", "500"),
    font_face("KoPubDotum", "KoPubDotum-Bold", "700"),

    font_face("ChosunSm", "ChosunSm", "400"),
    font_face("ChosunKm", "ChosunKm", "400"),
    font_face("ChosunKg", "ChosunKg", "400"),
    font_face("ChosunSg", "ChosunSg", "400"),
    font_face("ChosunBg", "ChosunBg", "400"),
    font_face("ChosunGu", "ChosunGu", "400"),
    font_face("ChosunLo", "ChosunLo", "400"),
    font_face("ChosunGs", "ChosunGs", "400"),
]

marker_start = "/* ALL_LOCAL_FONTS_START */"
marker_end = "/* ALL_LOCAL_FONTS_END */"

font_css = (
    marker_start
    + "\n"
    + "\n\n".join(font_blocks)
    + "\n"
    + marker_end
)

styles = styles_path.read_text(encoding="utf-8")

styles = re.sub(
    re.escape(marker_start)
    + r".*?"
    + re.escape(marker_end),
    "",
    styles,
    flags=re.S,
)

# 이전 조선 폰트 전용 블록도 제거합니다.
styles = re.sub(
    re.escape("/* CHOSUN_FONTS_START */")
    + r".*?"
    + re.escape("/* CHOSUN_FONTS_END */"),
    "",
    styles,
    flags=re.S,
)

styles = styles.rstrip() + "\n\n" + font_css + "\n"
styles_path.write_text(styles, encoding="utf-8")

app = app_path.read_text(encoding="utf-8")

font_map = {
    "pretendard": '\'"PretendardVariable", "Pretendard", sans-serif\'',
    "dotum": '\'"KoPubDotum", sans-serif\'',
    "batang": '\'"KoPubBatang", serif\'',
    "chosunSm": '\'"ChosunSm", serif\'',
    "chosunKm": '\'"ChosunKm", serif\'',
    "chosunKg": '\'"ChosunKg", sans-serif\'',
    "chosunSg": '\'"ChosunSg", sans-serif\'',
    "chosunBg": '\'"ChosunBg", sans-serif\'',
    "chosunGu": '\'"ChosunGu", sans-serif\'',
    "chosunLo": '\'"ChosunLo", sans-serif\'',
    "chosunGs": '\'"ChosunGs", serif\'',
}

font_object_match = re.search(
    r"const\s+fontFamilies\s*=\s*\{(?P<body>.*?)\};",
    app,
    flags=re.S,
)

if not font_object_match:
    raise SystemExit(
        "app.js에서 const fontFamilies = {...}; 블록을 찾지 못했습니다."
    )

body = font_object_match.group("body")

# 일반 굴림체 매핑 제거
body = re.sub(
    r"^\s*gulim\s*:\s*.*?,?\s*$",
    "",
    body,
    flags=re.M,
)

for key, value in font_map.items():
    key_pattern = re.compile(
        rf"(^\s*{re.escape(key)}\s*:\s*).*?(,?\s*$)",
        flags=re.M,
    )

    if key_pattern.search(body):
        body = key_pattern.sub(
            rf"\1{value},",
            body,
            count=1,
        )
    else:
        body = body.rstrip()
        if body and not body.rstrip().endswith(","):
            body += ","
        body += f"\n    {key}: {value},"

body = re.sub(r"\n{3,}", "\n\n", body)
body = body.rstrip().rstrip(",")

new_font_object = (
    "const fontFamilies = {\n"
    + body.strip()
    + "\n  };"
)

app = (
    app[:font_object_match.start()]
    + new_font_object
    + app[font_object_match.end():]
)

font_options = [
    ("pretendard", "프리텐다드 Variable"),
    ("dotum", "KoPub 돋움"),
    ("batang", "KoPub 바탕"),
    ("chosunSm", "조선신명조"),
    ("chosunKm", "조선굵은명조"),
    ("chosunKg", "조선굵은고딕"),
    ("chosunSg", "조선가는고딕"),
    ("chosunBg", "조선견고딕"),
    ("chosunGu", "조선굴림체"),
    ("chosunLo", "조선로고체"),
    ("chosunGs", "조선궁서체"),
]

font_options_js = (
    "["
    + ",".join(
        f'["{key}","{label}"]'
        for key, label in font_options
    )
    + "]"
)

pair_pattern = (
    r'\[\s*["\'][^"\']+["\']'
    r'\s*,\s*["\'][^"\']+["\']\s*\]'
)

font_array_pattern = re.compile(
    r'\[(?:\s*'
    + pair_pattern
    + r'\s*,?)+\s*\]',
    flags=re.S,
)


def replace_font_array(match: re.Match) -> str:
    value = match.group(0)

    if (
        "KoPub 돋움" in value
        and "KoPub 바탕" in value
    ):
        return font_options_js

    return value


app, replaced_arrays = font_array_pattern.subn(
    replace_font_array,
    app,
)

# 남은 굴림체 선택 항목을 제거합니다.
app = re.sub(
    r',?\s*\[\s*["\']gulim["\']'
    r'\s*,\s*["\']굴림체["\']\s*\]',
    "",
    app,
)

app_path.write_text(app, encoding="utf-8")

if index_path.exists():
    html = index_path.read_text(encoding="utf-8")

    option_html = "\n".join(
        f'<option value="{key}">{label}</option>'
        for key, label in font_options
    )

    static_gulim_pattern = re.compile(
        r'<option\s+value=["\']gulim["\'][^>]*>'
        r'\s*굴림체\s*</option>',
        flags=re.I,
    )

    if static_gulim_pattern.search(html):
        if 'value="chosunSm"' in html:
            html = static_gulim_pattern.sub("", html)
        else:
            html = static_gulim_pattern.sub(
                option_html,
                html,
                count=1,
            )

    index_path.write_text(html, encoding="utf-8")

print("CSS 웹폰트 등록 완료")
print(f"JavaScript 폰트 선택 목록 {replaced_arrays}곳 정리 완료")
print("일반 굴림체 선택지 제거 완료")
PY

echo
echo "========================================"
echo "5. 설치 결과 검사"
echo "========================================"

EXPECTED_BASES=(
  PretendardVariable
  KoPubBatang-Light
  KoPubBatang-Medium
  KoPubBatang-Bold
  KoPubDotum-Light
  KoPubDotum-Medium
  KoPubDotum-Bold
  ChosunSm
  ChosunKm
  ChosunKg
  ChosunSg
  ChosunBg
  ChosunGu
  ChosunLo
  ChosunGs
)

MISSING=0

for base in "${EXPECTED_BASES[@]}"; do
  if [[ -f "$FONT_DIR/$base.woff2" \
     || -f "$FONT_DIR/$base.ttf" \
     || -f "$FONT_DIR/$base.otf" ]]; then
    printf '  OK   %s\n' "$base"
  else
    printf '  누락 %s\n' "$base"
    MISSING=1
  fi
done

echo
echo "실제 설치된 폰트 파일:"

find "$FONT_DIR" -maxdepth 1 -type f \
  \( -iname '*.woff2' \
     -o -iname '*.ttf' \
     -o -iname '*.otf' \) \
  -printf '  %f\n' |
  sort

if command -v node >/dev/null 2>&1; then
  echo
  echo "app.js 문법 검사:"
  node --check app.js
fi

if [[ "$MISSING" -ne 0 ]]; then
  echo
  echo "일부 폰트가 누락됐습니다." >&2
  exit 1
fi

echo
echo "========================================"
echo "모든 폰트 설치 및 연결 완료"
echo "========================================"
echo
echo "백업 파일:"
echo "  styles.css.backup-$BACKUP_TAG"
echo "  app.js.backup-$BACKUP_TAG"

if [[ -f "index.html.backup-$BACKUP_TAG" ]]; then
  echo "  index.html.backup-$BACKUP_TAG"
fi

echo
echo "Git 반영 명령:"
echo '  git add app.js styles.css index.html assets/fonts install-all-fonts.sh'
echo '  git commit -m "Install and connect all web fonts"'
echo '  git push'
BASH

chmod +x install-all-fonts.sh
./install-all-fonts.shapp = app_path.read_text(encoding="utf-8")

# 기존 시스템 굴림체 매핑을 제거합니다.
app = re.sub(
    r'\n\s*gulim:\s*[\'\"]"Gulim".*?sans-serif[\'\"]\s*,?',
    "",
    app,
    count=1,
)

# 조선 폰트 매핑을 한 번만 삽입합니다.
chosun_mapping = '''
    chosunSm: '"ChosunSm", serif',
    chosunKm: '"ChosunKm", serif',
    chosunKg: '"ChosunKg", sans-serif',
    chosunSg: '"ChosunSg", sans-serif',
    chosunBg: '"ChosunBg", sans-serif',
    chosunGu: '"ChosunGu", sans-serif',
    chosunLo: '"ChosunLo", sans-serif',
    chosunGs: '"ChosunGs", serif'
'''

if "chosunSm:" not in app:
    needle = '''    batang: '"KoPubBatang", "Batang", serif','''
    if needle not in app:
        raise SystemExit("app.js의 fontFamilies 블록을 찾지 못했습니다.")
    app = app.replace(needle, needle + chosun_mapping, 1)

basic_old = '''[["dotum", "KoPub 돋움"], ["batang", "KoPub 바탕"], ["gulim", "굴림체"]]'''
basic_new = '''[["dotum", "KoPub 돋움"], ["batang", "KoPub 바탕"], ["chosunSm", "조선신명조"], ["chosunKm", "조선굵은명조"], ["chosunKg", "조선굵은고딕"], ["chosunSg", "조선가는고딕"], ["chosunBg", "조선견고딕"], ["chosunGu", "조선굴림체"], ["chosunLo", "조선로고체"], ["chosunGs", "조선궁서체"]]'''
full_old = '''[["pretendard","프리텐다드 Variable"],["dotum","KoPub 돋움"],["batang","KoPub 바탕"],["gulim","굴림체"]]'''
full_new = '''[["pretendard","프리텐다드 Variable"],["dotum","KoPub 돋움"],["batang","KoPub 바탕"],["chosunSm","조선신명조"],["chosunKm","조선굵은명조"],["chosunKg","조선굵은고딕"],["chosunSg","조선가는고딕"],["chosunBg","조선견고딕"],["chosunGu","조선굴림체"],["chosunLo","조선로고체"],["chosunGs","조선궁서체"]]'''

if basic_old in app:
    app = app.replace(basic_old, basic_new)
elif basic_new not in app:
    raise SystemExit("첫 번째 폰트 선택 목록을 찾지 못했습니다.")

if full_old in app:
    app = app.replace(full_old, full_new)
elif full_new not in app:
    raise SystemExit("두 번째 폰트 선택 목록을 찾지 못했습니다.")

app_path.write_text(app, encoding="utf-8")
print("굴림체 제거 및 조선 폰트 8종 연결 완료")
PY

printf '\n설치된 폰트:\n'
find "$FONT_DIR" -maxdepth 1 -type f -name 'Chosun*.TTF' -printf '  %f\n' | sort

printf '\n다음 명령으로 반영하세요:\n'
printf '  git add app.js styles.css assets/fonts\n'
printf '  git commit -m "Add Chosun fonts"\n'
printf '  git push\n'
