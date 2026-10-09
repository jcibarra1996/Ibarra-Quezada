# Logo IQ: fuente del rediseño (octubre 2026)

Propuesta de rediseño del monograma y los lockups. Los archivos finales viven en
`assets/brand/` (SVG maestros + `png/`). Esta carpeta guarda el generador para
poder regenerarlos con exactitud. No se publica en el sitio (`.vercelignore`).

**Estado:** propuesta pendiente de aprobación de JC. El sitio todavía usa el logo
anterior (`assets/logo-principal.png`, `assets/logo-negativo.png`).

## Construcción

- Anillo de la Q y fuste de la I con el mismo grosor (8.5 sobre un anillo de radio 44).
- El remate inferior de la I continúa en diagonal como cola de la Q.
- El anillo se interrumpe con un corte paralelo a la cola (hueco real, sin máscaras):
  funciona en una tinta y sobre cualquier fondo.
- Un solo color: `accent` #D8551D. Esquinas cuadradas. Sin degradados.
- Corte para ícono (`iq-favicon.svg`, `iq-app-icon.svg`): trazos ~40% más gruesos,
  solo para 16 a 180 px.

## Tipografía del wordmark (pendiente de confirmar)

El brochure no trae metadata de fuente. El wordmark está trazado a curvas con:

- "IBARRA QUEZADA": Cormorant Garamond SemiBold (SIL OFL 1.1)
- "ABOGADOS": Inter Medium (SIL OFL 1.1)

Si aparecen los archivos de fuente originales del brochure, se cambian en
`lockup.py` (`SER`, `SANS`) y se regenera.

## Regenerar

```sh
pip install fonttools brotli shapely
mkdir -p fonts
curl -L -o fonts/cormorant-garamond-latin-600-normal.woff2 https://cdn.jsdelivr.net/npm/@fontsource/cormorant-garamond@5.1.0/files/cormorant-garamond-latin-600-normal.woff2
curl -L -o fonts/inter-latin-500-normal.woff2 https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-500-normal.woff2
python3 build.py   # SVG en assets/brand/
node png.js        # PNG en assets/brand/png/ (requiere playwright)
```
