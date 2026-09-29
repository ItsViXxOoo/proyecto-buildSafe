-- BuildSafe · Fase 4: motor de compatibilidad basado en reglas (datos, no código).

create table public.compatibility_rules (
  id uuid primary key default gen_random_uuid(),
  type_a text not null references public.component_types (slug) on delete restrict,
  type_b text references public.component_types (slug) on delete restrict,
  attribute_a text not null,
  attribute_b text,
  operator text not null,
  value jsonb,
  severity text not null default 'error',
  message text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint compatibility_rules_operator check (
    operator in ('eq', 'neq', 'lte', 'gte', 'in_array')
  ),
  constraint compatibility_rules_severity check (severity in ('error', 'warning')),
  -- Exactamente: comparación contra otro tipo (type_b+attribute_b) o contra value.
  constraint compatibility_rules_target check (
    (type_b is not null and attribute_b is not null and value is null)
    or (type_b is null and attribute_b is null and value is not null)
  )
);

create index compatibility_rules_active_idx on public.compatibility_rules (is_active) where is_active;
create index compatibility_rules_types_idx on public.compatibility_rules (type_a, type_b);

-- Seeds: reglas esenciales de compatibilidad de PC.
insert into public.compatibility_rules (type_a, type_b, attribute_a, attribute_b, operator, severity, message) values
  ('cpu', 'motherboard', 'socket', 'socket', 'eq', 'error',
   'El socket del procesador no coincide con el de la placa madre.'),
  ('ram', 'motherboard', 'ram_type', 'ram_type', 'eq', 'error',
   'El tipo de memoria RAM no es compatible con la placa madre.'),
  ('motherboard', 'case', 'form_factor', 'supported_form_factors', 'in_array', 'error',
   'El factor de forma de la placa madre no entra en el gabinete.'),
  ('gpu', 'case', 'gpu_len_mm', 'max_gpu_len_mm', 'lte', 'error',
   'La tarjeta de video es más larga que el espacio máximo del gabinete.'),
  ('cooler', 'case', 'cooler_height_mm', 'max_cooler_height_mm', 'lte', 'warning',
   'El disipador puede no caber por altura en el gabinete.');

insert into public.compatibility_rules (type_a, type_b, attribute_a, attribute_b, operator, value, severity, message) values
  ('psu', 'psu', 'total_tdp_overhead', 'psu_watts', 'lte', null, 'warning',
   'La fuente de poder puede no cubrir el consumo estimado de la build (TDP + 30%).');

alter table public.compatibility_rules enable row level security;

create policy "compat_rules_select_public"
  on public.compatibility_rules for select
  using (true);

create policy "compat_rules_admin_write"
  on public.compatibility_rules for all
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

-- Evaluador: devuelve errores/advertencias de una build.
create or replace function public.check_build_compatibility(p_build_id uuid)
returns table (
  severity text,
  message text,
  rule_id uuid
)
language plpgsql
stable
set search_path = ''
as $$
declare
  r record;
  ca record;
  cb record;
  comp_a public.components%rowtype;
  comp_b public.components%rowtype;
  left_val text;
  right_val text;
  right_json jsonb;
  total_tdp numeric := 0;
  n_total int;
  v_missing text;
