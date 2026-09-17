'use strict';

const express = require('express');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HISTORIAL_PATH = path.join(__dirname, 'historial.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = process.env.DESPACHO_PORT || 4173;

// acceptEdits: Claude Code puede leer/editar archivos sin pedir confirmación
// interactiva, pero cualquier otro permiso (Bash, red, etc.) queda denegado
// automáticamente en vez de quedar colgado esperando a un humano que no existe
// en una llamada HTTP. Ver despacho-web/README.md para el detalle de riesgo.
const PERMISSION_MODE = process.env.DESPACHO_PERMISSION_MODE || 'acceptEdits';

// Cuánto acceso a git tienen los agentes, además de leer/editar archivos:
//   'full'   -> pueden hacer add, commit Y push directo a la rama (sin que
//               nadie revise antes de que llegue a GitHub)
//   'commit' -> pueden add/commit local, pero el push lo hacés vos a mano
//   'none'   -> nada de git, solo edición de archivos (el default original)
// Ver despacho-web/README.md para el detalle de riesgo de cada nivel.
const GIT_ACCESS = process.env.DESPACHO_GIT_ACCESS || 'full';

const GIT_ALLOWED_TOOLS = {
  full: ['Bash(git *)'],
  commit: [
    'Bash(git add:*)',
    'Bash(git commit:*)',
    'Bash(git status:*)',
    'Bash(git diff:*)',
    'Bash(git log:*)',
  ],
  none: [],
}[GIT_ACCESS] || [];

const AGENTES = [
  'gustavo',
  'isabel',
  'rodrigo',
  'paulina',
  'santiago',
  'mauricio',
  'renata',
  'diego',
  'valentina',
  'fernando',
  'camila',
];

// Tiempo máximo para una orden: Claude Code leyendo/editando archivos reales
// puede tardar bastante más que una respuesta de chat normal.
const TIMEOUT_MS = Number(process.env.DESPACHO_TIMEOUT_MS || 10 * 60 * 1000);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR));

function instruccionGit() {
  if (GIT_ACCESS === 'full') {
    return 'Si haces un cambio real, además de editar el archivo dejá un commit de git ' +
      '(add + commit, mensaje corto y claro) y pusheálo a la rama actual: tenés permiso ' +
      'para correr git de punta a punta, nadie más lo va a revisar antes de que llegue a GitHub.';
  }
  if (GIT_ACCESS === 'commit') {
    return 'Si haces un cambio real, además de editar el archivo dejá un commit de git local ' +
      '(add + commit, mensaje corto y claro). No hagas push: eso lo hace un humano a mano.';
  }
  return 'No tenés acceso a git en esta sesión: si haces un cambio, dejalo editado en el ' +
    'archivo nada más, sin intentar commitear.';
}

function construirPrompt(target, message) {
  if (target === 'equipo') {
    return [
      'Lee .claude/commands/junta-equipo.md y sigue exactamente ese',
      'procedimiento para la siguiente orden del equipo:',
      '',
      message,
      '',
      instruccionGit(),
    ].join('\n');
  }

  return [
    `Lee tu persona en .claude/agents/${target}.md y también CLAUDE.md.`,
    'Actúa como ese agente (su tono, su rol y sus límites) y haz lo',
    'siguiente:',
    '',
    message,
    '',
    'Si de verdad haces un cambio en algún archivo del repositorio, dilo',
    'explícitamente en tu respuesta, nombrando el archivo.',
    instruccionGit(),
  ].join('\n');
}

async function gitStatusPorcelano() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['status', '--porcelain', '--untracked-files=all'],
      { cwd: PROJECT_ROOT, maxBuffer: 10 * 1024 * 1024 }
    );
    return new Set(
      stdout
        .split('\n')
        .map((linea) => linea.trim())
        .filter(Boolean)
    );
  } catch (err) {
    console.error('No se pudo leer git status:', err.message);
    return new Set();
  }
}

function archivosDesdeStatus(lineas) {
  // Cada línea de `git status --porcelain` es "XY ruta/al/archivo"
  return [...lineas].map((linea) => linea.slice(3).trim());
}

function correrClaude(prompt) {
  return new Promise((resolve, reject) => {
    // El prompt va pegado a -p, antes de cualquier otra bandera: --allowedTools
    // es variádica y si el prompt quedara después se lo comería como si fuera
    // otro nombre de herramienta más.
    const args = [
      '-p',
      prompt,
      '--permission-mode',
      PERMISSION_MODE,
      '--permission-prompts',
      'none',
    ];
    if (GIT_ALLOWED_TOOLS.length) {
      args.push('--allowedTools', GIT_ALLOWED_TOOLS.join(' '));
    }

    const proc = spawn('claude', args, {
      cwd: PROJECT_ROOT,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let terminado = false;

    const timer = setTimeout(() => {
      terminado = true;
      proc.kill('SIGTERM');
      reject(new Error(`claude no respondió dentro de ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('error', (err) => {
      if (terminado) return;
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      if (terminado) return;
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr.trim() || `claude terminó con código ${code}`));
        return;
      }
      resolve(stdout.trim() || stderr.trim());
    });
  });
}

function leerHistorial() {
  try {
    const raw = fs.readFileSync(HISTORIAL_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('Historial corrupto, se ignora:', err.message);
    return [];
  }
}

function agregarAlHistorial(entrada) {
  const historial = leerHistorial();
  historial.push(entrada);
  fs.writeFileSync(HISTORIAL_PATH, JSON.stringify(historial, null, 2), 'utf8');
}

app.post('/orden', async (req, res) => {
  const { target, message } = req.body || {};

  if (typeof target !== 'string' || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Falta target o message.' });
    return;
  }

  const targetNormalizado = target.trim().toLowerCase();
  if (targetNormalizado !== 'equipo' && !AGENTES.includes(targetNormalizado)) {
    res.status(400).json({
      error: `target inválido. Usa uno de: ${AGENTES.join(', ')}, equipo.`,
    });
    return;
  }

  const prompt = construirPrompt(targetNormalizado, message.trim());
  const antes = await gitStatusPorcelano();

  let respuesta;
  let error = null;
  try {
    respuesta = await correrClaude(prompt);
  } catch (err) {
    error = err.message;
    respuesta = `⚠️ Error ejecutando Claude Code: ${err.message}`;
  }

  const despues = await gitStatusPorcelano();
  const nuevasOModificadas = [...despues].filter((linea) => !antes.has(linea));
  const archivosModificados = archivosDesdeStatus(nuevasOModificadas);

  const entrada = {
    timestamp: new Date().toISOString(),
    agente: targetNormalizado,
    mensaje: message.trim(),
    respuesta,
    archivosModificados,
    error,
  };

  agregarAlHistorial(entrada);

  res.status(error ? 502 : 200).json(entrada);
});

app.get('/historial', (req, res) => {
  res.json(leerHistorial());
});

app.listen(PORT, () => {
  console.log('');
  console.log('  Despacho Virtual (local) escuchando en:');
  console.log(`  http://localhost:${PORT}`);
  console.log('');
  console.log(`  Proyecto: ${PROJECT_ROOT}`);
  console.log(`  Modo de permisos de Claude Code: ${PERMISSION_MODE}`);
  console.log(`  Acceso a git de los agentes: ${GIT_ACCESS}`);
  console.log('');
});
