-- Motor de compatibilidad v2: núcleo compartido (jsonb de {id, quantity}),
-- check_build_compatibility como wrapper para no guardar, y preview_build_compatibility
-- para validar SIN persistir (Modo Rápido). Operadores: eq, neq, lte, gte,
-- in_array (generalizado contra cualquier atributo array) y sum_lte (nuevo).
CREATE OR REPLACE FUNCTION public._run_compatibility_checks(p_parts jsonb)
 RETURNS TABLE(severity text, message text, rule_id uuid)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  r record;
  elem jsonb;
  v_comps public.components[] := '{}';
  v_slugs text[] := '{}';
  v_qty int[] := '{}';
  v_n int := 0;
  comp_a public.components%rowtype;
  comp_b public.components%rowtype;
  left_val text;
  right_val text;
  right_json jsonb;
  total_tdp numeric := 0;
  v_missing text;
  i int;
  j int;
  v_sum numeric;
  v_suma_valida boolean;
  s text;
begin
  if jsonb_typeof(p_parts) IS DISTINCT FROM 'array' then
    raise exception 'p_parts_debe_ser_array';
  end if;

  for elem in select jsonb_array_elements(p_parts) loop
    v_n := v_n + 1;
    select c.* into comp_a from public.components c where c.id = (elem ->> 'id')::uuid;
    if comp_a.id is null then
      raise exception 'component_id_invalido';
    end if;
    select ct.slug into s from public.component_types ct where ct.id = comp_a.type_id;
    v_comps[v_n] := comp_a;
    v_slugs[v_n] := s;
    v_qty[v_n] := greatest(1, coalesce((elem ->> 'quantity')::int, 1));
  end loop;

  if v_n = 0 then
    return;
  end if;

  foreach v_missing in array array['cpu', 'motherboard', 'ram', 'psu']::text[] loop
    if (select count(*) from unnest(v_slugs) as u where u = v_missing) = 0 then
      severity := 'error';
      message := 'Falta un componente esencial: ' || v_missing || '.';
      rule_id := null;
      return next;
    end if;
  end loop;

  for i in 1..v_n loop
    if v_slugs[i] <> 'psu' then
      total_tdp := total_tdp + coalesce((v_comps[i]).tdp_w, 0) * v_qty[i];
    end if;
  end loop;

  for r in
    select *
    from public.compatibility_rules cr
    where cr.is_active
    order by cr.id
  loop
    if r.attribute_a = 'total_tdp_overhead' then
      left_val := ceil(total_tdp * 1.3)::text;

      for j in 1..v_n loop
        if v_slugs[j] = r.type_b then
          comp_b := v_comps[j];
          right_val := to_jsonb(comp_b) ->> r.attribute_b;

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
        end if;
      end loop;

      continue;
    end if;

    if r.operator = 'sum_lte' then
      v_suma_valida := true;
      v_sum := 0;
      for i in 1..v_n loop
        if v_slugs[i] = r.type_a then
          left_val := to_jsonb(v_comps[i]) ->> r.attribute_a;
          if left_val is null then
            severity := 'warning';
            message := 'Datos incompletos en ' || (v_comps[i]).name || ': falta ' || r.attribute_a || '.';
            rule_id := r.id;
            return next;
            v_suma_valida := false;
          elsif left_val !~ '^[0-9]+(\.[0-9]+)?$' then
            severity := 'warning';
            message := 'No se pudo evaluar ' || r.attribute_a || ' (valor no numérico).';
            rule_id := r.id;
            return next;
            v_suma_valida := false;
          else
            v_sum := v_sum + left_val::numeric * v_qty[i];
          end if;
        end if;
      end loop;

      if v_suma_valida then
        for j in 1..v_n loop
          if v_slugs[j] = r.type_b then
            comp_b := v_comps[j];
            right_val := to_jsonb(comp_b) ->> r.attribute_b;
            if right_val is null then
              severity := 'warning';
              message := 'Datos incompletos en ' || comp_b.name || ': falta ' || r.attribute_b || '.';
              rule_id := r.id;
              return next;
              continue;
            end if;
            if right_val !~ '^[0-9]+(\.[0-9]+)?$' then
              severity := 'warning';
              message := 'No se pudo evaluar ' || r.attribute_a || ' vs ' || r.attribute_b || ' (valores no numéricos).';
              rule_id := r.id;
              return next;
              continue;
            end if;
            if v_sum > right_val::numeric then
              severity := r.severity;
              message := r.message;
              rule_id := r.id;
              return next;
            end if;
          end if;
        end loop;
      end if;

      continue;
    end if;

    for i in 1..v_n loop
      if v_slugs[i] <> r.type_a then
        continue;
      end if;
      comp_a := v_comps[i];
      left_val := to_jsonb(comp_a) ->> r.attribute_a;

      if left_val is null then
        severity := 'warning';
        message := 'Datos incompletos en ' || comp_a.name || ': falta ' || r.attribute_a || '.';
        rule_id := r.id;
        return next;
        continue;
      end if;

      if r.type_b is not null then
        for j in 1..v_n loop
          if v_slugs[j] <> r.type_b then
            continue;
          end if;
          comp_b := v_comps[j];

          right_json := to_jsonb(comp_b) -> r.attribute_b;

          -- in_array generalizado contra cualquier atributo de tipo array
          if r.attribute_b = 'supported_form_factors' or jsonb_typeof(right_json) = 'array' then
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
$function$;

CREATE OR REPLACE FUNCTION public.check_build_compatibility(p_build_id uuid)
 RETURNS TABLE(severity text, message text, rule_id uuid)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_parts jsonb;
begin
  if not public.is_build_visible(p_build_id) then
    raise exception 'build_not_found_or_forbidden';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', bc.component_id, 'quantity', bc.quantity)), '[]'::jsonb)
    into v_parts
  from public.build_components bc
  where bc.build_id = p_build_id;

  return query
  select r.severity, r.message, r.rule_id
  from public._run_compatibility_checks(v_parts) as r;
end;
$function$;

CREATE OR REPLACE FUNCTION public.preview_build_compatibility(p_parts jsonb)
 RETURNS TABLE(severity text, message text, rule_id uuid)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  return query
  select r.severity, r.message, r.rule_id
  from public._run_compatibility_checks(p_parts) as r;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.preview_build_compatibility(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_build_compatibility(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._run_compatibility_checks(jsonb) TO postgres, service_role;
