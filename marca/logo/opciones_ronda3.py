import sys, re, math
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mark import monogram_path
from textpath import text_path, cap_height, font
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen
A="#D8551D"; INK="#201816"; CREMA="#F6EEEB"; NEGRO="#0D0D0D"
JOST="jost-latin-500-normal.woff2"; JOSTR="jost-latin-400-normal.woff2"
SERIF="cormorant-garamond-latin-600-normal.woff2"; INTER="inter-latin-500-normal.woff2"
_num=re.compile(r"-?\d+\.\d+")
def rnd(d): return _num.sub(lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), d)
_uid=[0]
def uid(p): _uid[0]+=1; return f"{p}{_uid[0]}"

def contours(ch, fontname, size, x, y):
    f=font(fontname); gs=f.getGlyphSet(); g=gs[f.getBestCmap()[ord(ch)]]; s=size/f['head'].unitsPerEm
    rec=RecordingPen(); g.draw(rec)
    out=[]; cur=[]
    for op,args in rec.value:
        cur.append((op,args))
        if op in ("closePath","endPath"): out.append(cur); cur=[]
    ds=[]
    for c in out:
        p=SVGPathPen(None); tp=TransformPen(p,(s,0,0,-s,x,y))
        for op,args in c: getattr(tp,op)(*args)
        ds.append(rnd(p.getCommands()))
    return ds, g.width*s

def ink_of(theme): return INK if theme=="crema" else CREMA

# ---------- A: Q con cola naranja dentro del nombre ----------
def word_q(theme="crema", size=50, track=0.06, x=0, base=None, sub=True, face=JOST):
    ink=ink_of(theme); ch=cap_height(face,size); base=ch if base is None else base
    out=""; cx=x; txt="IBARRA QUEZADA"
    for i,c in enumerate(txt):
        if c==" ":
            cx+= font(face).getGlyphSet()[font(face).getBestCmap()[32]].width*size/1000 + track*size; continue
        if c=="Q":
            ds,w=contours("Q",face,size,cx,base)
            bowl="".join(ds[:2]); tail=ds[2]; m=uid("m")
            out+=(f'<mask id="{m}" maskUnits="userSpaceOnUse" x="-50" y="-200" width="2000" height="400"><rect x="-50" y="-200" width="2000" height="400" fill="#fff"/>'
                  f'<path d="{tail}" fill="#000" stroke="#000" stroke-width="{size*0.05:.2f}"/></mask>'
                  f'<path fill="{ink}" fill-rule="nonzero" mask="url(#{m})" d="{bowl}"/><path fill="{A}" d="{tail}"/>')
        else:
            d,w=text_path(c,face,size,cx,base); out+=f'<path fill="{ink}" d="{rnd(d)}"/>'
        cx+=w+track*size
    W=cx-track*size-x
    bottom=base+size*0.14
    if sub:
        ss=size*0.30; sch=cap_height(INTER,ss); sy=base+ch*0.75+sch
        d,_=text_path("ABOGADOS",INTER,ss,x,sy,track=0.38); out+=f'<path fill="{ink}" d="{rnd(d)}"/>'
        bottom=sy+1
    return out, W, (base-ch, bottom)

def logo_A(theme="crema"):
    out,W,(t,b)=word_q(theme)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 {t-2:.2f} {W+4:.2f} {b-t+4:.2f}">{out}</svg>'
def icon_A(theme="crema"):
    # I + Q con cola naranja, sueltos
    ink=ink_of(theme); size=100; face=JOST; ch=cap_height(face,size)
    dI,wI=text_path("I",face,size,0,ch)
    ds,wQ=contours("Q",face,size,wI+size*0.04,ch); m=uid("m")
    out=(f'<path fill="{ink}" d="{rnd(dI)}"/><mask id="{m}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="400" height="300"><rect x="-50" y="-50" width="400" height="300" fill="#fff"/><path d="{ds[2]}" fill="#000" stroke="#000" stroke-width="5"/></mask>'
         f'<path fill="{ink}" mask="url(#{m})" d="{"".join(ds[:2])}"/><path fill="{A}" d="{ds[2]}"/>')
    W=wI+size*0.04+wQ
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -6 {W+8:.2f} {ch+size*0.22+12:.2f}">{out}</svg>'

# ---------- B: Bloque Q (Q en negativo dentro de un cuadrado) ----------
def block_d(x=0,y=0,s=100):
    k=s/100
    cx,cy,r=50,47,31
    # counter circle (knockout), I inside in accent, tail knockout to corner
    circle=f"M{x+(cx-r)*k:.2f},{y+cy*k:.2f}a{r*k:.2f},{r*k:.2f} 0 1,0 {2*r*k:.2f},0a{r*k:.2f},{r*k:.2f} 0 1,0 -{2*r*k:.2f},0z"
    return circle, k, (cx,cy,r)
