#!/usr/bin/env python3
"""배포 꾸러미(zip) 만들기 — 저장소 루트에서 python3 export/build.py 로 실행.

만들어지는 파일
  export/gwangmyeong-blogs-export.zip   두 페이지 + 입구 페이지 (전체)
  export/gm11-export.zip                광명11구역 재개발만 (단독)

압축을 풀어 아무 정적 호스팅(Netlify Drop, Cloudflare Pages, 일반 웹호스팅)에
폴더째 올리면 그대로 동작합니다.
"""
import os, shutil, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 게시된 페이지 주소 — 단독 꾸러미에서 형제 페이지로 나가는 링크에 쓴다
JAEGAEBAL_URL = 'https://claude.ai/artifact/TRYYfjVN535mLnTDHB75m7'

BUNDLES = {
    'gwangmyeong-blogs-export.zip': {
        'files': [
            ('export/index.html',                     'index.html'),
            ('export/읽어보세요.txt',                   '읽어보세요.txt'),
            ('jaegaebal/index.html',                  'jaegaebal/index.html'),
            ('jaegaebal/README.md',                   'jaegaebal/README.md'),
            ('jaegaebal/blog-analysis-kmrich2016.md', 'jaegaebal/blog-analysis-kmrich2016.md'),
            ('jaegaebal/samkkeut-logo.png',           'jaegaebal/samkkeut-logo.png'),
            ('gm11/index.html',                       'gm11/index.html'),
        ],
        # 압축을 풀어 file://로 열어도 페이지 사이 이동이 되도록 파일명을 명시
        'rewrite': {'href="../jaegaebal/"': 'href="../jaegaebal/index.html"'},
    },
    'gm11-export.zip': {
        'files': [
            ('gm11/index.html',            'index.html'),
            ('export/읽어보세요-광명11구역.txt', '읽어보세요.txt'),
        ],
        # 단독 꾸러미에는 형제 페이지가 없으므로 게시된 주소로 내보낸다
        'rewrite': {'href="../jaegaebal/"': 'href="%s" target="_blank" rel="noopener"' % JAEGAEBAL_URL},
    },
}

def build(name, spec):
    out = os.path.join(ROOT, 'export', name)
    tmp = tempfile.mkdtemp()
    try:
        for src, dst in spec['files']:
            s = os.path.join(ROOT, src)
            d = os.path.join(tmp, dst)
            os.makedirs(os.path.dirname(d), exist_ok=True)
            if src.endswith('.html'):
                text = open(s, encoding='utf-8').read()
                for a, b in spec['rewrite'].items():
                    text = text.replace(a, b)
                open(d, 'w', encoding='utf-8').write(text)
            else:
                shutil.copy(s, d)
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
            for dp, _, fs in os.walk(tmp):
                for f in sorted(fs):
                    full = os.path.join(dp, f)
                    z.write(full, os.path.relpath(full, tmp))
        print('만들었습니다: %s (%.1f KB)' % (out, os.path.getsize(out) / 1024))
    finally:
        shutil.rmtree(tmp)

if __name__ == '__main__':
    for name, spec in BUNDLES.items():
        build(name, spec)
