#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

FONT_DIR="assets/fonts"
mkdir -p "$FONT_DIR"

for cmd in unzip python3 find; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "오류: $cmd 명령을 찾지 못했습니다." >&2
    exit 1
  }
done

[[ -f styles.css ]] || {
  echo "오류: styles.css를 찾지 못했습니다. 저장소 최상위에서 실행하세요." >&2
  exit 1
}

[[ -f app.js ]] || {
  echo "오류: app.js를 찾지 못했습니다. 저장소 최상위에서 실행하세요." >&2
  exit 1
}

TMP_ROOT="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

find_first_font() {
  local dir="$1"
  find "$dir" -type f \( -iname '*.ttf' -o -iname '*.otf' \) -print -quit
}

copy_font_as() {
  local source="$1"
  local base="$2"
  local ext
  ext="${source##*.}"
  ext="${ext,,}"

  rm -f "$FONT_DIR/${base}.ttf" "$FONT_DIR/${base}.otf"
  cp -f "$source" "$FONT_DIR/${base}.${ext}"
  echo "  설치: $FONT_DIR/${base}.${ext}"
}

find_font_by_patterns() {
  local dir="$1"
  shift
  local pattern
  local found=""

  for pattern in "$@"; do
    found="$(find "$dir" -type f \( -iname '*.ttf' -o -iname '*.otf' \) -iname "$pattern" -print -quit)"
    if [[ -n "$found" ]]; then
      printf '%s\n' "$found"
      return 0
    fi
  done

  return 1
}

echo
printf '%s\n' '========================================'
printf '%s\n' '1. 조선 폰트 8종 설치'
printf '%s\n' '========================================'

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
  if [[ -f "$FONT_DIR/${code}.ttf" || -f "$FONT_DIR/${code}.otf" ]]; then
    echo "  이미 설치됨: $code"
    continue
  fi

  zip_file="${code}.zip"
  [[ -f "$zip_file" ]] || {
    echo "오류: $zip_file 파일을 찾지 못했습니다." >&2
    exit 1
  }

  zip_tmp="$TMP_ROOT/$code"
  mkdir -p "$zip_tmp"
  unzip -q -o "$zip_file" -d "$zip_tmp"

  source_font="$(find_first_font "$zip_tmp")"
  [[ -n "$source_font" ]] || {
    echo "오류: $zip_file 안에서 TTF 또는 OTF 폰트를 찾지 못했습니다." >&2
    exit 1
  }

  copy_font_as "$source_font" "$code"
done

echo
printf '%s\n' '========================================'
printf '%s\n' '2. Pretendard Variable 설치'
printf '%s\n' '========================================'

PRETENDARD_DEST="$FONT_DIR/PretendardVariable.woff2"

if [[ -f "$PRETENDARD_DEST" ]]; then
  echo "  이미 설치됨: $PRETENDARD_DEST"
else
  PRETENDARD_SOURCE="$(find . -maxdepth 5 -type f -iname 'PretendardVariable.woff2' ! -path './assets/fonts/*' -print -quit)"

  [[ -n "$PRETENDARD_SOURCE" ]] || {
    echo "오류: PretendardVariable.woff2를 찾지 못했습니다." >&2
    exit 1
  }

  cp -f "$PRETENDARD_SOURCE" "$PRETENDARD_DEST"
  echo "  설치: $PRETENDARD_DEST"
fi

echo
printf '%s\n' '========================================'
printf '%s\n' '3. KoPub 폰트 6종 설치'
printf '%s\n' '========================================'

KOPUB_ZIP="KOPUB2.0_OTF_FONTS.zip"
[[ -f "$KOPUB_ZIP" ]] || {
  echo "오류: $KOPUB_ZIP 파일을 찾지 못했습니다." >&2
  exit 1
}

KOPUB_TMP="$TMP_ROOT/kopub"
mkdir -p "$KOPUB_TMP"
unzip -q -o "$KOPUB_ZIP" -d "$KOPUB_TMP"

install_kopub() {
  local base="$1"
  shift

  if [[ -f "$FONT_DIR/${base}.otf" || -f "$FONT_DIR/${base}.ttf" ]]; then
    echo "  이미 설치됨: $base"
    return 0
  fi

  local source_font
  source_font="$(find_font_by_patterns "$KOPUB_TMP" "$@" || true)"

  [[ -n "$source_font" ]] || {
    echo "오류: KoPub 폰트를 찾지 못했습니다: $base" >&2
    exit 1
  }

  copy_font_as "$source_font" "$base"
}

install_kopub "KoPubBatang-Light" '*KoPub*Batang*Light*' '*Batang*Light*'
install_kopub "KoPubBatang-Medium" '*KoPub*Batang*Medium*' '*Batang*Medium*'
install_kopub "KoPubBatang-Bold" '*KoPub*Batang*Bold*' '*Batang*Bold*'
install_kopub "KoPubDotum-Light" '*KoPub*Dotum*Light*' '*Dotum*Light*'
install_kopub "KoPubDotum-Medium" '*KoPub*Dotum*Medium*' '*Dotum*Medium*'
install_kopub "KoPubDotum-Bold" '*KoPub*Dotum*Bold*' '*Dotum*Bold*'

echo
printf '%s\n' '========================================'
printf '%s\n' '4. styles.css와 app.js 연결'
printf '%s\n' '========================================'

BACKUP_TAG="$(date +%Y%m%d-%H%M%S)"
cp -f styles.css "styles.css.backup-$BACKUP_TAG"
cp -f app.js "app.js.backup-$BACKUP_TAG"

python3 <<'PY'
from pathlib import Path
import re

