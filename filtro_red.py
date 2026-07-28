#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FILTRO DE RED · Ibarra Quezada Abogados
=======================================

Toma la exportacion oficial de conexiones de LinkedIn (Connections.csv o el .zip
completo) y la convierte en una lista de prospectos priorizada contra el perfil
de cliente ideal del despacho.

USO
---
    python filtro_red.py Connections.csv
    python filtro_red.py Basic_LinkedInDataExport_XX-XX-XXXX.zip

Genera: Red_Priorizada_IQ.xlsx

CAPA OPCIONAL DE IA
-------------------
Si define ANTHROPIC_API_KEY, el script enriquece los N mejores prospectos con
sector inferido, hipotesis de brecha juridica y una linea de apertura.
Sin la llave el script corre igual y entrega valor completo.

    export ANTHROPIC_API_KEY="..."
    python filtro_red.py Connections.csv --enriquecer 40
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import unicodedata
import zipfile
from datetime import datetime, date

# ============================================================================
# CONFIGURACION. Esto es lo unico que usted edita.
# ============================================================================

# --- GUARDA DE CONFLICTO -----------------------------------------------------
# Cualquier conexion cuya empresa coincida con estos terminos queda EXCLUIDA
# automaticamente y se reporta aparte. Es la barrera contra prospectar dentro
# de la orbita de su empleador actual. Agregue filiales, clientes clave y
# competidores directos del grupo.
EXCLUIR_EMPRESAS = [
    "savino del bene",
    "savino",
    "sdb mexico",
]

# Personas especificas a excluir sin importar su empresa (escriba nombre completo
# en minusculas, sin acentos).
EXCLUIR_PERSONAS = [
]

# --- PERFIL DE CLIENTE IDEAL -------------------------------------------------
# Puestos con capacidad de decidir y contratar. Peso alto.
PUESTOS_DECISION = {
    30: ["director general", "directora general", "ceo", "chief executive",
         "presidente", "presidenta", "dueño", "dueno", "propietario", "socio",
         "socia", "fundador", "fundadora", "founder", "owner", "partner",
         "managing director", "consejero", "consejera"],
    28: ["director de finanzas", "directora de finanzas", "cfo",
         "chief financial", "director administrativo", "directora administrativa",
         "director de administracion", "director de operaciones", "coo",
         "chief operating", "director corporativo", "vicepresidente",
         "vice president", "vp "],
    22: ["director", "directora", "head of", "chief"],
    18: ["gerente general", "subdirector", "subdirectora"],
    15: ["gerente", "manager", "responsable de"],
    8:  ["coordinador", "coordinadora", "jefe de", "jefa de", "supervisor",
         "lider", "leader"],
    2:  ["analista", "especialista", "asistente", "auxiliar", "becario",
         "practicante", "pasante", "intern", "junior", "estudiante", "student"],
}

# Areas funcionales. El nucleo v2 es contratos y societario, asi que finanzas
# y direccion general pesan mas que recursos humanos.
AREAS = {
    15: ["finanzas", "finance", "administracion", "administrative", "tesoreria",
         "contraloria", "controller", "fiscal", "contabilidad"],
    13: ["general", "corporativo", "corporate", "direccion"],
    11: ["operaciones", "operations", "logistica", "logistics", "supply chain",
         "cadena de suministro", "comercio exterior", "trafico", "aduanas",
         "foreign trade", "importacion", "exportacion"],
    9:  ["legal", "juridico", "juridica", "compliance", "cumplimiento",
         "abogado", "abogada", "counsel"],
    4:  ["compras", "procurement", "riesgos", "auditoria", "audit"],
    1:  ["recursos humanos", "human resources", "talento", "marketing",
         "ventas", "sales", "sistemas", "it ", "desarrollo", "diseño",
         "reclutamiento", "recruiter", "recruiting", "talent acquisition"],
}

