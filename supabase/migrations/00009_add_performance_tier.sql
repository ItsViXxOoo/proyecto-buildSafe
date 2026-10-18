-- Columna de rendimiento para el algoritmo del Modo Rápido (Fase 1)
ALTER TABLE public.components ADD COLUMN performance_tier smallint;
ALTER TABLE public.components ADD CONSTRAINT components_performance_tier_range CHECK (performance_tier IS NULL OR (performance_tier BETWEEN 1 AND 5));
CREATE INDEX idx_components_type_tier ON public.components (type_id, performance_tier) WHERE is_active AND performance_tier IS NOT NULL;
