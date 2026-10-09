"""Geometría del monograma IQ. Unidades sobre un lienzo de 120: anillo de radio 44, centro (60, 58)."""
import math
from shapely.geometry import Polygon, box
from shapely.ops import unary_union


def hband(p0, p1, w):
    """Banda de ancho w entre p0 y p1, con cortes horizontales en ambos extremos."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    off = w / 2 * math.hypot(dx, dy) / dy
    return Polygon([(p0[0] - off, p0[1]), (p0[0] + off, p0[1]), (p1[0] + off, p1[1]), (p1[0] - off, p1[1])])


def _poly_d(geom, prec):
    out = []
    for g in getattr(geom, "geoms", [geom]):
        for ring in [g.exterior, *g.interiors]:
            pts = list(ring.coords)[:-1]
            out.append("M" + " ".join(f"{x:.{prec}f},{y:.{prec}f}" for x, y in pts) + "Z")
    return "".join(out)


def monogram_path(W=8.5, R=44, CX=60, CY=58, top=30, bot=86, serw=26, serh=5, tail_end=(104, 114), gap=4, stem=None, prec=2):
    """Devuelve (d, bounds_de_I_y_cola).

    - Anillo y fuste comparten el grosor W; los remates miden serh.
    - El remate inferior de la I continúa en diagonal como cola de la Q.
    - El anillo se corta con un hueco `gap` paralelo a la cola (arcos reales, sin máscaras).
    """
    stem = stem or W
    I = unary_union([
        box(CX - stem / 2, top, CX + stem / 2, bot),
        box(CX - serw / 2, top, CX + serw / 2, top + serh),
        box(CX - serw / 2, bot - serh, CX + serw / 2, bot),
    ])
    sy = bot - serh
    ex, ey = tail_end
    slope = (ex - (CX + serw / 2 + 4.5)) / (ey - bot)
    sx = (CX + serw / 2 + 4.5) - slope * (bot - sy)
    tail = hband((sx, sy), (ex, ey), W)
    body = unary_union([I, tail]).simplify(0.001)

    dx, dy = ex - sx, ey - sy
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux

    def hit(r, off):
        px, py = sx + off * nx - CX, sy + off * ny - CY
        b = px * ux + py * uy
        c = px * px + py * py - r * r
        t = -b + math.sqrt(b * b - c)
        return (CX + px + t * ux, CY + py + t * uy)

    h = W / 2 + gap
    Ro, Ri = R + W / 2, R - W / 2
    oA, iA = hit(Ro, -h), hit(Ri, -h)
    oB, iB = hit(Ro, h), hit(Ri, h)
    f = lambda p: f"{p[0]:.{prec}f},{p[1]:.{prec}f}"
    ring = f"M{f(oA)}A{Ro:g},{Ro:g} 0 1 0 {f(oB)}L{f(iB)}A{Ri:g},{Ri:g} 0 1 1 {f(iA)}Z"
    return ring + _poly_d(body, prec), body.bounds
