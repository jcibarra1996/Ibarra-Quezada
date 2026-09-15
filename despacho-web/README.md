# Despacho Virtual — consola local

Versión local del panel "Despacho Virtual": el mismo diseño visual retro
(Among Us / Game Boy) del [Artifact publicado en claude.ai](https://claude.ai/artifact/YbJajdBVCf4sgXLNJTXDbm),
pero corriendo en tu computadora y hablando de verdad con el CLI de
`claude` — no una simulación aislada en el navegador.

## Qué hace

1. Elegís a quién le hablás (un agente de `.claude/agents/*.md`, o "todo el
   equipo") y escribís una instrucción en la consola de órdenes.
2. El servidor local (`server.js`) arma un prompt y corre
   `claude -p` con el directorio del proyecto (un nivel arriba de
   `despacho-web/`) como working directory.
3. Claude Code lee `CLAUDE.md`, la persona del agente en
   `.claude/agents/<agente>.md` y, si el target es `equipo`,
   `.claude/commands/junta-equipo.md`, y responde actuando como ese agente.
   Si de verdad edita un archivo del repo, tiene instrucciones explícitas
   de decirlo en su respuesta.
4. La orden y la respuesta completa quedan guardadas en
   `despacho-web/historial.json`, así que el front puede mostrar el
   historial real aunque reinicies el servidor.

## Cómo levantarlo

Desde la raíz del proyecto:

```
npm run despacho
```

Esto instala la única dependencia (`express`) dentro de `despacho-web/` y
arranca el servidor. Abrí la URL que imprime en la terminal (por default
`http://localhost:4173`).

Alternativamente, desde esta carpeta:

```
cd despacho-web
npm install
npm start
```

## ⚠️ Riesgo: corre sin pedir confirmación

Esta consola dispara `claude -p` con `--permission-mode acceptEdits
--permission-prompts none`. En la práctica eso significa:

- **Leer y escribir archivos del proyecto queda auto-aprobado.** No hay
  ningún humano en medio de una llamada HTTP para aprobar cada edición, así
  que si le pedís a un agente que cambie algo, lo va a cambiar directo en
  tu disco — sin pedirte confirmación como sí hace la sesión interactiva de
  Claude Code.
- **Cualquier otro permiso (por ejemplo correr un comando de shell) queda
  denegado automáticamente**, no colgado esperando una aprobación que nunca
  llega. `--permission-prompts none` hace que todo lo que normalmente
  generaría un prompt interactivo se rechace solo, en vez de bloquear la
  respuesta HTTP indefinidamente.
- El proceso corre con el `cwd` fijado a la raíz del proyecto, así que las
  ediciones de archivo quedan acotadas a esta carpeta del repo (no a todo
  tu sistema de archivos).

Si preferís bypass total (incluyendo comandos de shell, a tu propio
riesgo), podés arrancar el servidor con:

```
DESPACHO_PERMISSION_MODE=bypassPermissions npm run despacho
```

Esto es **más riesgoso** — un agente podría en teoría correr cualquier
comando sin que nadie lo revise antes. Solo usalo si confiás en las
instrucciones que le vas a dar y entendés que no hay red de seguridad
interactiva.

En cualquiera de los dos modos: **todo cambio queda en tu working tree como
cualquier edición manual** — nada se commitea ni se pushea solo. Revisá
`git status` / `git diff` antes de commitear lo que haga un agente, igual
que revisarías tu propio trabajo.

## Variables de entorno opcionales

- `DESPACHO_PORT` — puerto del servidor (default `4173`).
- `DESPACHO_PERMISSION_MODE` — modo de permisos pasado a `claude -p`
  (default `acceptEdits`; ver riesgo arriba).
- `DESPACHO_TIMEOUT_MS` — tiempo máximo de espera por orden antes de matar
  el proceso de `claude` (default 10 minutos, en milisegundos).

## Limitaciones

- Solo funciona mientras la terminal donde corriste `npm run despacho` esté
  abierta. Si la cerrás, el servidor se apaga y la consola deja de
  responder (aunque `historial.json` queda guardado).
- No hay ningún link para compartir fuera de tu computadora — es
  `localhost`, no un despliegue público.
- Requiere tener el CLI `claude` instalado y autenticado en la misma
  máquina donde corre `server.js`.
