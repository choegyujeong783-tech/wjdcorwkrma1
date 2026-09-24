/**
 * 랜딩페이지 신청서 → 구글 시트 저장 + Gmail 알림
 *
 * 설치 방법은 apps-script/README.md 참고.
 * 경정청구.html · index.html(정책자금) 두 랜딩페이지가 같은 스크립트를 함께 쓸 수 있습니다.
 */

// ── 설정 ───────────────────────────────────────────────────────
var NOTIFY_EMAIL = 'choegyujeong783@gmail.com';   // 알림 받을 메일 (쉼표로 여러 개 가능)
var SHEET_NAME   = '신청서';                       // 접수 내역이 쌓일 시트 탭 이름

// 항목 이름(영문 key) → 메일·시트에 표시할 한글 이름
var LABELS = {
  submitted_at : '접수 시각',
  name         : '성함',
  phone        : '휴대전화',
  biztype      : '사업자 구분',
  company      : '회사명',
  years        : '업력',
  region       : '지역',
  industry     : '업종',
  openyear     : '개업 시기',
  sales        : '연매출 규모',
  bookkeeping  : '현재 세무 기장',
  calltime     : '상담 가능 시간',
  message      : '문의 내용',
  agree_privacy: '개인정보 동의',
  utm_source   : 'utm_source',
  utm_medium   : 'utm_medium',
  utm_campaign : 'utm_campaign',
  utm_content  : 'utm_content',
  utm_term     : 'utm_term',
  fbclid       : 'fbclid',
  gclid        : 'gclid',
  landing_url  : '유입 페이지',
  referrer     : '이전 페이지'
};

// ── 신청서 수신 ────────────────────────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.company_url) return json_({ ok: true });   // 스팸 봇(허니팟) 무시

    data.submitted_at = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    saveToSheet_(data);
    sendMail_(data);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 브라우저로 웹앱 주소를 열었을 때 동작 확인용
function doGet() {
  return json_({ ok: true, message: '신청서 접수 엔드포인트가 정상 동작 중입니다.' });
}

// ── 구글 시트 저장 ─────────────────────────────────────────────
function saveToSheet_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // 헤더(1행): 처음이면 만들고, 새 항목이 들어오면 오른쪽에 추가
  var keys = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(labelToKey_)
    : ['submitted_at'];
  Object.keys(data).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
  sheet.getRange(1, 1, 1, keys.length).setValues([keys.map(label_)]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // 전화번호가 숫자로 바뀌어 앞자리 0이 사라지지 않도록 문자열로 저장
  var row = keys.map(function (k) { return data[k] == null ? '' : "'" + String(data[k]); });
  sheet.appendRow(row);
}

// ── Gmail 알림 ─────────────────────────────────────────────────
function sendMail_(data) {
  var subject = '[신규 신청] ' + (data.name || '이름 없음') + ' / ' + (data.phone || '') +
                (data.biztype ? ' / ' + data.biztype : '');

  var rows = Object.keys(data).map(function (k) {
    if (data[k] === '' || data[k] == null) return '';
    return '<tr><th style="text-align:left;padding:6px 12px;background:#f4f4f4;white-space:nowrap">' +
           esc_(label_(k)) + '</th><td style="padding:6px 12px">' +
           esc_(String(data[k])).replace(/\n/g, '<br>') + '</td></tr>';
  }).join('');

  var html = '<p>랜딩페이지로 새 신청이 접수되었습니다.</p>' +
             '<table style="border-collapse:collapse;font-size:14px" border="1" bordercolor="#ddd">' +
             rows + '</table>' +
             '<p style="color:#888;font-size:12px">전체 접수 내역: ' +
             SpreadsheetApp.getActiveSpreadsheet().getUrl() + '</p>';

  var plain = Object.keys(data).map(function (k) { return label_(k) + ': ' + data[k]; }).join('\n');

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: subject,
    body: plain,
    htmlBody: html,
    name: '랜딩페이지 신청 알림'
  });
}

// ── 도우미 ─────────────────────────────────────────────────────
function label_(k) { return LABELS[k] || k; }
function labelToKey_(label) {
  for (var k in LABELS) if (LABELS[k] === label) return k;
  return label;
}
function esc_(s) {
  return s.replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 설치 직후 한 번 실행: 권한 승인 + 테스트 메일 발송
function testSetup() {
  var sample = {
    submitted_at: '', name: '테스트', phone: '010-0000-0000', biztype: '개인사업자',
    industry: '제조업', calltime: '언제든 괜찮습니다', message: '연동 테스트입니다.'
  };
  sample.submitted_at = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  saveToSheet_(sample);
  sendMail_(sample);
}
