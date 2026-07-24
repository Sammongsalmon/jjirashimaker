#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

FONT_DIR="assets/fonts"
mkdir -p "$FONT_DIR"

command -v unzip >/dev/null 2>&1 || {
  echo "오류: unzip 명령을 찾을 수 없습니다."
  exit 1
}

[ -f app.js ] || {
  echo "오류: 저장소 최상위에서 app.js를 찾지 못했습니다."
  exit 1
}

[ -f styles.css ] || {
  echo "오류: 저장소 최상위에서 styles.css를 찾지 못했습니다."
  exit 1
}

echo "1/5 프리텐다드 이동"

if [ -f "PretendardVariable.woff2" ]; then
  mv -f "PretendardVariable.woff2" \
    "$FONT_DIR/PretendardVariable.woff2"
elif [ -f "$FONT_DIR/PretendardVariable.woff2" ]; then
  echo "  이미 설치되어 있습니다."
else
  echo "오류: PretendardVariable.woff2를 찾지 못했습니다."
  exit 1
fi

echo "2/5 KoPub 폰트 압축 해제"

if [ -f "KOPUB2.0_OTF_FONTS.zip" ]; then
  unzip -j -o "KOPUB2.0_OTF_FONTS.zip" \
    '*.otf' '*.OTF' \
    -d "$FONT_DIR" >/dev/null
else
  echo "  KOPUB2.0_OTF_FONTS.zip이 없어 기존 파일을 확인합니다."
fi

echo "3/5 조선 폰트 압축 해제"

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
  zip_file="${code}.zip"

  if [ -f "$zip_file" ]; then
    unzip -j -o "$zip_file" \
      '*.ttf' '*.TTF' '*.otf' '*.OTF' \
      -d "$FONT_DIR" >/dev/null
  fi

  # 대소문자가 다른 확장자를 소문자 .ttf로 통일
  if [ -f "$FONT_DIR/${code}.TTF" ]; then
    mv -f "$FONT_DIR/${code}.TTF" "$FONT_DIR/${code}.ttf"
  elif [ -f "$FONT_DIR/${code}.otf" ]; then
    mv -f "$FONT_DIR/${code}.otf" "$FONT_DIR/${code}.ttf"
  elif [ -f "$FONT_DIR/${code}.OTF" ]; then
    mv -f "$FONT_DIR/${code}.OTF" "$FONT_DIR/${code}.ttf"
  fi
done

echo "4/5 CSS와 JavaScript 연결"

cp -f styles.css styles.css.before-font-install
cp -f app.js app.js.before-font-install

python3 <<'PY'
from pathlib import Path
import re

css_path = Path("styles.css")
js_path = Path("app.js")

css = css_path.read_text(encoding="utf-8")
js = js_path.read_text(encoding="utf-8")

start_marker = "/* ALL_LOCAL_FONTS_START */"
end_marker = "/* ALL_LOCAL_FONTS_END */"

font_css = r'''
/* ALL_LOCAL_FONTS_START */

/* Pretendard Variable */
@font-face {
  font-family: "PretendardVariable";
  src: url("assets/fonts/PretendardVariable.woff2")
       format("woff2-variations");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

/* KoPub 돋움 */
@font-face {
  font-family: "KoPubDotum";
  src: url("assets/fonts/KoPub Dotum_Pro Light.otf")
       format("opentype");
  font-style: normal;
  font-weight: 300;
  font-display: swap;
}

@font-face {
  font-family: "KoPubDotum";
  src: url("assets/fonts/KoPub Dotum_Pro Medium.otf")
       format("opentype");
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}

@font-face {
  font-family: "KoPubDotum";
  src: url("assets/fonts/KoPub Dotum_Pro Bold.otf")
       format("opentype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

/* KoPub 바탕 */
@font-face {
  font-family: "KoPubBatang";
  src: url("assets/fonts/KoPub Batang_Pro Light.otf")
       format("opentype");
  font-style: normal;
  font-weight: 300;
  font-display: swap;
}

@font-face {
  font-family: "KoPubBatang";
  src: url("assets/fonts/KoPub Batang_Pro Medium.otf")
       format("opentype");
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}

@font-face {
  font-family: "KoPubBatang";
  src: url("assets/fonts/KoPub Batang_Pro Bold.otf")
       format("opentype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

/* 조선일보 무료 서체 */
@font-face {
  font-family: "ChosunSm";
  src: url("assets/fonts/ChosunSm.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "ChosunKm";
  src: url("assets/fonts/ChosunKm.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "ChosunKg";
  src: url("assets/fonts/ChosunKg.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "ChosunSg";
  src: url("assets/fonts/ChosunSg.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "ChosunBg";
  src: url("assets/fonts/ChosunBg.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "ChosunGu";
  src: url("assets/fonts/ChosunGu.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "ChosunLo";
  src: url("assets/fonts/ChosunLo.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "ChosunGs";
  src: url("assets/fonts/ChosunGs.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

/* ALL_LOCAL_FONTS_END */
'''

