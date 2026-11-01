"""
보험사 수수료표(엑셀) → 상품별·회차별·항목별 수수료 지급률 추출기

사용법:
    pip install openpyxl msoffcrypto-tool
    python tools/extract_fee_tables.py <엑셀폴더> data/fee_products.json --password <파일암호>

동작 순서
  1) (선택) 암호 걸린 xlsx를 메모리에서 해제
  2) 시트 이름에 '시뮬'이 들어간 시뮬레이션 시트만 읽음
  3) '보험료대비' / '월납P 대비' 헤더를 기준으로 표 블록을 찾음
     - 같은 행 왼쪽의 '구분' 열 = 회차 라벨 열 (1차월, 1회 ...)
     - 그 사이 열 = 수수료 항목 (성과수수료, 계약관리 ...)
  4) 회차별 지급률 = 각 항목 금액 ÷ 시뮬레이션 보험료  (보험료 대비 배수)
  5) 원본의 1차년계·총계와 합계를 대조해 검증
"""
import openpyxl,os,re,json,sys,io,argparse
def isnum(v): return isinstance(v,(int,float)) and not isinstance(v,bool)
def s(v): return re.sub(r'\s+',' ',str(v)).strip() if v is not None else ''
RX_N=re.compile(r'^(\d+)\s*(차월|회|회차)$')
RX_SUM=re.compile(r'(차년(도)?\s*계|초년도\s*계|^총\s*계$|^합\s*계$|^계$)')
def parse_sheet(ws):
    g={}
    for row in ws.iter_rows():
        for c in row:
            if c.value is not None: g[(c.row,c.column)]=c.value
    maxr=ws.max_row
    heads=[(r,c) for (r,c),v in g.items() if isinstance(v,str) and '대비' in v]
    blocks=[]
    for hr,cc in sorted(heads):
        lc=None
        for c in range(cc-1,max(0,cc-16),-1):
            if s(g.get((hr,c)))=='구분': lc=c;break
        if lc is None: continue
        # data rows
        rows=[];sums=[];miss=0;r=hr+1
        while r<=maxr and miss<6:
            lab=s(g.get((hr if False else r,lc)))
            m=RX_N.match(lab)
            if m:
                miss=0
                if int(m.group(1)) not in [x for x,_ in rows]: rows.append((int(m.group(1)),r))
            elif lab and RX_SUM.search(lab):
                miss=0; sums.append((lab,r))
                if lab.replace(' ','') in('총계','합계'): break
            elif lab=='' : miss+=1
            else:
                if rows: miss+=1
            r+=1
        if len(rows)<3: continue
        totc=cc-1
        # item columns & names (forward-fill header, combine sub-header)
        items=[];last=''
        for c in range(lc+1,totc):
            h=s(g.get((hr,c)))
            if h: last=h
            sub=s(g.get((hr+1,c)))
            if sub and not RX_N.match(sub) and not isnum(g.get((hr+1,c))) and sub!='지급률':
                name=f"{last} {sub}".strip()
            else: name=last
            items.append((c,name or f'항목{c}'))
        # premium basis
        prem=None
        for n,r in rows:
            a=g.get((r,totc)); q=g.get((r,cc))
            if isnum(a) and isnum(q) and a>0 and q>0: prem=round(a/q); break
        sched=[]
        for n,r in rows:
            q=g.get((r,cc)); q=float(q) if isnum(q) else 0.0
            it={}
            for c,name in items:
                v=g.get((r,c))
                if isnum(v) and v!=0 and prem: it[name]=round(it.get(name,0)+v/prem,6)
            sched.append({'n':n,'r':round(q,6),'it':it})
        summ=[]
        for lab,r in sums:
            q=g.get((r,cc)); summ.append({'lab':lab,'r':round(float(q),6) if isnum(q) else None})
        HW={'보험료','수정률','수정P','환산율','총환산월초','구분','수수료항목','상품','상품명','상품군','상품구분','상품분류','납기'}
        def okname(v,raw):
            return v and not isnum(raw) and v not in HW and not re.match(r'(?i)^group',v)
        prod=None
        rng=range(hr-1,max(0,hr-16),-1); cols=range(lc,cc+2)
        for rr in rng:
            for c in cols:
                v=s(g.get((rr,c)))
                if re.match(r'^[<\[［〈].+[>\]］〉]$',v): prod=v.strip('<>[]［］〈〉 ');break
            if prod: break
        if not prod:
            for rr in rng:
                for c in cols:
                    if s(g.get((rr,c))) in('상품','상품명','상품군','상품구분','상품분류'):
                        for (r2,c2) in((rr+1,c),(rr,c+1)):
                            v=s(g.get((r2,c2)))
                            if okname(v,g.get((r2,c2))): prod=v;break
                    if prod: break
                if prod: break
        if not prod:
            for rr in rng:
                for c in cols:
                    raw=g.get((rr,c)); v=s(raw)
                    if isinstance(raw,str) and re.match(r'^\d\.\s*[가-힣A-Za-z]',v): prod=re.sub(r'^\d\.\s*','',v);break
                if prod: break
        if not prod:  # 상품명 헤더가 표에서 멀리 떨어진 시트(IBK 등)
            for rr in range(hr-1,max(0,hr-40),-1):
                if s(g.get((rr,lc)))=='상품명':
                    v=s(g.get((rr+1,lc)))
                    if okname(v,g.get((rr+1,lc))): prod=v.replace('(무)','').strip()
                    break
        blocks.append({'hr':hr,'prod':prod,'prem':prem,'items':[nm for _,nm in items],
                       'sched':sched,'sums':summ})
    return blocks

