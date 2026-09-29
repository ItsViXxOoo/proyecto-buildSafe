-- BuildSafe · Corrige save_build_compatibility_results para aceptar también postgres/service_role
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
