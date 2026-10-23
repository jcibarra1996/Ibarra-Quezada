-- Contratos sin tipo cuyo título lo dice expresamente (por ejemplo, "Contrato de prestación
-- de servicios de logística"): el tipo se toma del título, con las mismas reglas que
-- lib/contratos/tipo-por-titulo.ts aplica al registrar un contrato nuevo.
update contracts
set tipo_contrato = case
  when split_part(lower(titulo), 'que celebran', 1) ~ '(confidencialidad|no divulgaci[oó]n)' then 'confidencialidad'
  when split_part(lower(titulo), 'que celebran', 1) ~ 'arrendamiento' then 'arrendamiento'
  when split_part(lower(titulo), 'que celebran', 1) ~ 'suministro' then 'suministro'
  when split_part(lower(titulo), 'que celebran', 1) ~ 'compra\s*-?\s*venta' then 'compraventa'
  when split_part(lower(titulo), 'que celebran', 1) ~ '(prestaci[oó]n de servicios|servicios profesionales)' then 'prestacion_servicios'
  when split_part(lower(titulo), 'que celebran', 1) ~ '(contrato de obra|obra a precio)' then 'obra'
end::tipo_contrato
where tipo_contrato is null
  and split_part(lower(titulo), 'que celebran', 1) ~ '(confidencialidad|no divulgaci[oó]n|arrendamiento|suministro|compra\s*-?\s*venta|prestaci[oó]n de servicios|servicios profesionales|contrato de obra|obra a precio)';
