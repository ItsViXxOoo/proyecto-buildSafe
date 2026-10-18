-- Ampliar operadores permitidos en reglas de compatibilidad (sum_lte: suma ponderada por cantidad)
ALTER TABLE public.compatibility_rules
DROP CONSTRAINT compatibility_rules_operator,
ADD CONSTRAINT compatibility_rules_operator CHECK (operator = ANY (ARRAY['eq'::text, 'neq'::text, 'lte'::text, 'gte'::text, 'in_array'::text, 'sum_lte'::text]));
