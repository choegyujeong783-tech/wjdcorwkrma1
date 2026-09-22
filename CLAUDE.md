# 작업 규칙 (이 저장소)

## 1. 작업이 끝나면 항상 결과를 보여준다 ★

말로만 «완료했습니다»라고 하지 말 것. 매 작업 끝에 아래를 **반드시** 실행한다.

1. **웹페이지(HTML)를 만들거나 고쳤으면** — Artifact로 게시(또는 같은 URL로 재게시)하고
   `action: "open"`으로 화면에 띄운 뒤, 링크를 답변에 적는다.
2. **화면 확인** — Playwright(헤드리스 Chromium)로 렌더링해 스크린샷을 찍고,
   `SendUserFile`로 보낸다. 최소한 **PC 첫 화면 + 모바일(390px)** 두 장,
   바뀐 부분이 특정 섹션이면 그 섹션 한 장을 추가한다.
3. **문서·데이터 파일이면** — `SendUserFile`로 파일 자체를 보낸다.
4. **무엇이 바뀌었는지 한눈에** — 바뀐 항목을 짧은 목록이나 표로 정리한다.
5. **아직 안 된 것** — 값이 비어 있거나 확인이 필요한 항목을 명시한다.

스크린샷 촬영 방법(이 환경에서 검증됨):

```js
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1280,height:900} });
await p.goto('file:///home/user/wjdcorwkrma1/jaegaebal/index.html');
await p.screenshot({ path:'shot.png' });
await b.close();
```

## 2. 이 저장소 구성

| 경로 | 내용 |
|---|---|
| `index.html` | KBSS 정책자금 무료 사전점검 랜딩페이지 |
| `jaegaebal/index.html` | «광명재개발바로알기» 홈페이지형 블로그 (단일 파일, 외부 의존성 없음) |
| `jaegaebal/README.md` | 위 페이지의 설정·적용 가이드 |
| `jaegaebal/samkkeut-logo.png` | 삼끝대책위 로고 원본(페이지에는 data URI로 내장) |
| `jaegaebal/hero-bg.jpg` | 히어로 배경 조감도 원본(페이지에는 data URI로 내장) |
| `jaegaebal/blog-analysis-kmrich2016.md` | 광명리치 블로그 분석 문서 |
| `gm11/index.html` | «광명11구역 재개발 — 정관 개정안 바로알기» (jaegaebal과 같은 디자인 토큰 사용) |

- 두 HTML 모두 **외부 라이브러리·폰트·이미지 의존성이 없는 단일 파일**로 유지한다.
  이미지는 data URI로 내장한다.
- 라이트/다크 모드 모두 지원하고, 모바일(390px)에서 좌우 스크롤이 생기지 않게 한다.
- 게시용 사본은 문서 바깥 태그(`<!doctype>`, `<html>`, `<head>`, `<body>`)를 제거하고
  `<title>`은 이름만(«광명재개발바로알기») 남긴다. 저장소의 원본은 단독 실행되도록 그대로 둔다.

## 3. 작업 방식

- 답변은 **한국어**로 한다. 사용자는 경제부 신문기자이며 재무제표 분석과
  분석 프로그램 제작을 공부하고 있다. 계산 로직은 공식을 화면과 코드에 함께 드러낸다.
- 개발은 지정된 브랜치(`claude/intelligent-euler-btvnl4`)에서 하고, 작업 단위로
  커밋·푸시한다. **main 브랜치에는 허락 없이 푸시하지 않는다.**
  PR은 명시적으로 요청받았을 때만 만든다.
- 이 저장소는 **공개(public)** 이다. 연락처·수집 엔드포인트 등을 커밋하면 누구나 볼 수 있다.
- 확인되지 않은 수치는 단정하지 않는다. 구역 현황 등은 «예시»·«확인 필요»로 표시하고
  1차 자료(시·구 고시, 조합 공고, 정비사업 정보몽땅)로 검증하도록 안내한다.

## 4. 이 환경의 제약 (반복 확인된 사항)

- **네이버·유튜브 도메인은 네트워크 정책으로 차단**되어 있다(CONNECT 403 / HTTP 000).
  블로그 본문이나 유튜브 채널을 직접 열어 확인할 수 없으므로, 필요하면 사용자에게 요청한다.
- `raw.githubusercontent.com`은 접속 가능하고, `github.io`는 차단되어 있다.
- 이미지 처리는 `pip3 install pillow` 후 PIL로 한다(ImageMagick 없음).
