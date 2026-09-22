// Endpoint de envío del formulario de contacto de ibarraquezada.com.
// Vercel serverless function (Node.js) — no requiere framework ni build step.
//
// Variables de entorno requeridas (ver .env.example):
//   RESEND_API_KEY     Clave de API de Resend (https://resend.com).
//   CONTACT_RECIPIENT  Correo del despacho que recibe cada solicitud.
// Variable opcional:
//   RESEND_FROM        Remitente verificado en Resend. Si no está configurado,
//                       se usa el remitente de prueba de Resend (onboarding@resend.dev).

const ALLOWED_AREAS = [
  'Constitución & Derecho Corporativo',
  'Contratos Mercantiles & Civiles',
  'Consultoría Laboral',
  'Gobierno Corporativo & Cumplimiento',
  'Fusiones & Adquisiciones',
  'Automatización Legal',
  'Otro',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Límite básico de frecuencia por IP. Vive en memoria del propio proceso de la
// función: es best-effort (se reinicia si la instancia se recicla, y no se
// comparte entre instancias concurrentes), pero es la protección razonable
// disponible sin agregar una base de datos o un servicio externo al proyecto.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = global.__iqContactRateLimit || (global.__iqContactRateLimit = new Map());

function clamp(value, max) {
  return typeof value === 'string' ? value.slice(0, max).trim() : '';
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function escapeForHeader(value) {
  // Evita inyección de encabezados de correo (CRLF injection) en subject/reply-to.
  return value.replace(/[\r\n]+/g, ' ').trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: campo invisible que un formulario real nunca llena.
  // Si viene relleno, respondemos éxito sin enviar el correo.
  if (clamp(body.sitioWeb, 200)) {
    return res.status(200).json({ ok: true });
  }

  const nombre = clamp(body.nombre, 200);
  const empresa = clamp(body.empresa, 200);
  const email = clamp(body.email, 254);
  const telefono = clamp(body.telefono, 40);
  const areaRaw = clamp(body.area, 80);
  const mensaje = clamp(body.mensaje, 5000);
  const pagina = clamp(body.pagina, 300);

  if (!nombre) return res.status(400).json({ ok: false, error: 'validation', field: 'nombre' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'validation', field: 'email' });

  const area = ALLOWED_AREAS.includes(areaRaw) ? areaRaw : (areaRaw || 'No especificada');

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_RECIPIENT;
  if (!apiKey || !recipient) {
    console.error('contact.js: faltan RESEND_API_KEY o CONTACT_RECIPIENT en las variables de entorno.');
    return res.status(500).json({ ok: false, error: 'server_not_configured' });
  }

  const from = process.env.RESEND_FROM || 'Ibarra Quezada Abogados <onboarding@resend.dev>';
  const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  const lines = [
    `Nombre: ${nombre}`,
    `Empresa: ${empresa || '(no proporcionada)'}`,
    `Email: ${email}`,
    `Teléfono: ${telefono || '(no proporcionado)'}`,
    `Área de interés: ${area}`,
    `Página de origen: ${pagina || req.headers.referer || '(no disponible)'}`,
    `Fecha: ${fecha}`,
    '',
    'Mensaje:',
    mensaje || '(sin mensaje)',
  ];

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: escapeForHeader(`Nueva consulta — ${area} — ${nombre}`),
        text: lines.join('\n'),
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text().catch(() => '');
      console.error('contact.js: Resend respondió con error', resendRes.status, errBody);
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact.js: error al conectar con Resend', err);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
