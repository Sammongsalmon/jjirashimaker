#!/usr/bin/env bash
set -euo pipefail

FONT_DIR="assets/fonts"
mkdir -p "$FONT_DIR"

zips=(
  ChosunSm.zip ChosunKm.zip ChosunKg.zip ChosunSg.zip
  ChosunBg.zip ChosunGu.zip ChosunLo.zip ChosunGs.zip
)

for zip in "${zips[@]}"; do
  if [[ ! -f "$zip" ]]; then
    echo "누락: $zip" >&2
    exit 1
  fi
  unzip -j -o "$zip" '*.TTF' -d "$FONT_DIR" >/dev/null
done

python3 - <<'PY'
from pathlib import Path
import re

styles_path = Path("styles.css")
app_path = Path("app.js")

if not styles_path.exists() or not app_path.exists():
    raise SystemExit("저장소 최상위에서 실행하세요. styles.css 또는 app.js를 찾지 못했습니다.")

marker_start = "/* CHOSUN_FONTS_START */"
marker_end = "/* CHOSUN_FONTS_END */"
font_css = r'''
/* CHOSUN_FONTS_START */
@font-face {
  font-family: "ChosunSm";
  src: url("assets/fonts/ChosunSm.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "ChosunKm";
  src: url("assets/fonts/ChosunKm.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "ChosunKg";
  src: url("assets/fonts/ChosunKg.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "ChosunSg";
  src: url("assets/fonts/ChosunSg.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "ChosunBg";
  src: url("assets/fonts/ChosunBg.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "ChosunGu";
  src: url("assets/fonts/ChosunGu.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "ChosunLo";
  src: url("assets/fonts/ChosunLo.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "ChosunGs";
  src: url("assets/fonts/ChosunGs.TTF") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
/* CHOSUN_FONTS_END */
'''.strip()

styles = styles_path.read_text(encoding="utf-8")
styles = re.sub(
    re.escape(marker_start) + r".*?" + re.escape(marker_end),
    font_css,
    styles,
    flags=re.S,
)
if marker_start not in styles:
    styles = styles.rstrip() + "\n\n" + font_css + "\n"
styles_path.write_text(styles, encoding="utf-8")

app = app_path.read_text(encoding="utf-8")

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
