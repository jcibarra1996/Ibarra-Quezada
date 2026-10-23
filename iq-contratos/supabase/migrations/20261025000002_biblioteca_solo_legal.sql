-- Plantillas y playbook son la biblioteca interna de Legal: el área de negocio no los lee.
-- Los contratos generados desde plantilla y el análisis de la IA usan la llave del servidor,
-- así que no dependen de estas políticas.

drop policy org_lectura on templates;
drop policy org_lectura on playbooks;
drop policy org_lectura on playbook_positions;

create policy legal_lectura on templates for select to authenticated using (org_id = org_actual() and puede_validar());
create policy legal_lectura on playbooks for select to authenticated using (org_id = org_actual() and puede_validar());
create policy legal_lectura on playbook_positions for select to authenticated using (org_id = org_actual() and puede_validar());
