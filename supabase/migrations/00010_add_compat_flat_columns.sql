-- Columnas planas para el motor de compatibilidad v2 (Fase 2)
ALTER TABLE public.components ADD COLUMN memory_slots smallint;
ALTER TABLE public.components ADD COLUMN ram_modules smallint;
ALTER TABLE public.components ADD COLUMN cooler_sockets text[];
ALTER TABLE public.components ADD CONSTRAINT components_memory_slots_range CHECK (memory_slots IS NULL OR (memory_slots BETWEEN 0 AND 24));
ALTER TABLE public.components ADD CONSTRAINT components_ram_modules_range CHECK (ram_modules IS NULL OR ram_modules BETWEEN 1 AND 8);

-- Normalizar sockets con sufijo entre paréntesis ('LGA 1151 (6ta / 7ma gen)' -> 'LGA 1151')
UPDATE public.components
SET socket = trim(regexp_replace(socket, '\s*\(.*$', ''))
WHERE socket IS NOT NULL AND socket ~ '\s*\(.*$';

-- memory_slots desde specs (98/100 placas)
UPDATE public.components
SET memory_slots = (specs ->> 'memory_slots_quantity')::smallint
WHERE specs ? 'memory_slots_quantity' AND memory_slots IS NULL;

-- ram_modules: módulos por kit parseados del nombre ('(2 x 16 GB' -> 2)
-- Datos adicionales (aplicados por script): cooler_sockets
-- - Coolers de fábrica AMD Wraith: AM4 + AM5; Intel stock: LGA 1151/1200/1700
-- - Resto (aftermarket): soporte universal estándar AM4/AM5/LGA 1151/1200/1700/1851
UPDATE public.components
SET ram_modules = coalesce((substring(lower(name) from '(\d+)\s*x\s*\d+'))::smallint, 1)
WHERE ram_modules IS NULL
  AND type_id IN (SELECT id FROM public.component_types WHERE slug = 'ram');
