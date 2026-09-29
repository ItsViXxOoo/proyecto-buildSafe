-- BuildSafe · Fase 6: higiene de advisors
-- 1) search_path fijo en funciones trigger
-- 2) policies admin split (evita multiple_permissive_policies)
-- 3) índices para FKs faltantes

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if current_user not in ('postgres', 'service_role') then
      raise exception 'role_change_forbidden';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.components_set_search_vector()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.brand, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.socket, '') || ' ' || coalesce(new.chipset, '')), 'C');
  return new;
end;
$$;

create or replace function public.build_components_sync_type()
returns trigger
language plpgsql
set search_path = ''
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

-- Policies admin: de "for all" a acciones explícitas (sin SELECT duplicado).
drop policy "component_types_admin_write" on public.component_types;
drop policy "components_admin_write" on public.components;
drop policy "compat_rules_admin_write" on public.compatibility_rules;

create policy "component_types_admin_insert"
  on public.component_types for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "component_types_admin_update"
  on public.component_types for update
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "component_types_admin_delete"
  on public.component_types for delete
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "components_admin_insert"
  on public.components for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "components_admin_update"
  on public.components for update
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "components_admin_delete"
  on public.components for delete
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "compat_rules_admin_insert"
  on public.compatibility_rules for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "compat_rules_admin_update"
  on public.compatibility_rules for update
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "compat_rules_admin_delete"
  on public.compatibility_rules for delete
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

-- Índices para FKs faltantes
create index build_components_component_type_id_idx
  on public.build_components (component_type_id);

create index compatibility_rules_type_b_idx
  on public.compatibility_rules (type_b)
  where type_b is not null;
