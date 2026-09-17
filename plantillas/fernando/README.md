# Banco de plantillas y precedentes — Fernando

## Restricción explícita de JC (ver `.claude/agents/fernando.md`)

JC quiere alimentar este banco con SUS PROPIAS plantillas de contrato para
usarlas como base real, nunca un formato genérico ni de corte americano.
JC ya compartió cinco documentos reales; los usé como base, extraje su
estructura de cláusulas y declaraciones, y genericé los datos específicos
de cada caso (nombres de partes, montos, domicilios, folios mercantiles)
para que el documento sirva como precedente reutilizable. No inventé
cláusulas nuevas ni cambié el criterio legal de fondo de JC.

Ningún documento de este banco usa estructura o terminología de common law
("Agreement", "Whereas"); todo en formato mexicano (declaraciones,
cláusulas, jurisdicción CDMX o la que corresponda al caso).

## Estructura del banco (peso equivalente entre las tres líneas)

```
plantillas/fernando/
├── constitucion/
│   ├── resoluciones-unanimes-aumento-capital.md   ← con base real
│   └── PENDIENTE.md                                ← acta constitutiva, poderes, actas de asamblea
├── contratos-mercantiles-civiles/
│   ├── compraventa-de-activos-acciones.md          ← con base real
│   ├── contrato-prestacion-servicios.md            ← con base real
│   ├── convenio-reconocimiento-adeudo-cesion-deuda.md ← con base real
│   ├── convenio-terminacion-contrato.md            ← con base real
│   └── PENDIENTE.md                                ← NDA standalone, contrato de distribución
└── cumplimiento-laboral/
    └── PENDIENTE.md                                ← sin documento base todavía
```

## Documentos fuente (para trazabilidad interna, no para el banco)

- Convenio de reconocimiento de adeudo y sustitución de deudor (feb. 2023)
- Convenio de terminación (redline)
- Contrato de prestación de servicios (administración de inversiones,
  multi-parte)
- Compraventa de activos
- Aumento de capital / resoluciones unánimes fuera de asamblea

Estos originales tienen nombres de partes, montos y datos de operaciones
reales de clientes de JC; por eso no viven en este banco tal cual, solo la
versión genericada. Si en algún momento hace falta volver al original para
un caso análogo, están donde JC los compartió.

## Inventario pendiente, por línea

| Línea | Con base real | Pendiente |
|---|---|---|
| Constitución y Estructuración Corporativa | Resoluciones unánimes / aumento de capital | Acta constitutiva, poderes, actas de asamblea |
| Contratos Mercantiles y Civiles | Compraventa, prestación de servicios, reconocimiento de adeudo, terminación | NDA standalone, distribución/comisión mercantil |
| Consultoría y Cumplimiento Laboral (REPSE, NOM-035) | — | Todo: sin documento base real todavía |

## Cómo sigue avanzando esto

En cuanto JC comparta al menos un documento real de cumplimiento laboral
(REPSE o NOM-035), aplico el mismo tratamiento: extraigo estructura y
lenguaje de cláusula, genericé los datos del caso. Mientras tanto, esa
carpeta sigue en `PENDIENTE.md` sin contenido sustantivo inventado.
