-- BuildSafe · Fase 1: identidad
-- profiles 1:1 con auth.users (Supabase Auth maneja credenciales; nunca guardamos contraseñas).

create type public.user_role as enum ('user', 'admin', 'mod');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text,
  bio text,
  avatar_url text,
  birth_date date,
  role public.user_role not null default 'user',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 3 and 30),
  constraint profiles_birth_date_past check (birth_date is null or birth_date < current_date),
  constraint profiles_preferences_object check (
    extensions.jsonb_matches_schema(
      '{"type":"object"}'::json,
      preferences
    )
  )
);

create unique index profiles_username_lower_key
  on public.profiles (lower(username));

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Bloquea cambios de rol desde el cliente (solo dashboard/service_role).
create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
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

create trigger protect_profiles_role
  before update of role on public.profiles
  for each row execute function public.profiles_protect_role();

-- Crea el perfil al registrarse el usuario en auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_username text;
  v_attempt int := 0;
begin
  v_base := lower(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    'user_' || substr(md5(new.id::text), 1, 8)
  ));
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  if char_length(v_base) < 3 then
    v_base := 'user_' || substr(md5(new.id::text), 1, 8);
  end if;
  v_username := left(v_base, 30);

  while exists (select 1 from public.profiles p where lower(p.username) = v_username) loop
    v_attempt := v_attempt + 1;
    v_username := left(v_base, 24) || '_' || v_attempt::text;
  end loop;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    v_username,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "profiles_update_self"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete_self"
  on public.profiles for delete
  using ((select auth.uid()) = id);
