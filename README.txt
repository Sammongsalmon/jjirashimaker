찌라시 메이커 v6

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

v6 변경 사항
- 템플릿 15종을 전폭 띠, 비대칭 카드, 오프캔버스 원형/말풍선, 하단 문의띠 중심으로 재정리했습니다.
- 템플릿의 배경은 항상 단색이며, 템플릿 적용 시 현재 주색/보조색/강조색을 유지한 채 레이아웃만 바뀝니다.
- 템플릿 내부 도형 색상은 primary/secondary/tertiary와 이를 섞은 파생색으로 계산되어 팔레트를 바꾸면 전체 템플릿 톤이 같이 바뀝니다.
- 템플릿 영역마다 둘러져 있던 테두리를 대부분 제거하고, 필요한 곳은 면·띠·그림자로만 구분되게 했습니다.
- 요소에서 띠를 추가하면 좌우로 캔버스를 가로지르는 전폭 띠로 생성됩니다.
- 기본 띠의 글자 회피 여백을 좁혀 찌라시처럼 더 붙여 배치되게 했습니다.
- 템플릿 썸네일도 현재 팔레트를 따라 다시 그려집니다.

주요 조작
- 미리보기 문장을 끌어 같은 영역 안에서 위치 조정
- 다른 문장 위에 놓아 두 문장 자리 교환
- 빈 글자 영역에 놓아 문장 영역 이동
- 배경 영역 또는 추가 요소를 눌러 색상·크기·효과 편집
- 선택 영역/요소 우하단 손잡이로 크기 조절
- PNG 또는 JPG로 저장

주의
- 폰트 파일은 이 배포 ZIP에 포함되어 있지 않습니다. 위 명령으로 사용자가 가진 폰트를 직접 설치하세요.
