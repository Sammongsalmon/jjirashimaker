찌라시 메이커 v5

구성
- index.html
- styles.css
- app.js
- assets/fonts/PUT_KOPUB_FONTS_HERE.txt

설치
1. 위 3개 파일을 저장소의 기존 파일과 교체합니다.
2. 사용자가 보유한 KOPUB2.0_OTF_FONTS.zip을 저장소 최상위에 둔 뒤 아래 명령을 실행합니다.

   mkdir -p assets/fonts
   unzip -j -o "KOPUB2.0_OTF_FONTS.zip" '*.otf' -d assets/fonts

3. 정적 웹서버 또는 GitHub Pages로 index.html을 엽니다.

CSS가 사용하는 폰트 파일명
- KoPub Dotum_Pro Medium.otf
- KoPub Dotum_Pro Bold.otf
- KoPub Batang_Pro Medium.otf
- KoPub Batang_Pro Bold.otf

v5 변경 사항
- 15개 템플릿을 단색 배경과 0° 그리드 레이아웃으로 전면 교체
- 색상 블록을 누르면 바로 아래에 채도·명도 면, 색조 바, 빠른 색상표 표시
- HEX, RGB, CMYK, HSV, HSL 값 표시 및 HEX 복사
- 템플릿 카드 미리보기를 크게 표시하고 레이아웃 설명 추가
- 수달 홍보용 기본 문구와 문장별 타이포그래피 균형 개선
- 문장은 지정 영역 밖으로 나가지 않으며 캔버스에서 위치 이동·영역 이동·자리 교환 가능
- 모바일에서는 미리보기가 문장 편집보다 먼저 표시

주요 조작
- 미리보기 문장을 끌어 같은 영역 안에서 위치 조정
- 다른 문장 위에 놓아 두 문장 자리 교환
- 빈 글자 영역에 놓아 문장 영역 이동
- 배경 영역 또는 추가 요소를 눌러 색상·크기·효과 편집
- 선택 영역/요소 우하단 손잡이로 크기 조절
- PNG 또는 JPG로 저장

주의
- 폰트 파일은 이 배포 ZIP에 포함되어 있지 않습니다. 위 명령으로 사용자가 가진 폰트를 직접 설치하세요.
