#!/usr/bin/env bash
# 사용법: ./apps-script/set-endpoint.sh "https://script.google.com/macros/s/XXXX/exec"
set -euo pipefail
url="${1:?웹 앱 URL을 인자로 넣어주세요}"
[[ "$url" =~ ^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$ ]] || { echo "올바른 Apps Script 웹 앱 URL이 아닙니다: $url"; exit 1; }
cd "$(dirname "$0")/.."
# 경정청구.html: 번들 안 JSON 문자열이라 따옴표가 \" 로 이스케이프되어 있음
sed -i -E 's#(ENDPOINT *: *\\")[^\\"]*(\\")#\1'"$url"'\2#' 경정청구.html
# index.html: 일반 HTML
sed -i -E 's#(ENDPOINT *: *")[^"]*(")#\1'"$url"'\2#' index.html
grep -o -E 'ENDPOINT *: *\\?"[^"\\]*' 경정청구.html index.html