def load(path,password):
    if not password: return openpyxl.load_workbook(path,data_only=True)
    import msoffcrypto
    f=msoffcrypto.OfficeFile(open(path,'rb'))
    if not f.is_encrypted(): return openpyxl.load_workbook(path,data_only=True)
    f.load_key(password=password); buf=io.BytesIO(); f.decrypt(buf)
    return openpyxl.load_workbook(buf,data_only=True)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--password')
    a=ap.parse_args()
    raw=[]
    for n in sorted(os.listdir(a.src)):
        if not n.lower().endswith('.xlsx'): continue
        m=re.match(r'(손보|생보)(\d+)_\((\d{6})\)\s*#?([^(]+?)\s*\((.+?)\)\s*[-_]\s*\d{8}',n)
        if not m: print('파일명 형식 불일치, 건너뜀:',n); continue
        kind,mon,comp,typ=m.group(1),m.group(3),m.group(4).strip(),m.group(5)
        wb=load(os.path.join(a.src,n),a.password)
        for ws in wb.worksheets:
            if not re.search(r'시뮬|시물',ws.title): continue
            for b in parse_sheet(ws):
                b.update(kind=kind,company=comp,month=mon,type=typ); raw.append(b)
    out=[];seen=set()
    for b in raw:
        sig=(b['company'],json.dumps([(x['n'],x['r']) for x in b['sched']]))
        if sig in seen: continue
        seen.add(sig)
        code=b['type'].split('_')[-1].strip()
        prod=b['prod'] or (f"장기보장 {code}" if b['kind']=='손보' else code)
        sched=sorted(b['sched'],key=lambda x:x['n']); items=[]
        for x in sched:
            for k in x['it']:
                if k not in items: items.append(k)
        rows=[[x['n'],round(x['r'],6),[round(x['it'].get(k,0),6) for k in items]] for x in sched]
        while len(rows)>12 and rows[-1][1]==0: rows.pop()
        sums={x['lab'].replace(' ',''):x['r'] for x in b['sums']}
        out.append({'k':b['kind'],'c':b['company'],'p':prod,'m':b['month'],'t':b['type'],
                    'prem':b['prem'],'items':items,'rows':rows,'sums':sums})
        y1=sum(r[1] for r in rows if r[0]<=12); sh=sums.get('1차년계',sums.get('초년도계'))
        ok='OK' if sh is None or abs(sh-y1)<0.002 else f'원본 1차년계 {sh} 와 다름'
        print(f"{b['kind']} {b['company']:<8} {prod[:20]:<20} 1차년 {y1:.4f}  {ok}")
    out.sort(key=lambda o:(0 if o['k']=='손보' else 1,o['c']))
    json.dump(out,open(a.out,'w'),ensure_ascii=False,indent=1)
    print(len(out),'개 상품 →',a.out)

if __name__=='__main__': main()
