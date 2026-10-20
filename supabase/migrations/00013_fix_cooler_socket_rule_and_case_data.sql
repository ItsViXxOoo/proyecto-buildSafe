-- Ajustes post-QA matriz 216 combos (algoritmo determinista vs motor real):
-- 1) Regla cooler_socket estaba montada con los lados invertidos
--    (cooler_sockets array como lado A contra socket escalar) => el motor respondía
--    "Regla in_array no soportada contra atributo socket" en ~56% de las builds.
--    Se corrige: socket (escalar, lado A) dentro de cooler_sockets (array, lado B).
-- 2) Backfill de supported_form_factors para cases donde el scraper no trajo el
--    array plano (derivado del specJSON largest_motherboard_format_format_name).
--    'Extended ATX' se normaliza a 'E-ATX' y acepta formatos menores (físicamente real).
-- 3) Specs faltantes de 2 gabinetes con documento oficial:
--    - Corsair 480T Airflow (CC-9011271-WW): GPU 400mm, cooler 165mm (corsair.com)
--    - MSI MAG PANO 120R PZ: GPU 338mm, cooler 180mm (datasheet MSI 2025)
--    Los genéricos sin fuente (Clio M3, Snake, Voltix, AOCZHTA) quedan NULL:
--    SoloTodo los declara "Desconocido"; el motor emite warning honesto.

-- 1) Correccion de la regla cooler_socket (idempotente)
UPDATE compatibility_rules
SET type_a = 'cpu', attribute_a = 'socket', type_b = 'cooler', attribute_b = 'cooler_sockets'
WHERE id = '60de7b72-1dd0-435c-b441-b775094c1907'
  AND type_a = 'cooler' AND attribute_a = 'cooler_sockets';

-- 2) Backfill de supported_form_factors (idempotente)
UPDATE components c
SET supported_form_factors = CASE
  WHEN c.specs->>'largest_motherboard_format_format_name' = 'Extended ATX' THEN ARRAY['E-ATX'::text,'ATX'::text,'Micro-ATX'::text,'Mini-ITX'::text]
  WHEN c.specs->>'largest_motherboard_format_format_name' = 'Micro ATX'   THEN ARRAY['Micro-ATX'::text,'Mini-ITX'::text]
  WHEN c.specs->>'largest_motherboard_format_format_name' = 'ATX'         THEN ARRAY['ATX'::text,'Micro-ATX'::text,'Mini-ITX'::text]
  WHEN c.specs->>'largest_motherboard_format_format_name' = 'Mini ITX'    THEN ARRAY['Mini-ITX'::text]
  ELSE c.supported_form_factors
END
FROM component_types t
WHERE t.id = c.type_id AND t.slug = 'case'
  AND c.is_active AND c.supported_form_factors IS NULL;

-- 3) Specs oficiales de los 2 gabinetes con documento (idempotente)
UPDATE components c
SET max_gpu_len_mm = 400, max_cooler_height_mm = 165,
    specs = c.specs || jsonb_build_object('max_video_card_length', 400, 'max_cpu_cooler_height', 165)
FROM component_types t
WHERE t.id = c.type_id AND t.slug = 'case'
  AND c.name LIKE 'Corsair 480T Airflow%';

UPDATE components c
SET max_gpu_len_mm = 338, max_cooler_height_mm = 180,
    specs = c.specs || jsonb_build_object('max_video_card_length', 338, 'max_cpu_cooler_height', 180)
FROM component_types t
WHERE t.id = c.type_id AND t.slug = 'case'
  AND c.name LIKE 'MSI MAG PANO 120R PZ%';
