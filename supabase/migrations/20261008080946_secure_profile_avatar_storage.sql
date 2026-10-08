-- Applied to StudentHood production 2026-10-08.
-- Private avatar bucket, uploads restricted to the signed-in owner's folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',false,5242880,array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "StudentHood user upload own avatar" on storage.objects for insert to authenticated
with check (
 bucket_id='profile-avatars'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
);

create policy "StudentHood user update own avatar" on storage.objects for update to authenticated
using (bucket_id='profile-avatars' and owner_id=(select auth.uid())::text)
with check (bucket_id='profile-avatars' and owner_id=(select auth.uid())::text);

create policy "StudentHood user delete own avatar" on storage.objects for delete to authenticated
using (bucket_id='profile-avatars' and owner_id=(select auth.uid())::text);

create policy "StudentHood view permitted avatar" on storage.objects for select to authenticated
using (
 bucket_id='profile-avatars' and (
  owner_id=(select auth.uid())::text
  or exists (
   select 1 from public.profiles p
   where p.avatar_url=storage.objects.name and public.studenthood_can_discover_profile(p.id)
  )
 )
);
