from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
F=os.path.join(os.path.dirname(os.path.abspath(__file__)),"fonts")+os.sep
_cache={}
def font(name):
    if name not in _cache: _cache[name]=TTFont(F+name)
    return _cache[name]
def text_path(txt,fontname,size,x=0,y=0,track=0.0,anchor="start"):
    """returns (d, width). y = baseline. track in em."""
    f=font(fontname); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    s=size/upm; adv=[]
    names=[cmap[ord(c)] for c in txt]
    total=sum(gs[n].width*s for n in names)+track*size*(len(txt)-1)
    if anchor=="middle": x-=total/2
    elif anchor=="end": x-=total
    pen=SVGPathPen(gs); cx=x
    for i,n in enumerate(names):
        tp=TransformPen(pen,(s,0,0,-s,cx,y)); gs[n].draw(tp)
        cx+=gs[n].width*s+track*size
    return pen.getCommands(), total
def cap_height(fontname,size):
    f=font(fontname); return f['OS/2'].sCapHeight*size/f['head'].unitsPerEm
