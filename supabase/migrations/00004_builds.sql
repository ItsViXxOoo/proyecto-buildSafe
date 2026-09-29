-- BuildSafe · Fase 3: builds de usuarios.
-- Un componente por tipo por build; visibilidad dueño/público vía helpers invoker
-- (sin SECURITY DEFINER: las policies de builds no referencian build_components, no hay recursión).

create table public.builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  is_public boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builds_title_not_blank check (char_length(btrim(title)) between 1 and 120),
  constraint builds_status check (status in ('draft', 'finalized'))
);

create index builds_user_id_idx on public.builds (user_id);
create index builds_public_idx on public.builds (created_at desc) where is_public;

create trigger set_builds_updated_at
  before update on public.builds
  for each row execute function public.set_updated_at();

create table public.build_components (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds (id) on delete cascade,
  component_id uuid not null references public.components (id) on delete restrict,
  component_type_id uuid not null references public.component_types (id) on delete restrict,
  quantity int not null default 1,
  price_snapshot numeric(12, 2),
  created_at timestamptz not null default now(),
  constraint build_components_quantity_positive check (quantity > 0),
  constraint build_components_price_snapshot check (price_snapshot is null or price_snapshot >= 0),
  -- Un solo componente por tipo por build (2 CPUs distintas quedan bloqueadas).
  constraint build_components_unique_type unique (build_id, component_type_id)
);

create index build_components_build_id_idx on public.build_components (build_id);
create index build_components_component_id_idx on public.build_components (component_id);

-- Mantiene component_type_id coherente con el componente elegido.
create or replace function public.build_components_sync_type()
returns trigger
language plpgsql
as $$
declare
  v_type uuid;
begin
  select type_id into v_type
  from public.components
  where id = new.component_id;

  if v_type is null then
    raise exception 'component_not_found';
  end if;

  if new.component_type_id is distinct from v_type then
    new.component_type_id := v_type;
  end if;

  return new;
end;
$$;

create trigger build_components_sync_type_trigger
  before insert or update of component_id on public.build_components
  for each row execute function public.build_components_sync_type();

create table public.build_compatibility_results (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds (id) on delete cascade,
  severity text not null,
  message text not null,
  rule_id uuid,
  checked_at timestamptz not null default now(),
  constraint build_compatibility_results_severity check (severity in ('error', 'warning'))
);

create index build_compatibility_results_build_idx
  on public.build_compatibility_results (build_id, severity);

-- Helpers de visibilidad (SECURITY INVOKER, sin ciclo de RLS).
create or replace function public.is_build_visible(p_build_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.builds b
    where b.id = p_build_id
      and (b.is_public or b.user_id = (select auth.uid()))
  );
$$;

create or replace function public.is_build_owner(p_build_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.builds b
    where b.id = p_build_id
      and b.user_id = (select auth.uid())
  );
$$;

alter table public.builds enable row level security;
alter table public.build_components enable row level security;
alter table public.build_compatibility_results enable row level security;

create policy "builds_select_visible"
  on public.builds for select
  using (
    is_public
    or (select auth.uid()) = user_id
  );

create policy "builds_insert_own"
  on public.builds for insert
  with check ((select auth.uid()) = user_id);

create policy "builds_update_own"
  on public.builds for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "builds_delete_own"
  on public.builds for delete
  using ((select auth.uid()) = user_id);

create policy "build_components_select_visible"
  on public.build_components for select
  using (public.is_build_visible(build_id));

create policy "build_components_insert_owner"
  on public.build_components for insert
  with check (public.is_build_owner(build_id));

create policy "build_components_update_owner"
  on public.build_components for update
  using (public.is_build_owner(build_id))
  with check (public.is_build_owner(build_id));

create policy "build_components_delete_owner"
  on public.build_components for delete
  using (public.is_build_owner(build_id));

create policy "build_results_select_visible"
  on public.build_compatibility_results for select
  using (public.is_build_visible(build_id));

create policy "build_results_insert_owner"
  on public.build_compatibility_results for insert
  with check (public.is_build_owner(build_id));

create policy "build_results_delete_owner"
  on public.build_compatibility_results for delete
  using (public.is_build_owner(build_id));
