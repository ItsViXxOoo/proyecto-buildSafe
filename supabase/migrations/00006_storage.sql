-- BuildSafe · Fase 5: buckets de Storage + policies de objetos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('component-images', 'component-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('build-covers', 'build-covers', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- avatars: lectura pública; escritura solo en la carpeta del propio usuario.
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- component-images: lectura pública; escritura solo admin.
create policy "component_images_public_read"
  on storage.objects for select
  using (bucket_id = 'component-images');

create policy "component_images_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'component-images'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create policy "component_images_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'component-images'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    bucket_id = 'component-images'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create policy "component_images_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'component-images'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

-- build-covers: lectura pública; escritura solo carpeta del dueño.
create policy "build_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'build-covers');

create policy "build_covers_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'build-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "build_covers_update_own"
  on storage.objects for update
  using (
    bucket_id = 'build-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'build-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "build_covers_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'build-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
