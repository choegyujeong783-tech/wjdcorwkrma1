/**
 * KBSS 정책자금 랜딩페이지 → 구글 시트 접수
 *
 * 사용법
 *  1) 접수용 구글 시트를 열고  확장 프로그램 → Apps Script
 *  2) 기본 코드를 지우고 이 파일 전체를 붙여넣기
 *  3) 아래 NOTIFY_EMAIL 을 알림 받을 주소로 수정 (알림이 필요 없으면 '' 로 비우기)
 *  4) 상단 함수 목록에서 [테스트] 를 선택하고 ▶ 실행  → 권한 승인 → 시트에 테스트 행 확인
 *  5) 배포 → 새 배포 → 유형 [웹 앱]
 *       실행 계정 : 나
 *       액세스 권한 : 모든 사용자
 *  6) 발급된 웹 앱 URL 을 index.html 의 CONFIG.ENDPOINT 에 붙여넣기
 */

// ───────── 설정 ─────────
var NOTIFY_EMAIL = 'choegyujeong783@gmail.com';   // 신규 접수 알림 메일 주소 (여러 개는 쉼표로 구분) ('' 이면 발송 안 함)
var SHEET_NAME   = '';                  // 특정 시트 탭 이름 (''이면 첫 번째 탭)
var TIMEZONE     = 'Asia/Seoul';

// 시트 열 순서  [ 헤더 이름 , 랜딩페이지에서 오는 키 ]
var COLS = [
  ['접수일시',        '__now'],
  ['상태',            '__status'],
  ['성함',            'name'],
  ['휴대전화',        'phone'],
  ['기업명',          'company'],
  ['업력',            'years'],
  ['소재지',          'region'],
  ['업종',            'industry'],
  ['2025년 매출',     'sales'],
  ['상담 가능 시간',  'calltime'],
  ['개인정보 동의',   'agree_privacy'],
  ['유입 매체',       'utm_source'],
  ['캠페인',          'utm_campaign'],
  ['광고 소재',       'utm_content'],
  ['fbclid',          'fbclid'],
  ['유입 경로',       'referrer'],
  ['메모',            '__memo']
];

var STATUS_OPTIONS = ['신규', '연락함', '상담중', '진행', '보류', '종결'];

// ───────── 접수 처리 ─────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    appendLead_(data);
    return ok_('ok');
  } catch (err) {
    // 실패해도 200 을 돌려주되 내용을 남겨 둡니다 (원인 추적용)
    console.error(err);
    logError_(err, e);
    return ok_('error: ' + err);
  }
}

// 브라우저로 URL 을 열었을 때 배포 확인용
function doGet() {
  return ok_('KBSS 접수 엔드포인트 정상 동작 중 · ' + nowText_());
}

function appendLead_(data) {
  var sh = sheet_();
  ensureHeader_(sh);

  var phone = String(data.phone || '').trim();
  var dup   = phone ? isDuplicate_(sh, phone) : false;

  var row = COLS.map(function (c) {
    var key = c[1];
    if (key === '__now')    return nowText_();
    if (key === '__status') return STATUS_OPTIONS[0];
    if (key === '__memo')   return dup ? '⚠ 중복 접수 (같은 번호 기존 신청 있음)' : '';
    if (key === 'agree_privacy') return data[key] === 'Y' ? '동의' : '';
    var v = data[key];
    return (v === undefined || v === null) ? '' : String(v);
  });

  sh.appendRow(row);

  var last = sh.getLastRow();
  sh.getRange(last, 1, 1, COLS.length).setVerticalAlignment('middle');
  if (dup) sh.getRange(last, 1, 1, COLS.length).setBackground('#FFF4E5');

  notify_(data, dup, last);
}

// ───────── 시트 준비 ─────────
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return (SHEET_NAME && ss.getSheetByName(SHEET_NAME)) || ss.getSheets()[0];
}