# Sectores objetivo, inferidos del nombre de la empresa.
SECTORES = {
    15: ["logistic", "logistica", "transporte", "transportes", "freight",
         "forwarding", "aduanal", "aduanas", "customs", "carga", "cargo",
         "naviera", "shipping", "courier", "paqueteria", "almacen",
         "warehouse", "3pl", "supply"],
    12: ["manufactur", "industrial", "industrias", "automotriz", "automotive",
         "acero", "plastic", "metal", "quimica", "chemical", "immex",
         "maquiladora", "ensamble", "fabrica", "textil", "empaque"],
    9:  ["distribuidora", "distribucion", "comercializadora", "comercial",
         "grupo", "retail", "importadora", "exportadora", "alimentos",
         "farmaceutica", "construccion", "constructora", "inmobiliaria",
         "agricola", "energia", "telecom"],
    5:  ["consultoria", "consulting", "servicios", "tecnologia", "software",
         "solutions", "agencia"],
}

# Empresas que no son cliente sino aliado, referidor o competencia.
NO_CLIENTE = ["universidad", "university", "tecnologico de monterrey", "unam",
              "ipn", "itam", "instituto", "colegio", "gobierno", "secretaria",
              "municipio", "ayuntamiento", "banco", "bank", "hospital",
              "fundacion", "asociacion", "camara", "sindicato", "partido"]

# Deteccion de aliados estrategicos.
SENALES_ALIADO = {
    "Aliado laboral":   ["laboral", "labor law", "employment law", "derecho del trabajo",
                         "seguridad social", "laboralista"],
    "Aliado contador":  ["contador", "contadora", "contable", "accounting",
                         "fiscal", "tax", "impuestos", "auditor", "auditoria"],
    "Aliado notario":   ["notario", "notaria", "notary", "corredor publico",
                         "fedatario"],
    "Colega o competencia": ["abogado", "abogada", "lawyer", "attorney", "counsel",
                             "juridico", "legal", "despacho", "law firm",
                             "bufete", "asociados y abogados"],
}

# --- UMBRALES ----------------------------------------------------------------
UMBRAL_A = 50   # Red caliente. Mensaje de lanzamiento personal.
UMBRAL_B = 32   # Red tibia. Mensaje con dato especifico.
UMBRAL_C = 18   # Revisar a mano.

BONO_CORREO = 8      # Tiene correo visible. Se puede contactar sin InMail.
BONO_RECIENTE = 5    # Conexion de los ultimos 18 meses.

# ============================================================================
# UTILIDADES
# ============================================================================

