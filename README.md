# Ibarra Quezada Abogados

Sitio web de marketing de Ibarra Quezada Abogados, más las herramientas
internas del despacho.

## 1. Ver el sitio localmente

El sitio es HTML/CSS/JS estático, sin build step. Para verlo, abrí
`index.html` directamente en el navegador, o serví la carpeta con cualquier
servidor estático, por ejemplo:

```
npx serve .
```

## 2. Estructura del repo

- `index.html` — landing page principal.
- `assets/`, `logo.png`, `og-image.jpg` — imágenes y branding.
- `IQLAW/`, `startup-audit/` — versiones alternas/históricas del sitio.
- `CLAUDE.md` — contexto del despacho para Claude Code.
- `.claude/agents/` — la persona de cada especialista del equipo.
- `.claude/commands/junta-equipo.md` — cómo correr una junta de equipo
  completa.

## 3. Consola local del "Despacho Virtual"

Además de la versión publicada como Artifact en claude.ai (que es una
demo visual sin acceso a archivos), este repo trae una versión local real
en `despacho-web/`: la misma escena retro, pero la consola de órdenes habla
de verdad con Claude Code corriendo sobre este proyecto.

Para levantarla:

```
npm run despacho
```

Esto va a imprimir en la terminal la URL local donde abrirla (por default
`http://localhost:4173`). Ahí podés elegir a qué agente le hablás (o a todo
el equipo) y darle una instrucción.

Algunas cosas a tener en cuenta:

1. Solo funciona mientras esa terminal esté abierta — si la cerrás, la
   consola deja de responder.
2. No tiene ningún link para compartir fuera de tu computadora; es
   `localhost`, no un despliegue público.
3. A diferencia de la versión Artifact, acá sí se editan archivos reales
   del repo cuando le pedís a un agente que haga un cambio — y lo hace sin
   pedirte confirmación en el medio, porque no hay ningún humano ahí para
   aprobarlo durante una llamada HTTP. El detalle completo de este riesgo,
   y cómo ajustarlo, está en [`despacho-web/README.md`](despacho-web/README.md).