def block(x=0,y=0,s=100,theme="crema"):
    k=s/100; cx,cy,r=50,47,31
    sq=f"M{x:.2f},{y:.2f}h{s:.2f}v{s:.2f}h-{s:.2f}z"
    circ=f"M{x+(cx-r)*k:.2f},{y+cy*k:.2f}a{r*k:.2f},{r*k:.2f} 0 1,0 {2*r*k:.2f},0a{r*k:.2f},{r*k:.2f} 0 1,0 -{2*r*k:.2f},0z"
    # tail: band from inside counter (66,63) to beyond corner (110,107), width 8
    def band(p0,p1,w):
        dx,dy=p1[0]-p0[0],p1[1]-p0[1]; L=math.hypot(dx,dy); nx,ny=-dy/L*w/2,dx/L*w/2
        pts=[(p0[0]+nx,p0[1]+ny),(p1[0]+nx,p1[1]+ny),(p1[0]-nx,p1[1]-ny),(p0[0]-nx,p0[1]-ny)]
        return "M"+" L".join(f"{x+px*k:.2f},{y+py*k:.2f}" for px,py in pts)+"Z"
    tail=band((62,60),(104,102),8.5)
    m=uid("b")
    # I in the counter: stem + slab serifs
    st=9; top,bot=27,67; sw=22; sh=4.5
    I=(f"M{x+(cx-st/2)*k:.2f},{y+top*k:.2f}h{st*k:.2f}v{(bot-top)*k:.2f}h-{st*k:.2f}z"
       f"M{x+(cx-sw/2)*k:.2f},{y+top*k:.2f}h{sw*k:.2f}v{sh*k:.2f}h-{sw*k:.2f}z"
       f"M{x+(cx-sw/2)*k:.2f},{y+(bot-sh)*k:.2f}h{sw*k:.2f}v{sh*k:.2f}h-{sw*k:.2f}z")
    return (f'<mask id="{m}" maskUnits="userSpaceOnUse" x="{x-1}" y="{y-1}" width="{s+2}" height="{s+2}">'
            f'<path fill="#fff" d="{sq}"/><path fill="#000" d="{circ}"/><path fill="#000" d="{tail}"/><path fill="#fff" d="{I}"/></mask>'
            f'<path fill="{A}" mask="url(#{m})" d="{sq}"/>')
def logo_B(theme="crema", face=JOST, stacked=False):
    ink=ink_of(theme); size=40 if not stacked else 38; ch=cap_height(face,size)
    if not stacked:
        s=ch*2.9; x=s+ch*0.9
        ss=size*0.30; sch=cap_height(INTER,ss)
        blockh=ch+ch*0.8+sch; base=(s-blockh)/2+ch
        d,w=text_path("IBARRA QUEZADA",face,size,x,base,track=0.06)
        sy=base+ch*0.8+sch
        d2,_=text_path("ABOGADOS",INTER,ss,x,sy,track=0.38)
        out=block(0,0,s,theme)+f'<path fill="{ink}" d="{rnd(d)}"/><path fill="{ink}" d="{rnd(d2)}"/>'
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 {x+w+2:.2f} {s+2:.2f}">{out}</svg>'
def icon_B(theme="crema"): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{block(0,0,100,theme)}</svg>'

# ---------- C: monograma de una sola pieza + nombre apilado en sans ----------
def logo_C(theme="crema", face=JOST):
    ink=ink_of(theme); d,_=monogram_path()
    size=34; ch=cap_height(face,size); lead=ch*0.62
    mh=104.25; k=1.0
    # names stacked, block height = mark height of ring (96.5): align caps top to ring top+? use ring box 9.75..106.25
    ring_top,ring_bot=9.75,106.25
    ss=size*0.36; sch=cap_height(INTER,ss)
    total=ch+lead+ch+lead*1.1+sch
    t0=(ring_top+ring_bot)/2-total/2
    x=124
    b1=t0+ch; b2=b1+lead+ch; b3=b2+lead*1.1+sch
    d1,w1=text_path("IBARRA",face,size,x,b1,track=0.10)
    d2,w2=text_path("QUEZADA",face,size,x,b2,track=0.10)
    d3,w3=text_path("ABOGADOS",INTER,ss,x,b3,track=0.42)
    rx=x-10
    out=(f'<path fill="{A}" d="{d}"/><rect x="{rx-0.5:.2f}" y="{t0-2:.2f}" width="1" height="{b3-t0+4:.2f}" fill="{A}" opacity="0"/>'
         f'<path fill="{ink}" d="{rnd(d1)}"/><path fill="{ink}" d="{rnd(d2)}"/><path fill="{ink}" d="{rnd(d3)}"/>')
    W=x+max(w1,w2,w3)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="11 9 {W-11+2:.2f} 106">{out}</svg>'
def icon_C(theme="crema"):
    d,_=monogram_path(W=12,R=42,serw=30,serh=7,gap=4.5,stem=12,tail_end=(106,114))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 4 108 114"><path fill="{A}" d="{d}"/></svg>'

# ---------- D: bloque Q, vertical, nombre en serif ----------
def logo_D(theme="crema", face=SERIF):
    ink=ink_of(theme); s=100
    size=24; ch=cap_height(face,size)
    d,w=text_path("IBARRA QUEZADA",face,size,0,0,track=0.10)
    W=max(w,s); bx=(W-s)/2
    base=s+ch*1.6+ch
    d,_=text_path("IBARRA QUEZADA",face,size,W/2,base,track=0.10,anchor="middle")
    ss=size*0.36; sch=cap_height(INTER,ss); sy=base+ch*0.7+sch
    d2,_=text_path("ABOGADOS",INTER,ss,W/2,sy,track=0.42,anchor="middle")
    out=block(bx,0,s,theme)+f'<path fill="{ink}" d="{rnd(d)}"/><path fill="{ink}" d="{rnd(d2)}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 {W+4:.2f} {sy+4:.2f}">{out}</svg>'