def norm(texto):
    """Minusculas, sin acentos, espacios colapsados."""
    if not texto:
        return ""
    t = unicodedata.normalize("NFKD", str(texto))
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = t.lower()
    t = re.sub(r"[^\w\s@.\-&]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def leer_conexiones(ruta):
    """
    Lee Connections.csv saltando el preambulo de notas que LinkedIn antepone.
    Acepta el .csv suelto o el .zip completo de la exportacion.
    """
    if ruta.lower().endswith(".zip"):
        with zipfile.ZipFile(ruta) as z:
            objetivo = next(
                (n for n in z.namelist()
                 if n.lower().endswith(".csv") and "connection" in n.lower()),
                None,
            )
            if not objetivo:
                sys.exit("No encontre Connections.csv dentro del zip.")
            crudo = z.read(objetivo).decode("utf-8-sig", errors="replace")
    else:
        with open(ruta, "r", encoding="utf-8-sig", errors="replace") as f:
            crudo = f.read()

    lineas = crudo.splitlines()

    # LinkedIn antepone "Notes:" y una o dos lineas de texto antes del
    # encabezado real. Buscamos la fila que contiene First Name y Last Name.
    inicio = 0
    for i, linea in enumerate(lineas[:15]):
        l = linea.lower()
        if "first name" in l and "last name" in l:
            inicio = i
            break

    lector = csv.DictReader(io.StringIO("\n".join(lineas[inicio:])))
    filas = []
    for fila in lector:
        limpia = {(k or "").strip(): (v or "").strip() for k, v in fila.items()}
        if limpia.get("First Name") or limpia.get("Last Name") or limpia.get("Company"):
            filas.append(limpia)
    return filas


# Meses en español. LinkedIn localiza las fechas al idioma de la cuenta, asi que
# una exportacion en español entrega '05 ene 2023' o '5 de enero de 2023', que
# strptime no parsea en la localización por defecto (C, en inglés).
MESES_ES = {
    "ene": 1, "enero": 1, "feb": 2, "febrero": 2, "mar": 3, "marzo": 3,
    "abr": 4, "abril": 4, "may": 5, "mayo": 5, "jun": 6, "junio": 6,
    "jul": 7, "julio": 7, "ago": 8, "agosto": 8, "sep": 9, "sept": 9,
    "septiembre": 9, "oct": 10, "octubre": 10, "nov": 11, "noviembre": 11,
    "dic": 12, "diciembre": 12,
}


def parse_fecha(valor):
    """LinkedIn usa '05 Jan 2023' (o '05 ene 2023' en español). Devuelve date o None."""
    if not valor:
        return None
    v = valor.strip()
    for fmt in ("%d %b %Y", "%d %B %Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    # Fallback en español: "05 ene 2023" o "5 de enero de 2023".
    tokens = [t for t in re.sub(r"[.,]", " ", v.lower()).split() if t != "de"]
    if len(tokens) == 3:
        dia, mes_txt, anio = tokens
        mes = MESES_ES.get(mes_txt) or MESES_ES.get(mes_txt[:3])
        if mes and dia.isdigit() and anio.isdigit():
            try:
                return date(int(anio), mes, int(dia))
            except ValueError:
                return None
    return None


def puntear_por_diccionario(texto, diccionario):
    """Devuelve (puntos, termino) del match de mayor peso."""
    mejor, termino = 0, ""
    for puntos, terminos in diccionario.items():
        for t in terminos:
            if t in texto and puntos > mejor:
                mejor, termino = puntos, t.strip()
    return mejor, termino


# ============================================================================
# MOTOR DE CLASIFICACION
# ============================================================================

def clasificar(fila, hoy=None):
    hoy = hoy or date.today()

    nombre = f"{fila.get('First Name','')} {fila.get('Last Name','')}".strip()
    empresa = fila.get("Company", "").strip()
    puesto = fila.get("Position", "").strip()
    correo = fila.get("Email Address", "").strip()
    url = fila.get("URL", "").strip()
    conectado = parse_fecha(fila.get("Connected On", ""))

    n_nombre, n_empresa, n_puesto = norm(nombre), norm(empresa), norm(puesto)
    contexto = f"{n_puesto} {n_empresa}"

    r = {
        "nombre": nombre, "empresa": empresa, "puesto": puesto,
        "correo": correo, "url": url,
        "conectado": conectado.isoformat() if conectado else "",
        "puntaje": 0, "nivel": "", "jugada": "", "motivo": "",
        "senal_aliado": "", "excluido_por": "",
    }

    # --- Guarda de conflicto -------------------------------------------------
    for term in EXCLUIR_EMPRESAS:
        if term and norm(term) in n_empresa:
            r["excluido_por"] = f"Guarda de conflicto: {term}"
            return r
    for p in EXCLUIR_PERSONAS:
        if p and norm(p) in n_nombre:
            r["excluido_por"] = "Exclusion manual"
            return r

    if not empresa and not puesto:
        r["excluido_por"] = "Sin empresa ni puesto en el registro"
        return r

    # --- Aliados y colegas ---------------------------------------------------
    for etiqueta, terminos in SENALES_ALIADO.items():
        if any(t in contexto for t in terminos):
            r["senal_aliado"] = etiqueta
            break

    # --- Puntaje -------------------------------------------------------------
    p_puesto, t_puesto = puntear_por_diccionario(n_puesto, PUESTOS_DECISION)
    p_area, t_area = puntear_por_diccionario(contexto, AREAS)
    p_sector, t_sector = puntear_por_diccionario(n_empresa, SECTORES)

    puntaje = p_puesto + p_area + p_sector
    motivos = []
    if t_puesto:  motivos.append(f"puesto: {t_puesto}")
    if t_area:    motivos.append(f"area: {t_area}")
    if t_sector:  motivos.append(f"sector: {t_sector}")

    if correo:
        puntaje += BONO_CORREO
        motivos.append("correo visible")

    if conectado and (hoy - conectado).days <= 548:
        puntaje += BONO_RECIENTE
        motivos.append("conexion reciente")

    if any(t in n_empresa for t in NO_CLIENTE):
        puntaje = int(puntaje * 0.45)
        motivos.append("organizacion no comercial")

    # Un aliado estrategico vale por si mismo aunque su puesto no cruce las
    # categorias comerciales. Un notario no es cliente, pero abre trabajo
    # societario y no debe aparecer con puntaje cero.
    if r["senal_aliado"].startswith("Aliado") and puntaje < 25:
        puntaje = 25
        motivos.append("aliado estratégico")

    r["puntaje"] = puntaje
    r["motivo"] = " · ".join(motivos) if motivos else "sin señales fuertes"

    # --- Nivel y jugada ------------------------------------------------------
    if puntaje >= UMBRAL_A:
        r["nivel"] = "A"
    elif puntaje >= UMBRAL_B:
        r["nivel"] = "B"
    elif puntaje >= UMBRAL_C:
        r["nivel"] = "C"
    else:
        r["nivel"] = "Descartar"

    if r["senal_aliado"] in ("Aliado laboral", "Aliado contador", "Aliado notario"):
        r["jugada"] = r["senal_aliado"]
        if r["nivel"] == "Descartar":
            r["nivel"] = "C"
    elif r["senal_aliado"] == "Colega o competencia":
        r["jugada"] = "Referidor"
    elif p_puesto >= 28 and p_sector >= 9:
        r["jugada"] = "Cliente potencial"
    elif p_puesto >= 22:
        r["jugada"] = "Cliente potencial"
    elif p_puesto >= 8:
        r["jugada"] = "Puerta de entrada"
    else:
        r["jugada"] = "Explorar"

    return r


# ============================================================================
# CAPA OPCIONAL DE IA
# ============================================================================

def enriquecer(registros, n=40):
    """Enriquece los N mejores con Claude. Silencioso si no hay llave."""
    llave = os.environ.get("ANTHROPIC_API_KEY")
    if not llave:
        print("  (sin ANTHROPIC_API_KEY: se omite el enriquecimiento)")
        return registros
    try:
        import urllib.request
    except ImportError:
        return registros

    objetivo = [r for r in registros if r["nivel"] in ("A", "B")][:n]
    if not objetivo:
        return registros

    lote = [{"i": i, "empresa": r["empresa"], "puesto": r["puesto"]}
            for i, r in enumerate(objetivo)]

    prompt = (
        "Eres asistente de un abogado corporativo mexicano cuya practica central "
        "es derecho contractual y societario para empresas medianas. Su producto "
        "estrella es la auditoria de cartera contractual y el expediente de "
        "beneficiario controlador.\n\n"
        "Para cada registro devuelve un objeto con:\n"
        '  "i": el indice,\n'
        '  "sector": sector probable en 2 o 3 palabras,\n'
        '  "brecha": la brecha juridica mas probable, una linea,\n'
        '  "apertura": una linea de apertura concreta, sin saludo y sin vender.\n\n'
        "Responde SOLO con un arreglo JSON, sin texto adicional y sin markdown.\n\n"
        + json.dumps(lote, ensure_ascii=False)
    )

    cuerpo = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=cuerpo,
        headers={
            "content-type": "application/json",
            "x-api-key": llave,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        texto = "".join(b.get("text", "") for b in data.get("content", []))
        texto = re.sub(r"^```(?:json)?|```$", "", texto.strip(), flags=re.M).strip()
        for item in json.loads(texto):
            i = item.get("i")
            if isinstance(i, int) and 0 <= i < len(objetivo):
                objetivo[i]["sector_ia"] = item.get("sector", "")
                objetivo[i]["brecha_ia"] = item.get("brecha", "")
                objetivo[i]["apertura_ia"] = item.get("apertura", "")
        print(f"  Enriquecidos {len(objetivo)} prospectos con IA.")
    except Exception as e:
        print(f"  Enriquecimiento omitido ({type(e).__name__}). El resto corre igual.")
    return registros


# ============================================================================
# SALIDA
# ============================================================================

def exportar(registros, ruta_salida):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    VINO, CREMA = "7A1B2B", "F4EFE9"
    thin = Side(style="thin", color="D8CEC3")
    box = Border(left=thin, right=thin, top=thin, bottom=thin)

    activos = [r for r in registros if not r["excluido_por"]]
    excluidos = [r for r in registros if r["excluido_por"]]
    activos.sort(key=lambda r: (-r["puntaje"], r["empresa"]))

    prospectos = [r for r in activos if r["nivel"] in ("A", "B", "C")]
    aliados = [r for r in activos if r["senal_aliado"]]

    wb = Workbook()

    def hoja(ws, titulo, subtitulo, cols, datos, anchos):
        ws["A1"] = titulo
        ws["A1"].font = Font(name="Arial", size=14, bold=True, color=VINO)
        ws["A2"] = subtitulo
        ws["A2"].font = Font(name="Arial", size=9, italic=True, color="6E6862")
        for i, (h, w) in enumerate(zip(cols, anchos), start=1):
            c = ws.cell(row=4, column=i, value=h)
            c.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor=VINO)
            c.border = box
            c.alignment = Alignment(vertical="center", wrap_text=True)
            ws.column_dimensions[get_column_letter(i)].width = w
        ws.row_dimensions[4].height = 26
        for ri, fila in enumerate(datos, start=5):
            for ci, val in enumerate(fila, start=1):
                c = ws.cell(row=ri, column=ci, value=val)
                c.font = Font(name="Arial", size=10)
                c.border = box
                c.alignment = Alignment(vertical="top", wrap_text=(anchos[ci-1] > 26))
                if ri % 2 == 1:
                    c.fill = PatternFill("solid", fgColor=CREMA)
        ws.freeze_panes = "A5"
        if datos:
            ws.auto_filter.ref = f"A4:{get_column_letter(len(cols))}{4+len(datos)}"

    # --- Hoja 1: prospectos priorizados
    ws = wb.active
    ws.title = "Priorizados"
    cols = ["Nivel", "Pts", "Nombre", "Empresa", "Puesto", "Jugada",
            "Correo", "Perfil", "Conectado", "Por qué",
            "Sector (IA)", "Brecha jurídica (IA)", "Apertura sugerida"]
    datos = [[r["nivel"], r["puntaje"], r["nombre"], r["empresa"], r["puesto"],
              r["jugada"], r["correo"], r["url"], r["conectado"], r["motivo"],
              r.get("sector_ia", ""), r.get("brecha_ia", ""),
              r.get("apertura_ia", "")] for r in prospectos]
    hoja(ws, "RED PRIORIZADA · Ibarra Quezada Abogados",
         f"{len(prospectos)} prospectos de {len(registros)} conexiones. "
         "Nivel A primero: son sus mensajes de lanzamiento.",
         cols, datos, [8, 6, 24, 28, 34, 18, 26, 34, 12, 40, 22, 40, 44])

    # --- Hoja 2: aliados
    ws2 = wb.create_sheet("Aliados")
    cols2 = ["Tipo", "Nombre", "Empresa", "Puesto", "Correo", "Perfil"]
    datos2 = [[r["senal_aliado"], r["nombre"], r["empresa"], r["puesto"],
               r["correo"], r["url"]] for r in aliados]
    hoja(ws2, "ALIADOS Y REFERIDORES",
         "Los laboralistas son prioridad esta semana. Los contadores son la "
         "mejor fuente de referidos para beneficiario controlador.",
         cols2, datos2, [22, 24, 30, 36, 28, 36])

    # --- Hoja 3: excluidos
    ws3 = wb.create_sheet("Excluidos")
    cols3 = ["Motivo", "Nombre", "Empresa", "Puesto"]
    datos3 = [[r["excluido_por"], r["nombre"], r["empresa"], r["puesto"]]
              for r in excluidos]
    hoja(ws3, "EXCLUIDOS",
         "Revise esta hoja. Si algo se excluyó por error, corrija la lista "
         "EXCLUIR_EMPRESAS en el script y vuelva a correrlo.",
         cols3, datos3, [34, 24, 30, 36])

    # --- Hoja 4: resumen
    ws4 = wb.create_sheet("Resumen")
    ws4["A1"] = "RESUMEN"
    ws4["A1"].font = Font(name="Arial", size=14, bold=True, color=VINO)
    filas = [
        ("Conexiones leídas", len(registros)),
        ("Excluidas por guarda de conflicto",
         sum(1 for r in excluidos if "conflicto" in r["excluido_por"])),
        ("Excluidas por registro incompleto",
         sum(1 for r in excluidos if "Sin empresa" in r["excluido_por"])),
        ("", ""),
        ("Nivel A · red caliente", sum(1 for r in activos if r["nivel"] == "A")),
        ("Nivel B · red tibia", sum(1 for r in activos if r["nivel"] == "B")),
        ("Nivel C · revisar a mano", sum(1 for r in activos if r["nivel"] == "C")),
        ("Descartados por puntaje", sum(1 for r in activos if r["nivel"] == "Descartar")),
        ("", ""),
        ("Con correo visible", sum(1 for r in prospectos if r["correo"])),
        ("Aliados laborales detectados",
         sum(1 for r in aliados if r["senal_aliado"] == "Aliado laboral")),
        ("Contadores y fiscalistas",
         sum(1 for r in aliados if r["senal_aliado"] == "Aliado contador")),
        ("Notarios", sum(1 for r in aliados if r["senal_aliado"] == "Aliado notario")),
    ]
    ws4.column_dimensions["A"].width = 40
    ws4.column_dimensions["B"].width = 12
    for i, (k, v) in enumerate(filas, start=3):
        ws4.cell(row=i, column=1, value=k).font = Font(name="Arial", size=10,
                                                       bold=(k in ("Nivel A · red caliente",)))
        ws4.cell(row=i, column=2, value=v).font = Font(name="Arial", size=10, bold=True)

    wb.save(ruta_salida)
    return len(prospectos), len(aliados), len(excluidos)


# ============================================================================
# MAIN
# ============================================================================

def main():
    ap = argparse.ArgumentParser(description="Filtra y prioriza conexiones de LinkedIn.")
    ap.add_argument("archivo", help="Connections.csv o el .zip de la exportación")
    ap.add_argument("--salida", default="Red_Priorizada_IQ.xlsx")
    ap.add_argument("--enriquecer", type=int, default=0,
                    help="Cuántos prospectos enriquecer con IA (requiere ANTHROPIC_API_KEY)")
    args = ap.parse_args()

    if not os.path.exists(args.archivo):
        sys.exit(f"No encuentro el archivo: {args.archivo}")

    print(f"\nLeyendo {args.archivo} ...")
    filas = leer_conexiones(args.archivo)
    print(f"  {len(filas)} conexiones encontradas.")

    registros = [clasificar(f) for f in filas]

    if args.enriquecer:
        print("Enriqueciendo con IA ...")
        registros = enriquecer(registros, args.enriquecer)

    n_p, n_a, n_e = exportar(registros, args.salida)

    a = sum(1 for r in registros if r["nivel"] == "A")
    b = sum(1 for r in registros if r["nivel"] == "B")

    print(f"\nListo: {args.salida}")
    print(f"  Nivel A (caliente):  {a}")
    print(f"  Nivel B (tibia):     {b}")
    print(f"  Aliados detectados:  {n_a}")
    print(f"  Excluidos:           {n_e}")
    print("\nEmpiece por la hoja Priorizados, nivel A. Y revise la hoja")
    print("Excluidos antes de escribirle a nadie.\n")


if __name__ == "__main__":
    main()
