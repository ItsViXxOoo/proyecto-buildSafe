-- BuildSafe · Fase 2: catálogo de componentes + precios.
-- Columnas tipadas de compatibilidad + specs jsonb validados + búsqueda full-text.

create table public.component_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  constraint component_types_slug_format check (slug ~ '^[a-z][a-z0-9_]*$')
);

insert into public.component_types (slug, name) values
  ('cpu', 'Procesador'),
  ('motherboard', 'Placa madre'),
  ('ram', 'Memoria RAM'),
  ('gpu', 'Tarjeta de video'),
  ('storage', 'Almacenamiento'),
  ('psu', 'Fuente de poder'),
  ('case', 'Gabinete'),
  ('cooler', 'Refrigeración')
on conflict (slug) do nothing;

create table public.components (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references public.component_types (id) on delete restrict,
  name text not null,
  brand text,
  image_url text,
  -- CPU
  socket text,
  -- Motherboard
  form_factor text,
  ram_type text,
  chipset text,
  -- RAM
  capacity_gb int,
  speed_mts int,
  -- GPU
  gpu_len_mm int,
  -- Case
  supported_form_factors text[],
  max_gpu_len_mm int,
  max_cooler_height_mm int,
  -- Cooler
  cooler_height_mm int,
  -- PSU
  psu_watts int,
  -- Genérico (CPU, GPU, discos, etc.)
  tdp_w int,
  -- Storage
  interface text,
  specs jsonb,
  current_price numeric(12, 2),
  price_currency text not null default 'USD',
  is_active boolean not null default true,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint components_name_not_blank check (char_length(btrim(name)) > 0),
  constraint components_form_factor check (
    form_factor is null
    or form_factor in ('ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX', 'SSI-CEB', 'Mini-STX', 'DTX')
  ),
  constraint components_ram_type check (
    ram_type is null or ram_type in ('DDR3', 'DDR4', 'DDR5')
  ),
  constraint components_tdp_positive check (tdp_w is null or tdp_w > 0),
  constraint components_psu_watts_positive check (psu_watts is null or psu_watts > 0),
  constraint components_capacity_positive check (capacity_gb is null or capacity_gb > 0),
  constraint components_speed_positive check (speed_mts is null or speed_mts > 0),
  constraint components_lengths_positive check (
    (gpu_len_mm is null or gpu_len_mm > 0)
    and (max_gpu_len_mm is null or max_gpu_len_mm > 0)
    and (max_cooler_height_mm is null or max_cooler_height_mm > 0)
    and (cooler_height_mm is null or cooler_height_mm > 0)
  ),
  constraint components_current_price check (current_price is null or current_price >= 0),
  constraint components_currency check (price_currency ~ '^[A-Z]{3}$'),
  constraint components_specs_object check (
    specs is null
    or extensions.jsonb_matches_schema(
      '{"type":"object","additionalProperties":true}'::json,
      specs
    )
  ),
  constraint components_form_factors_array check (
    supported_form_factors is null
    or (
      array_length(supported_form_factors, 1) between 1 and 10
      and supported_form_factors <@ array['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX', 'SSI-CEB', 'Mini-STX', 'DTX']
    )
  )
);

create index components_type_id_idx on public.components (type_id);
create index components_active_idx on public.components (is_active) where is_active;
create index components_brand_idx on public.components (lower(brand));
create index components_specs_gin on public.components using gin (specs jsonb_path_ops);
create index components_search_vector_idx on public.components using gin (search_vector);
create index components_name_trgm_idx on public.components using gin (lower(name) gin_trgm_ops);
create index components_socket_idx on public.components (socket) where socket is not null;

create or replace function public.components_set_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.brand, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.socket, '') || ' ' || coalesce(new.chipset, '')), 'C');
  return new;
end;
$$;

create trigger components_search_vector_trigger
  before insert or update of name, brand, socket, chipset on public.components
  for each row execute function public.components_set_search_vector();

create trigger set_components_updated_at
  before update on public.components
  for each row execute function public.set_updated_at();

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.components (id) on delete restrict,
  price numeric(12, 2) not null,
  currency text not null default 'USD',
  source text,
  recorded_at timestamptz not null default now(),
  constraint price_history_price_positive check (price >= 0),
  constraint price_history_currency check (currency ~ '^[A-Z]{3}$')
);

create index price_history_component_recorded_idx
  on public.price_history (component_id, recorded_at desc);
create index price_history_recorded_idx on public.price_history (recorded_at desc);

alter table public.component_types enable row level security;
alter table public.components enable row level security;
alter table public.price_history enable row level security;

create policy "component_types_select_public"
  on public.component_types for select
  using (true);

create policy "component_types_admin_write"
  on public.component_types for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create policy "components_select_active_or_admin"
  on public.components for select
  using (
    is_active
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create policy "components_admin_write"
  on public.components for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create policy "price_history_select_public"
  on public.price_history for select
  using (true);

create policy "price_history_admin_insert"
  on public.price_history for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );
