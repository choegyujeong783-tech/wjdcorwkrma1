#!/usr/bin/env python3
"""배포 꾸러미(zip) 만들기 — 저장소 루트에서 python3 export/build.py 로 실행.

export/gwangmyeong-blogs-export.zip 이 만들어집니다.
압축을 풀어 아무 정적 호스팅(Netlify Drop, Cloudflare Pages, 일반 웹호스팅)에
폴더째 올리면 그대로 동작합니다.
"""
import os, shutil, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, 'export', 'gwangmyeong-blogs-export.zip')

FILES = [
    ('export/index.html',                            'index.html'),
    ('export/읽어보세요.txt',                          '읽어보세요.txt'),
    ('jaegaebal/index.html',                         'jaegaebal/index.html'),
    ('jaegaebal/README.md',                          'jaegaebal/README.md'),
    ('jaegaebal/blog-analysis-kmrich2016.md',        'jaegaebal/blog-analysis-kmrich2016.md'),
    ('jaegaebal/samkkeut-logo.png',                  'jaegaebal/samkkeut-logo.png'),
    ('gm11/index.html',                              'gm11/index.html'),
]

# 저장소 안에서는 폴더 링크(../jaegaebal/)를 쓰지만, 압축을 풀어 file://로 열 때도
# 동작하도록 꾸러미에서는 파일명을 명시한 링크로 바꾼다.
REWRITE = {'href="../jaegaebal/"': 'href="../jaegaebal/index.html"'}

def main():
    tmp = tempfile.mkdtemp()
    try:
        for src, dst in FILES:
            s = os.path.join(ROOT, src)
            d = os.path.join(tmp, dst)
            os.makedirs(os.path.dirname(d), exist_ok=True)
            if src.endswith('.html'):
                text = open(s, encoding='utf-8').read()
                for a, b in REWRITE.items():
                    text = text.replace(a, b)
                open(d, 'w', encoding='utf-8').write(text)
            else:
                shutil.copy(s, d)
        with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
            for dp, _, fs in os.walk(tmp):
                for f in sorted(fs):
                    full = os.path.join(dp, f)
                    z.write(full, os.path.relpath(full, tmp))
        print('만들었습니다:', OUT, '(%.1f KB)' % (os.path.getsize(OUT)/1024))
    finally:
        shutil.rmtree(tmp)

if __name__ == '__main__':
    main()
