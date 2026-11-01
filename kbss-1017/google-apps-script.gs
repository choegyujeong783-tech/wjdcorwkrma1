/**
 * KBSS 정책자금 랜딩페이지(kbss-1017/index.html) → 구글 시트 접수용 Apps Script
 *
 * 설치 방법
 *  1) 접수받을 구글 시트 열기 → 확장 프로그램 → Apps Script
 *  2) 이 파일 내용을 전부 붙여넣고 저장
 *  3) 배포 → 새 배포 → 유형: 웹 앱
 *       - 실행 사용자: 나
 *       - 액세스 권한: 모든 사용자
 *  4) 발급된 웹 앱 URL(.../exec)을 index.html 의 CONFIG.ENDPOINT 에 붙여넣기
 *     ※ 코드를 고친 뒤에는 "배포 관리 → 수정 → 새 버전"으로 다시 배포해야 반영됩니다.
 *
 * 페이지는 JSON 본문(text/plain)으로 보냅니다. fetch 가 막힌 환경에서는
 * 숨은 폼으로 {"_":"=", ...} 형태의 JSON 을 보내므로 "_" 키는 무시합니다.
 */

var SHEET_NAME = '신청접수';       // 시트(탭) 이름. 없으면 자동 생성
var NOTIFY_EMAIL = '';             // 접수 시 알림 받을 메일 주소(비우면 알림 없음)

// 시트 열 순서 = 아래 순서. [저장 키, 시트 머리글]
var COLUMNS = [
  ['submitted_at',  '접수일시'],
  ['name',          '성함'],
  ['phone',         '휴대전화'],
  ['company',       '기업명'],
  ['years',         '업력'],
  ['region',        '사업장 소재지'],
  ['industry',      '업종'],
  ['sales',         '2025년 매출'],
  ['calltime',      '상담 가능 시간'],
  ['agree_privacy', '개인정보 동의'],
  ['utm_source',    'utm_source'],
  ['utm_medium',    'utm_medium'],
  ['utm_campaign',  'utm_campaign'],
  ['utm_content',   'utm_content'],
  ['utm_term',      'utm_term'],
  ['fbclid',        'fbclid'],
  ['gclid',         'gclid'],
  ['landing_url',   '랜딩 URL'],
  ['referrer',      '유입 경로(referrer)']
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = parseBody_(e);
    var sheet = getSheet_();
    var row = COLUMNS.map(function (c) {
      var v = data[c[0]];
      if (c[0] === 'submitted_at') {
        v = v ? new Date(v) : new Date();
      }
      // 전화번호 앞자리 0 이 지워지지 않도록 문자열로 저장
      if (c[0] === 'phone' && v) v = "'" + v;
      return v === undefined ? '' : v;
    });
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL,
        '[KBSS] 정책자금 무료 진단 신청 - ' + (data.name || '') + ' / ' + (data.company || ''),
        COLUMNS.map(function (c) { return c[1] + ': ' + (data[c[0]] || ''); }).join('\n'));
    }
    return json_({ result: 'success' });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 브라우저로 URL을 직접 열었을 때 동작 확인용
function doGet() {
  return json_({ result: 'ok', message: 'KBSS 접수 웹 앱이 동작 중입니다.' });
}

function parseBody_(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try { data = JSON.parse(e.postData.contents); } catch (x) { data = {}; }
  }
  // 일반 폼 전송(x-www-form-urlencoded)으로 들어온 경우도 받아줌
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) {
      if (data[k] === undefined) data[k] = e.parameter[k];
    });
  }
  delete data._;
  return data;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(function (c) { return c[1]; }));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
