/**
 * KBSS 경영상담사 지원 폼 → Gmail 알림 + 구글 시트 저장
 *
 * 설치 방법
 *  1. 구글 시트를 새로 만들고 [확장 프로그램] → [Apps Script] 를 엽니다.
 *  2. 기본 코드를 모두 지우고 이 파일 내용을 붙여 넣은 뒤 저장합니다.
 *  3. 함수 목록에서 testMail 을 선택해 [실행] → 권한 승인 → 받은편지함에 테스트 메일 확인.
 *  4. [배포] → [새 배포] → 유형: 웹 앱
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: 모든 사용자
 *  5. 발급된 웹 앱 URL(https://script.google.com/macros/s/…/exec)을
 *     랜딩페이지 CONFIG.ENDPOINT 에 넣습니다.
 *
 * 코드를 고친 뒤에는 [배포] → [배포 관리] → 연필 아이콘 → 버전: 새 버전 으로
 * 다시 배포해야 반영됩니다. (URL은 그대로 유지됩니다.)
 */

// 알림 받을 주소. 비워 두면 스크립트를 배포한 구글 계정으로 보냅니다.
// 여러 명이면 쉼표로 구분: "a@gmail.com,b@gmail.com"
var NOTIFY_TO = "";

var SHEET_NAME = "지원자";

var FIELDS = [
  ["submitted_at", "접수일시"],
  ["name",         "이름"],
  ["phone",        "휴대전화"],
  ["job",          "현재 직업"],
  ["region",       "활동 지역"],
  ["age",          "나이"],
  ["gender",       "성별"],
  ["driving",      "자가운전"],
  ["career",       "영업 경력"],
  ["inquiry",      "기업영업 문의사항"],
  ["message",      "하고 싶은 말씀"],
  ["privacy_agree","개인정보 동의"],
  ["utm_source",   "utm_source"],
  ["utm_medium",   "utm_medium"],
  ["utm_campaign", "utm_campaign"],
  ["landing_url",  "유입 페이지"],
  ["referrer",     "referrer"]
];

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return json_({ ok: false, error: "bad json" });
  }
  if (!data.name || !data.phone) return json_({ ok: false, error: "missing fields" });

  data.submitted_at = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    saveRow_(data);
  } finally {
    lock.releaseLock();
  }
  sendMail_(data);

  return json_({ ok: true });
}

// 브라우저로 URL을 열었을 때 배포가 살아 있는지 확인용
function doGet() {
  return json_({ ok: true, service: "KBSS apply form" });
}

function saveRow_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;   // 시트에 연결되지 않은 독립 스크립트면 저장 생략
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(FIELDS.map(function (f) { return f[1]; }));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, FIELDS.length).setFontWeight("bold").setBackground("#E7EDF8");
  }
  // 휴대전화가 숫자로 바뀌어 앞자리 0이 사라지지 않도록 텍스트로 저장
  sh.appendRow(FIELDS.map(function (f) {
    var v = data[f[0]] == null ? "" : String(data[f[0]]);
    return f[0] === "phone" ? "'" + v : v;
  }));
}

function sendMail_(data) {
  var to = NOTIFY_TO || Session.getEffectiveUser().getEmail();
  var subject = "[KBSS 상담사 지원] " + data.name + " / " + (data.job || "-") + " / " + (data.region || "-") + " / " + (data.career || "-");

  var rows = FIELDS.filter(function (f) { return data[f[0]]; }).map(function (f) {
    return '<tr><th style="text-align:left;padding:8px 12px;background:#F0F4FB;border:1px solid #E3E7EF;white-space:nowrap">' +
      esc_(f[1]) + '</th><td style="padding:8px 12px;border:1px solid #E3E7EF">' +
      esc_(data[f[0]]).replace(/\n/g, "<br>") + "</td></tr>";
  }).join("");

  var html =
    '<div style="font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif;font-size:14px;color:#1A2233">' +
    '<h2 style="color:#1B3A7A;margin:0 0 12px">새 경영상담사 지원이 접수되었습니다</h2>' +
    '<table style="border-collapse:collapse">' + rows + "</table>" +
    '<p style="color:#5A6478;margin-top:16px">영업일 기준 2일 이내 연락 안내가 나간 상태입니다.</p></div>';

  var opts = { name: "KBSS 지원 알림", htmlBody: html };
  if (data.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) opts.replyTo = data.email;

  MailApp.sendEmail(to, subject, "새 경영상담사 지원: " + data.name + " " + data.phone, opts);
}

function esc_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 설치 3단계용: 권한 승인 + 테스트 메일 발송
function testMail() {
  sendMail_({
    submitted_at: Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
    name: "테스트", phone: "010-0000-0000", job: "GA 소속 설계사", region: "수원", age: "40대",
    gender: "여성", driving: "가능(자차 보유)", career: "3~5년", inquiry: "정책자금 상담 방법, 수수료·정산 구조",
    message: "테스트 메일입니다.", privacy_agree: "Y"
  });
}