font_dir = Path("assets/fonts")
styles_path = Path("styles.css")
app_path = Path("app.js")


def locate_font(base: str):
    candidates = [
        (font_dir / f"{base}.woff2", "woff2"),
        (font_dir / f"{base}.ttf", "truetype"),
        (font_dir / f"{base}.otf", "opentype"),
    ]
    for path, fmt in candidates:
        if path.exists():
            return path.as_posix(), fmt
    raise SystemExit(f"폰트 파일을 찾지 못했습니다: {base}")


def make_face(family: str, base: str, weight: str):
    path, fmt = locate_font(base)
    return f'''@font-face {{
  font-family: "{family}";
  src: url("{path}") format("{fmt}");
  font-style: normal;
  font-weight: {weight};
  font-display: swap;
}}'''

pretendard_path, pretendard_fmt = locate_font("PretendardVariable")

font_faces = [
    f'''@font-face {{
  font-family: "PretendardVariable";
  src: url("{pretendard_path}") format("{pretendard_fmt}");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}}''',
    make_face("KoPubBatang", "KoPubBatang-Light", "300"),
    make_face("KoPubBatang", "KoPubBatang-Medium", "500"),
    make_face("KoPubBatang", "KoPubBatang-Bold", "700"),
    make_face("KoPubDotum", "KoPubDotum-Light", "300"),
    make_face("KoPubDotum", "KoPubDotum-Medium", "500"),
    make_face("KoPubDotum", "KoPubDotum-Bold", "700"),
    make_face("ChosunSm", "ChosunSm", "400"),
    make_face("ChosunKm", "ChosunKm", "400"),
    make_face("ChosunKg", "ChosunKg", "400"),
    make_face("ChosunSg", "ChosunSg", "400"),
    make_face("ChosunBg", "ChosunBg", "400"),
    make_face("ChosunGu", "ChosunGu", "400"),
    make_face("ChosunLo", "ChosunLo", "400"),
    make_face("ChosunGs", "ChosunGs", "400"),
]

marker_start = "/* ALL_LOCAL_FONTS_START */"
marker_end = "/* ALL_LOCAL_FONTS_END */"
font_css = marker_start + "\n" + "\n\n".join(font_faces) + "\n" + marker_end

styles = styles_path.read_text(encoding="utf-8")
styles = re.sub(
    re.escape(marker_start) + r".*?" + re.escape(marker_end),
    "",
    styles,
    flags=re.S,
)
styles = re.sub(
    re.escape("/* CHOSUN_FONTS_START */") + r".*?" + re.escape("/* CHOSUN_FONTS_END */"),
    "",
    styles,
    flags=re.S,
)
styles = styles.rstrip() + "\n\n" + font_css + "\n"
styles_path.write_text(styles, encoding="utf-8")

app = app_path.read_text(encoding="utf-8")

font_families_block = '''const fontFamilies = {
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
  };'''

app, count = re.subn(
    r"const\s+fontFamilies\s*=\s*\{.*?\};",
    font_families_block,
    app,
    count=1,
    flags=re.S,
)

if count != 1:
    raise SystemExit("app.js에서 const fontFamilies = {...}; 블록을 찾지 못했습니다.")

font_options = '''[["pretendard","프리텐다드 Variable"],["dotum","KoPub 돋움"],["batang","KoPub 바탕"],["chosunSm","조선신명조"],["chosunKm","조선굵은명조"],["chosunKg","조선굵은고딕"],["chosunSg","조선가는고딕"],["chosunBg","조선견고딕"],["chosunGu","조선굴림체"],["chosunLo","조선로고체"],["chosunGs","조선궁서체"]]'''

array_pattern = re.compile(
    r'\[(?:\s*\[\s*["\'][^"\']+["\']\s*,\s*["\'][^"\']+["\']\s*\]\s*,?)+\s*\]',
    flags=re.S,
)


def replace_font_array(match):
    value = match.group(0)
    if "KoPub 돋움" in value and "KoPub 바탕" in value:
        return font_options
    return value

app, option_count = array_pattern.subn(replace_font_array, app)

app = re.sub(
    r',?\s*\[\s*["\']gulim["\']\s*,\s*["\']굴림체["\']\s*\]',
    "",
    app,
)

app_path.write_text(app, encoding="utf-8")

print("styles.css 웹폰트 연결 완료")
print(f"app.js 폰트 목록 {option_count}곳 갱신 완료")
print("기존 일반 굴림체 선택지 제거 완료")
PY

echo
printf '%s\n' '========================================'
printf '%s\n' '5. 설치 결과 검사'
printf '%s\n' '========================================'

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
  if [[ -f "$FONT_DIR/${base}.woff2" || -f "$FONT_DIR/${base}.ttf" || -f "$FONT_DIR/${base}.otf" ]]; then
    printf '  OK   %s\n' "$base"
  else
    printf '  누락 %s\n' "$base"
    MISSING=1
  fi
done

if command -v node >/dev/null 2>&1; then
  echo
  echo "app.js 문법 검사:"
  node --check app.js
fi

if [[ "$MISSING" -ne 0 ]]; then
  echo "일부 폰트가 누락됐습니다." >&2
  exit 1
fi

echo
echo "모든 폰트 설치 및 연결이 완료됐습니다."
echo "백업: styles.css.backup-$BACKUP_TAG"
echo "백업: app.js.backup-$BACKUP_TAG"
echo
echo "Git 반영 명령:"
echo '  git add app.js styles.css assets/fonts install-fonts-clean.sh'
echo '  git commit -m "Install and connect web fonts"'
echo '  git push'
