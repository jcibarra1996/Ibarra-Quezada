from mark import *
from textpath import text_path, cap_height
A="#D8551D"; INK="#201816"; CREMA="#F6EEEB"
import re
def _mk(**kw):
    d,bb=monogram_path(**kw)
    W=kw.get("W",8.5); R=kw.get("R",44); Ro=R+W/2
    class M: pass
    m=M(); m.d=d; m.bounds=(min(60-Ro,bb[0]),min(58-Ro,bb[1]),max(60+Ro,bb[2]),max(58+Ro,bb[3])); return m
MARK=_mk()
MARK_FAV=_mk(W=12,R=42,serw=30,serh=7,gap=4.5,stem=12,tail_end=(106,114))
def to_path(m,prec=2): return m.d
_num=re.compile(r"-?\d+\.\d+")
def rnd(d): return _num.sub(lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), d)
SER={"c600":"cormorant-garamond-latin-600-normal.woff2"}
SANS="inter-latin-500-normal.woff2"
def wordmark(serif, size, x, y, anchor="start", track=0.10, sub_ratio=0.36, sub_gap=None):
    f=SER[serif]
    d1,w1=text_path("IBARRA QUEZADA",f,size,x,y,track=track,anchor=anchor)
    ch=cap_height(f,size)
    ssize=size*sub_ratio
    # tracking so ABOGADOS spans same width as main line
    tr=0.42
    sg = sub_gap if sub_gap is not None else ch*0.62
    sy=y+sg+cap_height(SANS,ssize)
    d2,_=text_path("ABOGADOS",SANS,ssize,x,sy,track=tr,anchor=anchor)
    return d1,d2,w1,(y-ch,sy)
def horizontal(serif="c600", ink=INK, mark=A):
    mx0,my0,mx1,my1=MARK.bounds
    size=27; ch=cap_height(SER[serif],size)
    x=mx1+16
    # center text block on ring center 58
    sub_h=cap_height(SANS,size*0.36); gap=ch*0.62
    block=ch+gap+sub_h; y=58-block/2+ch
    d1,d2,w,_=wordmark(serif,size,x,y)
    W_=x+w-mx0; p=0
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{mx0:.2f} {my0:.2f} {W_:.2f} {my1-my0:.2f}"><path fill="{mark}" d="{to_path(MARK)}"/><path fill="{ink}" d="{rnd(d1)}"/><path fill="{ink}" d="{rnd(d2)}"/></svg>'
def vertical(serif="c600", ink=INK, mark=A):
    mx0,my0,mx1,my1=MARK.bounds
    size=21; ch=cap_height(SER[serif],size)
    cx=60; y=my1+22+ch
    d1,d2,w,(t,sy)=wordmark(serif,size,cx,y,anchor="middle")
    x0=min(mx0,cx-w/2); x1=max(mx1,cx+w/2)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {my0:.2f} {x1-x0:.2f} {sy-my0+0.5:.2f}"><path fill="{mark}" d="{to_path(MARK)}"/><path fill="{ink}" d="{rnd(d1)}"/><path fill="{ink}" d="{rnd(d2)}"/></svg>'
def mono(g=MARK, color=A, pad=0):
    x0,y0,x1,y1=g.bounds
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0-pad:.2f} {y0-pad:.2f} {x1-x0+2*pad:.2f} {y1-y0+2*pad:.2f}"><path fill="{color}" d="{to_path(g)}"/></svg>'
def favicon(bg=None):
    # square tile; mark centered optically on ring
    g=MARK_FAV; x0,y0,x1,y1=g.bounds; s=max(x1-x0,y1-y0)+10
    cx=(x0+x1)/2; cy=(y0+y1)/2
    rect=f'<rect x="{cx-s/2:.2f}" y="{cy-s/2:.2f}" width="{s:.2f}" height="{s:.2f}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{cx-s/2:.2f} {cy-s/2:.2f} {s:.2f} {s:.2f}">{rect}<path fill="{A}" d="{to_path(g)}"/></svg>'