/** 헤더가 없거나 다르면 새로 쓰고 서식을 잡습니다. 이미 맞으면 아무것도 하지 않습니다. */
function ensureHeader_(sh) {
  var headers = COLS.map(function (c) { return c[0]; });
  var current = sh.getLastRow() > 0
    ? sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0]
    : [];

  if (current.slice(0, headers.length).join('|') === headers.join('|')) return;

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  var head = sh.getRange(1, 1, 1, headers.length);
  head.setFontWeight('bold')
      .setBackground('#2A4A7F')
      .setFontColor('#FFFFFF')
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center');
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(4);          // 접수일시 ~ 휴대전화 고정

  var widths = [140, 84, 90, 130, 160, 110, 80, 120, 130, 150, 100, 110, 150, 150, 120, 180, 220];
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  // 상태 열 드롭다운
  var statusCol = headers.indexOf('상태') + 1;
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true).setAllowInvalid(false).build();
  sh.getRange(2, statusCol, sh.getMaxRows() - 1, 1).setDataValidation(rule);

  if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), headers.length).createFilter();
}

/** 같은 휴대전화가 이미 접수돼 있는지 (숫자만 비교) */
function isDuplicate_(sh, phone) {
  var col = COLS.map(function (c) { return c[0]; }).indexOf('휴대전화') + 1;
  var n = sh.getLastRow();
  if (n < 2) return false;
  var digits = phone.replace(/\D/g, '');
  var values = sh.getRange(2, col, n - 1, 1).getValues();
  return values.some(function (r) { return String(r[0]).replace(/\D/g, '') === digits; });
}

// ───────── 알림 ─────────
function notify_(data, dup, rowNo) {
  if (!NOTIFY_EMAIL) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lines = COLS
    .filter(function (c) { return c[1].indexOf('__') !== 0; })
    .map(function (c) {
      var v = c[1] === 'agree_privacy' ? (data[c[1]] === 'Y' ? '동의' : '') : (data[c[1]] || '');
      return c[0] + ' : ' + v;
    });

  var subject = '[정책자금' + (dup ? '/중복' : '') + '] 신규 상담 신청 — '
              + (data.name || '이름없음') + ' ' + (data.phone || '');
  var body = nowText_() + ' 접수\n\n' + lines.join('\n')
           + '\n\n시트에서 보기 : ' + ss.getUrl() + '#gid=' + sheet_().getSheetId()
           + '\n(' + rowNo + '행)';
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
  } catch (err) {
    console.error('메일 발송 실패: ' + err);
  }
}

// ───────── 유틸 ─────────
function nowText_() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}
function ok_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
function logError_(err, e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName('_오류로그') || ss.insertSheet('_오류로그');
    if (log.getLastRow() === 0) log.appendRow(['시각', '오류', '받은 데이터']);
    log.appendRow([nowText_(), String(err), e && e.postData ? e.postData.contents : '']);
  } catch (ignore) {}
}

// ───────── 설치 확인용 ─────────
/** 이 함수를 한 번 실행하면 권한 승인이 진행되고 시트에 테스트 행이 들어갑니다. */
function 테스트() {
  appendLead_({
    name: '테스트 홍길동',
    phone: '010-0000-0000',
    company: '(주)테스트',
    years: '3년~7년',
    region: '서울',
    industry: '제조업',
    sales: '10억~30억원',
    calltime: '오전 (09:00~12:00)',
    agree_privacy: 'Y',
    utm_source: 'facebook',
    utm_campaign: '테스트캠페인',
    utm_content: '테스트소재',
    referrer: 'https://www.facebook.com/'
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('테스트 행이 추가되었습니다.', 'KBSS 접수', 5);
}

/** 테스트로 넣은 행을 지웁니다. */
function 테스트행삭제() {
  var sh = sheet_();
  var col = COLS.map(function (c) { return c[0]; }).indexOf('성함') + 1;
  for (var r = sh.getLastRow(); r >= 2; r--) {
    if (String(sh.getRange(r, col).getValue()).indexOf('테스트') === 0) sh.deleteRow(r);
  }
}
