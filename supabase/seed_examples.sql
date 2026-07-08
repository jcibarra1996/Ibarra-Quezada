-- Ejemplos de "Tareas Fantasma". No se corre automáticamente — cópialo
-- a un SQL editor de Supabase y ajusta los valores a tu caso real.

insert into recurring_tasks (title, context, smart_tags, recurrence, day_of_month)
values ('Pagar renta del depa', 'casa', array['Depa'], 'monthly', 1);

insert into recurring_tasks (title, context, smart_tags, recurrence, interval_days)
values ('Servicio del coche', 'casa', array['Coche'], 'interval', 90);

insert into recurring_tasks (title, context, smart_tags, recurrence, day_of_week)
values ('Revisar vacunas del perro', 'casa', array['Perro'], 'weekly', 1); -- lunes