# 재실행할 때 기존에 추가한 블록 제거
pattern = re.compile(
    re.escape(start_marker) + r".*?" + re.escape(end_marker),
    re.S,
)
css = pattern.sub("", css).rstrip() + "\n\n" + font_css.strip() + "\n"

# 기존 fontFamilies 객체 전체 교체
new_font_map = '''const fontFamilies = {
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

js, count = re.subn(
    r'const\s+fontFamilies\s*=\s*\{.*?\};',
    new_font_map,
    js,
    count=1,
    flags=re.S,
)

if count != 1:
    raise SystemExit(
        "app.js에서 fontFamilies 객체를 찾지 못했습니다. "
        "백업 파일은 그대로 보존되어 있습니다."
    )

chosun_options = (
    '["chosunSm","조선신명조"],'
    '["chosunKm","조선굵은명조"],'
    '["chosunKg","조선굵은고딕"],'
    '["chosunSg","조선가는고딕"],'
    '["chosunBg","조선견고딕"],'
    '["chosunGu","조선굴림체"],'
    '["chosunLo","조선로고체"],'
    '["chosunGs","조선궁서체"]'
)

# 모든 폰트 선택 메뉴에서 일반 굴림체를 조선 폰트 목록으로 교체
js, option_count = re.subn(
    r'\[\s*"gulim"\s*,\s*"굴림체"\s*\]',
    chosun_options,
    js,
)

if option_count == 0:
    print("경고: 굴림체 선택 항목을 찾지 못했습니다.")
    print("fontFamilies는 정상적으로 수정했습니다.")

# 과거 로컬 저장 데이터에 gulim이 남아 있으면 프리텐다드로 전환
migration_line = (
    'if (text.fontFamily === "gulim") '
    'text.fontFamily = "pretendard";\n      '
)

if migration_line.strip() not in js:
    js = js.replace(
        'text.fontFamily ||= "pretendard";',
        migration_line + 'text.fontFamily ||= "pretendard";',
        1,
    )

css_path.write_text(css, encoding="utf-8")
js_path.write_text(js, encoding="utf-8")

print("styles.css 웹폰트 등록 완료")
print(f"app.js 폰트 선택 메뉴 {option_count}곳 수정 완료")
PY

echo "5/5 설치 결과 확인"

EXPECTED_FILES=(
  "PretendardVariable.woff2"
  "KoPub Dotum_Pro Light.otf"
  "KoPub Dotum_Pro Medium.otf"
  "KoPub Dotum_Pro Bold.otf"
  "KoPub Batang_Pro Light.otf"
  "KoPub Batang_Pro Medium.otf"
  "KoPub Batang_Pro Bold.otf"
  "ChosunSm.ttf"
  "ChosunKm.ttf"
  "ChosunKg.ttf"
  "ChosunSg.ttf"
  "ChosunBg.ttf"
  "ChosunGu.ttf"
  "ChosunLo.ttf"
  "ChosunGs.ttf"
)

missing=0

for file in "${EXPECTED_FILES[@]}"; do
  if [ -f "$FONT_DIR/$file" ]; then
    printf "  OK  %s\n" "$file"
  else
    printf "  누락 %s\n" "$file"
    missing=1
  fi
done

echo
echo "설치된 폰트 파일:"
find "$FONT_DIR" -maxdepth 1 -type f \
  \( -iname '*.woff2' -o -iname '*.ttf' -o -iname '*.otf' \) \
  -printf '  %f\n' | sort

echo

if [ "$missing" -eq 1 ]; then
  echo "일부 폰트가 누락됐습니다. 위의 누락 목록을 확인하세요."
  exit 1
fi

echo "모든 폰트 설치와 코드 연결이 완료됐습니다."
echo "백업: app.js.before-font-install"
echo "백업: styles.css.before-font-install"