begin
  if not public.is_build_visible(p_build_id) then
    raise exception 'build_not_found_or_forbidden';
  end if;

  select count(*) into n_total
  from public.build_components bc
  where bc.build_id = p_build_id;

  if n_total = 0 then
    return;
  end if;

  -- Presencias esenciales (lista mantenida aquí; reglas condicionales se amplían en compatibility_rules).
  for v_missing in
    select coalesce(
      (select ct.name from public.component_types ct where ct.slug = req.slug),
      req.slug
    )
    from (values ('cpu'), ('motherboard'), ('ram'), ('psu')) as req(slug)
    where not exists (
      select 1
      from public.build_components bc
      join public.components c on c.id = bc.component_id
      join public.component_types ct on ct.id = c.type_id
      where bc.build_id = p_build_id
        and ct.slug = req.slug
    )
  loop
    severity := 'error';
    message := 'Falta un componente esencial: ' || v_missing || '.';
    rule_id := null;
    return next;
  end loop;

  select coalesce(sum(
    case when ct.slug <> 'psu' then coalesce(c.tdp_w, 0) * bc.quantity else 0 end
  ), 0)
  into total_tdp
  from public.build_components bc
  join public.components c on c.id = bc.component_id
  join public.component_types ct on ct.id = c.type_id
  where bc.build_id = p_build_id;

  for r in
    select *
    from public.compatibility_rules cr
    where cr.is_active
    order by cr.id
  loop
    if r.attribute_a = 'total_tdp_overhead' then
      left_val := ceil(total_tdp * 1.3)::text;

      for cb in
        select c as comp, c.id as comp_id
        from public.build_components bc
        join public.components c on c.id = bc.component_id
        join public.component_types ct on ct.id = c.type_id
        where bc.build_id = p_build_id
          and ct.slug = r.type_b
      loop
        comp_b := cb.comp;
        right_val := (to_jsonb(comp_b) ->> r.attribute_b);

        if right_val is null then
          severity := 'warning';
          message := 'Datos incompletos en ' || comp_b.name || ': falta ' || r.attribute_b || '.';
          rule_id := r.id;
          return next;
          continue;
        end if;

        if not (left_val::numeric <= right_val::numeric) then
          severity := r.severity;
          message := r.message;
          rule_id := r.id;
          return next;
        end if;
      end loop;

      continue;
    end if;

    for ca in
      select c as comp
      from public.build_components bc
      join public.components c on c.id = bc.component_id
      join public.component_types ct on ct.id = c.type_id
      where bc.build_id = p_build_id
        and ct.slug = r.type_a
    loop
      comp_a := ca.comp;
      left_val := to_jsonb(comp_a) ->> r.attribute_a;

      if left_val is null then
        severity := 'warning';
        message := 'Datos incompletos en ' || comp_a.name || ': falta ' || r.attribute_a || '.';
        rule_id := r.id;
        return next;
        continue;
      end if;

      if r.type_b is not null then
        for cb in
          select c as comp
          from public.build_components bc
          join public.components c on c.id = bc.component_id
          join public.component_types ct on ct.id = c.type_id
          where bc.build_id = p_build_id
            and ct.slug = r.type_b
        loop
          comp_b := cb.comp;

          if r.attribute_b = 'supported_form_factors' then
            right_json := to_jsonb(comp_b) -> 'supported_form_factors';
            if right_json is null or jsonb_typeof(right_json) <> 'array' then
              severity := 'warning';
              message := 'Datos incompletos en ' || comp_b.name || ': falta ' || r.attribute_b || '.';
              rule_id := r.id;
              return next;
              continue;
            end if;

            if r.operator = 'in_array' and not jsonb_exists(right_json, left_val) then
              severity := r.severity;
              message := r.message;
              rule_id := r.id;
              return next;
            end if;

            continue;
          end if;

          right_val := to_jsonb(comp_b) ->> r.attribute_b;

          if right_val is null then
            severity := 'warning';
            message := 'Datos incompletos en ' || comp_b.name || ': falta ' || r.attribute_b || '.';
            rule_id := r.id;
            return next;
            continue;
          end if;

          if r.operator = 'eq' and left_val is distinct from right_val then
            severity := r.severity;
            message := r.message;
            rule_id := r.id;
            return next;
          elsif r.operator = 'neq' and left_val = right_val then
            severity := r.severity;
            message := r.message;
            rule_id := r.id;
            return next;
          elsif r.operator in ('lte', 'gte') then
            if left_val !~ '^[0-9]+(\.[0-9]+)?$' or right_val !~ '^[0-9]+(\.[0-9]+)?$' then
              severity := 'warning';
              message := 'No se pudo evaluar ' || r.attribute_a || ' vs ' || r.attribute_b || ' (valores no numéricos).';
              rule_id := r.id;
              return next;
            elsif (r.operator = 'lte' and left_val::numeric > right_val::numeric)
               or (r.operator = 'gte' and left_val::numeric < right_val::numeric) then
              severity := r.severity;
              message := r.message;
              rule_id := r.id;
              return next;
            end if;
          elsif r.operator = 'in_array' then
            severity := 'warning';
            message := 'Regla in_array no soportada contra atributo ' || r.attribute_b || '.';
            rule_id := r.id;
            return next;
          end if;
        end loop;
      else
        -- Comparación contra constante en r.value (text/number/bool → texto).
        right_val := case
          when jsonb_typeof(r.value) = 'array' then null
          else r.value #>> '{}'
        end;

        if r.operator = 'in_array' then
          if jsonb_typeof(r.value) <> 'array'
             or not exists (
               select 1
               from jsonb_array_elements_text(r.value) as e(elem)
               where e.elem = left_val
             )
          then
            severity := r.severity;
            message := r.message;
            rule_id := r.id;
            return next;
          end if;
        elsif right_val is null then
          severity := 'warning';
          message := 'Regla mal configurada (value debe ser escalar para ' || r.operator || ').';
          rule_id := r.id;
          return next;
        elsif r.operator = 'eq' and left_val is distinct from right_val then
          severity := r.severity;
          message := r.message;
          rule_id := r.id;
          return next;
        elsif r.operator = 'neq' and left_val = right_val then
          severity := r.severity;
          message := r.message;
          rule_id := r.id;
          return next;
        elsif r.operator in ('lte', 'gte') then
          if left_val !~ '^[0-9]+(\.[0-9]+)?$' or right_val !~ '^[0-9]+(\.[0-9]+)?$' then
            severity := 'warning';
            message := 'No se pudo evaluar ' || r.attribute_a || ' (valor no numérico).';
            rule_id := r.id;
            return next;
          elsif (r.operator = 'lte' and left_val::numeric > right_val::numeric)
             or (r.operator = 'gte' and left_val::numeric < right_val::numeric) then
            severity := r.severity;
            message := r.message;
            rule_id := r.id;
            return next;
          end if;
        end if;
      end if;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.check_build_compatibility(uuid) from public;
grant execute on function public.check_build_compatibility(uuid) to anon, authenticated;

-- Persiste el resultado del chequeo (borra los anteriores).
create or replace function public.save_build_compatibility_results(p_build_id uuid)
returns setof public.build_compatibility_results
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_build_owner(p_build_id)
     and current_user not in ('postgres', 'service_role') then
    raise exception 'not_authorized';
  end if;

  delete from public.build_compatibility_results
  where build_id = p_build_id;

  return query
  insert into public.build_compatibility_results (build_id, severity, message, rule_id)
  select p_build_id, r.severity, r.message, r.rule_id
  from public.check_build_compatibility(p_build_id) as r
  returning *;
end;
$$;

grant execute on function public.save_build_compatibility_results(uuid) to authenticated;
